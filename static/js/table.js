const COL_KEYS = {
  name:            r => r.name,
  close:           r => r.close,
  change_pct:      r => r.change_pct,
  open:            r => r.open,
  high:            r => r.high,
  low:             r => r.low,
  ema_alignment:   r => r.ema_alignment,
  ema_streak_days: r => r.ema_streak_days,
  ema_4h:          r => pct(r.close, r.ema_4h),
  rsi_4h:          r => r.rsi_4h,
  ema_daily:       r => pct(r.close, r.ema_daily),
  rsi_daily:       r => r.rsi_daily,
  ema_weekly:      r => pct(r.close, r.ema_weekly),
  rsi_weekly:      r => r.rsi_weekly,
  ema_monthly:     r => pct(r.close, r.ema_monthly),
  rsi_monthly:     r => r.rsi_monthly,
};

function sortData(data, col, dir) {
  if (!col) return [...data];
  const fn = COL_KEYS[col];
  return [...data].sort((a, b) => {
    const av = fn(a), bv = fn(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av < bv ? -dir : av > bv ? dir : 0;
  });
}

function arrowHTML(col, activeCol, dir) {
  if (col !== activeCol) return '<span class="sort-arrow">⇅</span>';
  return `<span class="sort-arrow">${dir === 1 ? '▲' : '▼'}</span>`;
}

function theadHTML(sortState, prefix = '') {
  const { col, dir } = sortState;
  function th(label, key, extraClass = '') {
    const active = key === col ? ' sort-active' : '';
    return `<th class="sortable${active} ${extraClass}" data-col="${key}" data-prefix="${prefix}">
      ${label}${arrowHTML(key, col, dir)}</th>`;
  }
  return `<thead><tr>
    ${th('Index',     'name')}
    <th>Spark</th>
    ${th('Open',      'open',            'num group-ohlc')}
    ${th('High',      'high',            'num group-ohlc')}
    ${th('Low',       'low',             'num group-ohlc')}
    ${th('Close',     'close',           'num group-ohlc')}
    ${th('Chg %',     'change_pct',      'num group-ohlc')}
    ${th('Aligned',   'ema_alignment',   'align-cell group-ema')}
    <th class="breadth-cell group-ema">Breadth</th>
    ${th('4H EMA',    'ema_4h',          'num group-ema')}
    ${th('4H RSI',    'rsi_4h',          'num group-ema')}
    ${th('D EMA',     'ema_daily',       'num group-ema')}
    ${th('D RSI',     'rsi_daily',       'num group-ema')}
    ${th('EMA Days',  'ema_streak_days', 'num group-ema')}
    ${th('W EMA',     'ema_weekly',      'num group-ema')}
    ${th('W RSI',     'rsi_weekly',      'num group-ema')}
    ${th('M EMA',     'ema_monthly',     'num group-ema')}
    ${th('M RSI',     'rsi_monthly',     'num group-ema')}
  </tr></thead>`;
}

function rowHTML(r, isExpandable, isExpanded) {
  const cls  = ['index-row', isExpandable ? 'expandable' : '', isExpanded ? 'expanded' : ''].filter(Boolean).join(' ');
  const icon = isExpandable ? '<span class="expand-icon">▶</span>' : '';
  return `<tr class="${cls}" data-sector="${isExpandable ? r.name : ''}">
    <td class="idx-name">${icon}${r.name}<span class="idx-ticker">${r.ticker}</span></td>
    ${sparklineCell(r.sparkline)}
    <td class="num">${fmt(r.open)}</td>
    <td class="num" style="color:#3fb950">${fmt(r.high)}</td>
    <td class="num" style="color:#f85149">${fmt(r.low)}</td>
    <td class="num close-val">${fmt(r.close)}</td>
    ${changeCell(r.change_pct)}
    ${alignmentCell(r.ema_alignment)}
    ${breadthCell(r.name, isExpandable)}
    ${emaCell(r.close, r.ema_4h)}
    ${rsiCell(r.rsi_4h)}
    ${emaCell(r.close, r.ema_daily)}
    ${rsiCell(r.rsi_daily)}
    ${streakCell(r.ema_streak_days)}
    ${emaCell(r.close, r.ema_weekly)}
    ${rsiCell(r.rsi_weekly)}
    ${emaCell(r.close, r.ema_monthly)}
    ${rsiCell(r.rsi_monthly)}
  </tr>`;
}

function subRowHTML(s) {
  return `<tr>
    <td class="idx-name">${s.name}<span class="idx-ticker">${s.ticker}</span></td>
    ${sparklineCell(s.sparkline)}
    <td class="num">${fmt(s.open)}</td>
    <td class="num" style="color:#3fb950">${fmt(s.high)}</td>
    <td class="num" style="color:#f85149">${fmt(s.low)}</td>
    <td class="num close-val">${fmt(s.close)}</td>
    ${changeCell(s.change_pct)}
    ${alignmentCell(s.ema_alignment)}
    <td class="breadth-cell na">—</td>
    ${emaCell(s.close, s.ema_4h)}
    ${emaCell(s.close, s.ema_daily)}
    ${streakCell(s.ema_streak_days)}
    ${emaCell(s.close, s.ema_weekly)}
    ${emaCell(s.close, s.ema_monthly)}
  </tr>`;
}

function loadingHTML() {
  return `<div class="sub-wrapper">
    <div class="sub-loading"><div class="spinner-sm"></div>Fetching stock data… (~10–20s)</div>
  </div>`;
}

function subTableHTML(sectorName, stocks) {
  const ss     = subSort[sectorName] || { col: null, dir: 1 };
  const sorted = sortData(stocks, ss.col, ss.dir);
  const above  = stocks.filter(s => s.ema_daily != null && s.close > s.ema_daily).length;
  const below  = stocks.filter(s => s.ema_daily != null && s.close < s.ema_daily).length;
  const a4     = stocks.filter(s => s.ema_alignment === 4).length;
  return `<div class="sub-wrapper">
    <div class="sub-header">
      <strong>${sectorName}</strong> — ${stocks.length} stocks &nbsp;|&nbsp;
      <span style="color:var(--green)">▲ ${above} above D-EMA50</span>
      <span style="color:var(--red)">▼ ${below} below</span> &nbsp;|&nbsp;
      <span style="color:var(--gold)">★ ${a4} fully aligned (4/4)</span>
    </div>
    <table class="sub-table" data-sector="${sectorName}">
      ${theadHTML(ss, sectorName)}
      <tbody>${sorted.map(subRowHTML).join('')}</tbody>
    </table>
  </div>`;
}

function renderTable(rows) {
  if (!rows.length) return '<p style="color:var(--muted);padding:40px 0;text-align:center">No data yet.</p>';
  const sorted = sortData(rows, mainSort.col, mainSort.dir);
  const tbody  = sorted.map(r => rowHTML(r, EXPANDABLE.has(r.name), expandedRows.has(r.name))).join('');
  return `<table><colgroup><col style="min-width:160px"></colgroup>${theadHTML(mainSort)}<tbody>${tbody}</tbody></table>`;
}
