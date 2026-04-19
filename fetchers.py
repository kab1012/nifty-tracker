import yfinance as yf
import pandas as pd
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

from config import INDICES, SECTOR_STOCKS, REFRESH_INTERVAL
from indicators import flatten_columns, resample_ohlc, safe_ema, ema_streak, calc_rsi, count_alignment
import state

log = logging.getLogger(__name__)


def _build_row(name, ticker, daily, weekly, monthly, four_h):
    last       = daily.iloc[-1]
    close      = round(float(last["Close"]), 2)
    prev_close = float(daily.iloc[-2]["Close"]) if len(daily) >= 2 else None
    change_pct = round((close - prev_close) / prev_close * 100, 2) if prev_close else None

    e4h = safe_ema(four_h)
    ed  = safe_ema(daily)
    ew  = safe_ema(weekly)
    em  = safe_ema(monthly)

    return {
        "name":            name,
        "ticker":          ticker,
        "open":            round(float(last["Open"]), 2),
        "high":            round(float(last["High"]), 2),
        "low":             round(float(last["Low"]),  2),
        "close":           close,
        "change_pct":      change_pct,
        "sparkline":       [round(float(v), 2) for v in daily["Close"].tail(30).tolist()],
        "ema_alignment":   count_alignment(close, e4h, ed, ew, em),
        "ema_streak_days": ema_streak(daily),
        "ema_4h":          e4h,
        "rsi_4h":          calc_rsi(four_h["Close"]) if not four_h.empty else None,
        "ema_daily":       ed,
        "rsi_daily":       calc_rsi(daily["Close"]),
        "ema_weekly":      ew,
        "rsi_weekly":      calc_rsi(weekly["Close"]),
        "ema_monthly":     em,
        "rsi_monthly":     calc_rsi(monthly["Close"]),
    }


def _dl(tickers_list, **kwargs):
    return yf.download(tickers_list, progress=False, auto_adjust=True, **kwargs)


def _extract(all_df, ticker):
    if all_df.empty:
        return pd.DataFrame()
    if isinstance(all_df.columns, pd.MultiIndex):
        try:
            return all_df.xs(ticker, axis=1, level=1).dropna(subset=["Close"])
        except KeyError:
            return pd.DataFrame()
    return all_df.dropna(subset=["Close"])


def fetch_one(name, ticker):
    try:
        daily_raw = yf.download(ticker, period="2y", interval="1d", progress=False, auto_adjust=True)
        daily = flatten_columns(daily_raw).dropna(subset=["Open", "High", "Low", "Close"])
        if daily.empty:
            raise ValueError("No data returned from Yahoo Finance")

        weekly  = flatten_columns(yf.download(ticker, period="5y",  interval="1wk", progress=False, auto_adjust=True)).dropna(subset=["Close"])
        monthly = flatten_columns(yf.download(ticker, period="10y", interval="1mo", progress=False, auto_adjust=True)).dropna(subset=["Close"])
        hourly  = flatten_columns(yf.download(ticker, period="60d", interval="1h",  progress=False, auto_adjust=True)).dropna(subset=["Close"])
        four_h  = resample_ohlc(hourly, "4h") if not hourly.empty else pd.DataFrame()

        row = _build_row(name, ticker, daily, weekly, monthly, four_h)
        row["error"] = None
        log.info("OK  %s  close=%.2f", name, row["close"])
        return row

    except Exception as exc:
        log.warning("FAIL %s: %s", name, exc)
        return {"name": name, "ticker": ticker, "error": str(exc)}


def fetch_sector_stocks(sector_name):
    stocks = SECTOR_STOCKS.get(sector_name)
    if not stocks:
        return []

    name_map = {t: n for n, t in stocks}
    tickers  = list(name_map.keys())

    try:
        daily_all   = _dl(tickers, period="2y",  interval="1d")
        weekly_all  = _dl(tickers, period="5y",  interval="1wk")
        monthly_all = _dl(tickers, period="10y", interval="1mo")
        hourly_all  = _dl(tickers, period="60d", interval="1h")
    except Exception as e:
        log.error("Sector bulk download error [%s]: %s", sector_name, e)
        return []

    results = []
    for ticker in tickers:
        try:
            daily   = _extract(daily_all,   ticker)
            weekly  = _extract(weekly_all,  ticker)
            monthly = _extract(monthly_all, ticker)
            hourly  = _extract(hourly_all,  ticker)
            if daily.empty:
                continue
            four_h = resample_ohlc(hourly, "4h") if not hourly.empty else pd.DataFrame()
            results.append(_build_row(name_map[ticker], ticker, daily, weekly, monthly, four_h))
        except Exception as exc:
            log.warning("Stock extract error [%s / %s]: %s", sector_name, ticker, exc)

    order = {t: i for i, (_, t) in enumerate(stocks)}
    results.sort(key=lambda r: order.get(r["ticker"], 999))
    log.info("Sector %s: %d stocks loaded", sector_name, len(results))
    return results


def fetch_all_breadth():
    log.info("Starting breadth fetch for %d sectors…", len(SECTOR_STOCKS))
    all_tickers = list({t for stocks in SECTOR_STOCKS.values() for _, t in stocks})
    try:
        data = yf.download(all_tickers, period="2y", interval="1d", progress=False, auto_adjust=True)
    except Exception as e:
        log.error("Breadth bulk download failed: %s", e)
        return

    result = {}
    for sector_name, stocks in SECTOR_STOCKS.items():
        above = total = 0
        for _, ticker in stocks:
            try:
                close_s = (data["Close"][ticker] if isinstance(data.columns, pd.MultiIndex) else data["Close"]).dropna()
                if len(close_s) < 10:
                    continue
                ema = close_s.ewm(span=50, adjust=False).mean()
                if float(close_s.iloc[-1]) > float(ema.iloc[-1]):
                    above += 1
                total += 1
            except Exception:
                continue
        result[sector_name] = {"above": above, "total": total}

    with state.breadth_lock:
        state.breadth_cache.update(result)
        state.breadth_ready = True
    log.info("Breadth fetch done: %d sectors", len(result))


def refresh_all():
    log.info("Starting data refresh for %d indices…", len(INDICES))
    results, errors = [], []

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_one, name, ticker): name for name, ticker in INDICES.items()}
        for fut in as_completed(futures):
            row = fut.result()
            if row.get("error"):
                errors.append(f"{row['name']}: {row['error']}")
            else:
                results.append(row)

    results.sort(key=lambda r: list(INDICES.keys()).index(r["name"]))

    with state.cache_lock:
        state.cache["data"] = results
        state.cache["errors"] = errors
        state.cache["last_updated"] = datetime.now().strftime("%d %b %Y  %H:%M:%S")
        state.cache["loading"] = False

    log.info("Refresh done. %d ok, %d errors.", len(results), len(errors))
