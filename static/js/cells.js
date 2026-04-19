/* Formatting helpers */
function pct(close, ema) {
  if (ema == null || ema === 0) return null;
  return (close - ema) / ema * 100;
}
function fmtPct(v) {
  if (v == null) return null;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}
function fmt(v) {
  if (v == null) return '<span class="na">—</span>';
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Cell renderers */
function sparklineCell(prices) {
  if (!prices || prices.length < 2) return '<td class="spark-cell"><span class="na">—</span></td>';
  const W = 72, H = 26;
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 3) - 1.5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp  = prices[prices.length - 1] >= prices[0];
  const color = isUp ? '#3fb950' : '#f85149';
  return `<td class="spark-cell">
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">
      <polygon points="0,${H} ${pts} ${W},${H}" fill="${color}" fill-opacity="0.12"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"
                stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  </td>`;
}

function alignmentCell(score) {
  if (score == null) return '<td class="align-cell na">—</td>';
  const colors = ['#f85149','#f87060','#d29922','#56d364','#3fb950'];
  const dots   = '●'.repeat(score) + '○'.repeat(4 - score);
  return `<td class="align-cell" style="color:${colors[score]}" title="${score} of 4 timeframes (4H/D/W/M) above 50 EMA">
    ${score}/4<span style="font-size:.65rem;margin-left:4px;opacity:.7">${dots}</span>
  </td>`;
}

function renderBreadthCell(sectorName, above, total) {
  if (!total) return `<td class="breadth-cell na" data-breadth="${sectorName}">—</td>`;
  const p = above / total;
  const bar = '█'.repeat(Math.round(p * 8)) + '░'.repeat(8 - Math.round(p * 8));
  const color = p >= 0.7 ? '#3fb950' : p >= 0.4 ? '#d29922' : '#f85149';
  return `<td class="breadth-cell" style="color:${color}" data-breadth="${sectorName}"
          title="${above}/${total} stocks above D-EMA50">
    ${above}/${total}<span class="breadth-bar">${bar}</span>
  </td>`;
}

function breadthCell(sectorName, isExpandable) {
  if (!isExpandable) return '<td class="breadth-cell na">—</td>';
  const b = breadthData && breadthData[sectorName];
  if (!b) return `<td class="breadth-cell na" data-breadth="${sectorName}">…</td>`;
  return renderBreadthCell(sectorName, b.above, b.total);
}

function updateBreadthCells() {
  document.querySelectorAll('[data-breadth]').forEach(cell => {
    const b = breadthData && breadthData[cell.dataset.breadth];
    if (!b) return;
    const p = b.above / b.total;
    const bar = '█'.repeat(Math.round(p * 8)) + '░'.repeat(8 - Math.round(p * 8));
    const color = p >= 0.7 ? '#3fb950' : p >= 0.4 ? '#d29922' : '#f85149';
    cell.style.color = color;
    cell.className = 'breadth-cell';
    cell.title = `${b.above}/${b.total} stocks above D-EMA50`;
    cell.innerHTML = `${b.above}/${b.total}<span class="breadth-bar">${bar}</span>`;
  });
}

function changeCell(v) {
  if (v == null) return '<td class="num na">—</td>';
  const color = v >= 0 ? 'var(--green)' : 'var(--red)';
  return `<td class="num" style="color:${color};font-weight:600">${v >= 0 ? '+' : ''}${v.toFixed(2)}%</td>`;
}

function emaCell(close, ema) {
  if (ema == null) return '<td class="ema-cell na">—</td>';
  const cls = close > ema ? 'above' : 'below';
  return `<td class="ema-cell ${cls}">
    <span class="ema-pct">${fmtPct(pct(close, ema))}</span>
    <span class="ema-raw">${fmt(ema)}</span>
  </td>`;
}

function rsiCell(rsi) {
  if (rsi == null) return '<td class="num na">—</td>';
  let color, bg, tag;
  if      (rsi >= 70) { color = '#f85149'; bg = '#2b0d0d'; tag = 'OB'; }
  else if (rsi >= 60) { color = '#d29922'; bg = '';         tag = '';   }
  else if (rsi <= 30) { color = '#3fb950'; bg = '#0d2b1a'; tag = 'OS'; }
  else if (rsi <= 40) { color = '#56d364'; bg = '';         tag = '';   }
  else                { color = 'var(--muted)'; bg = '';    tag = '';   }
  const tagSpan = tag ? `<span style="font-size:.6rem;margin-left:3px;opacity:.8">${tag}</span>` : '';
  return `<td class="num" style="color:${color};${bg ? `background:${bg};` : ''}font-weight:600;border-radius:4px;padding:5px 10px"
          title="RSI(14): ${rsi}">${rsi.toFixed(1)}${tagSpan}</td>`;
}

function streakCell(days) {
  if (days == null) return '<td class="num na">—</td>';
  const above = days > 0;
  const color = above ? 'var(--green)' : 'var(--red)';
  const label = above ? `▲ ${days}d` : `▼ ${Math.abs(days)}d`;
  const n = Math.abs(days);
  const title = above
    ? `Above daily 50 EMA for ${days} consecutive day${days > 1 ? 's' : ''}`
    : `Below daily 50 EMA for ${n} consecutive day${n > 1 ? 's' : ''}`;
  return `<td class="num" style="color:${color};font-weight:600" title="${title}">${label}</td>`;
}
