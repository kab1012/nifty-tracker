import pandas as pd


def flatten_columns(df):
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    return df


def resample_ohlc(df, rule):
    return df.resample(rule).agg(
        Open=("Open", "first"),
        High=("High", "max"),
        Low=("Low", "min"),
        Close=("Close", "last"),
    ).dropna()


def safe_ema(df, col="Close"):
    if df.empty or len(df) < 5:
        return None
    val = df[col].ewm(span=50, adjust=False).mean().iloc[-1]
    return round(float(val), 2)


def ema_streak(daily_df):
    close = daily_df["Close"]
    ema   = close.ewm(span=50, adjust=False).mean()
    above = (close > ema).values
    if len(above) == 0:
        return None
    current = above[-1]
    count   = 0
    for val in reversed(above):
        if val == current:
            count += 1
        else:
            break
    return count if current else -count


def calc_rsi(series, period=14):
    if len(series) < period + 1:
        return None
    delta    = series.diff()
    gain     = delta.clip(lower=0)
    loss     = (-delta).clip(lower=0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs  = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    val = rsi.iloc[-1]
    return round(float(val), 1) if not pd.isna(val) else None


def count_alignment(close, e4h, ed, ew, em):
    return sum([
        1 if e4h and close > e4h else 0,
        1 if ed  and close > ed  else 0,
        1 if ew  and close > ew  else 0,
        1 if em  and close > em  else 0,
    ])
