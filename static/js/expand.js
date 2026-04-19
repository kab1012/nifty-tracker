async function toggleSector(sectorName, indexRowEl) {
  const expandRowId = `expand-${CSS.escape(sectorName)}`;
  const existing    = document.getElementById(expandRowId);

  if (existing) {
    existing.remove();
    indexRowEl.classList.remove('expanded');
    expandedRows.delete(sectorName);
    return;
  }

  indexRowEl.classList.add('expanded');
  expandedRows.add(sectorName);

  const expandRow = document.createElement('tr');
  expandRow.className = 'expand-row';
  expandRow.id = expandRowId;
  expandRow.innerHTML = `<td colspan="18">${loadingHTML()}</td>`;
  indexRowEl.insertAdjacentElement('afterend', expandRow);

  if (stockCache[sectorName]) {
    expandRow.querySelector('td').innerHTML = subTableHTML(sectorName, stockCache[sectorName]);
    attachSubHandlers(expandRow);
    return;
  }

  try {
    const res  = await fetch(`/api/sector/${encodeURIComponent(sectorName)}`);
    const json = await res.json();
    if (json.data && json.data.length) {
      stockCache[sectorName] = json.data;
      if (document.getElementById(expandRowId)) {
        expandRow.querySelector('td').innerHTML = subTableHTML(sectorName, json.data);
        attachSubHandlers(expandRow);
      }
    } else if (document.getElementById(expandRowId)) {
      expandRow.querySelector('td').innerHTML =
        `<div class="sub-wrapper" style="color:var(--red);padding:16px 0">Failed: ${json.error || 'No data'}</div>`;
    }
  } catch (e) {
    if (document.getElementById(expandRowId))
      expandRow.querySelector('td').innerHTML =
        `<div class="sub-wrapper" style="color:var(--red);padding:16px 0">Network error: ${e}</div>`;
  }
}

async function restoreExpanded() {
  const toRestore = [...expandedRows];
  expandedRows.clear();
  for (const sector of toRestore) {
    const row = document.querySelector(`tr.expandable[data-sector="${CSS.escape(sector)}"]`);
    if (row) await toggleSector(sector, row);
  }
}
