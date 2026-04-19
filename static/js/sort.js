function handleSortClick(e) {
  const th = e.target.closest('th.sortable');
  if (!th) return;
  const col    = th.dataset.col;
  const prefix = th.dataset.prefix;

  if (!prefix) {
    mainSort = mainSort.col === col ? { col, dir: mainSort.dir * -1 } : { col, dir: 1 };
    document.getElementById('content').innerHTML = renderTable(allData);
    attachHandlers();
    restoreExpanded();
  } else {
    const ss = subSort[prefix] || { col: null, dir: 1 };
    subSort[prefix] = ss.col === col ? { col, dir: ss.dir * -1 } : { col, dir: 1 };
    const expandRow = document.getElementById(`expand-${CSS.escape(prefix)}`);
    if (expandRow && stockCache[prefix]) {
      expandRow.querySelector('td').innerHTML = subTableHTML(prefix, stockCache[prefix]);
      attachSubHandlers(expandRow);
    }
  }
}

function attachHandlers() {
  document.querySelectorAll('tr.expandable[data-sector]').forEach(row => {
    row.addEventListener('click', () => toggleSector(row.dataset.sector, row));
  });
  document.querySelectorAll('thead th.sortable').forEach(th => {
    th.addEventListener('click', handleSortClick);
  });
}

function attachSubHandlers(expandRow) {
  expandRow.querySelectorAll('thead th.sortable').forEach(th => {
    th.addEventListener('click', handleSortClick);
  });
}
