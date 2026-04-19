function renderErrors(errors) {
  const el = document.getElementById('errors-container');
  if (!errors || !errors.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="errors-box">
    <details>
      <summary>${errors.length} index(es) unavailable on Yahoo Finance</summary>
      <ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>
    </details>
  </div>`;
}

async function fetchData() {
  try {
    const res  = await fetch('/api/data');
    const json = await res.json();
    if (json.loading) {
      document.getElementById('content').innerHTML = `
        <div id="loading-overlay">
          <div class="spinner"></div>
          <span>Fetching all indices… (~30–60s on first load)</span>
        </div>`;
      document.getElementById('last-updated').textContent = 'Loading…';
      return false;
    }
    allData = json.data;
    document.getElementById('content').innerHTML = renderTable(allData);
    attachHandlers();
    await restoreExpanded();
    renderErrors(json.errors);
    document.getElementById('last-updated').textContent = 'Updated: ' + (json.last_updated || '—');
    fetchBreadth();
    return true;
  } catch (e) { console.error('Fetch error:', e); return false; }
}

async function fetchBreadth() {
  try {
    const res  = await fetch('/api/breadth');
    const json = await res.json();
    if (json.ready && Object.keys(json.data).length > 0) {
      breadthData = json.data;
      updateBreadthCells();
      clearInterval(breadthPollTimer);
      breadthPollTimer = null;
      document.getElementById('breadth-status').textContent = '';
    } else {
      document.getElementById('breadth-status').textContent = '⏳ Breadth loading…';
      if (!breadthPollTimer) breadthPollTimer = setInterval(fetchBreadth, 8000);
    }
  } catch(e) { console.error('Breadth fetch error:', e); }
}

function startCountdown() {
  clearInterval(countdownTimer);
  countdown = REFRESH_SEC;
  document.getElementById('countdown').textContent = countdown;
  countdownTimer = setInterval(() => {
    countdown--;
    document.getElementById('countdown').textContent = countdown;
    if (countdown <= 0) { fetchData(); countdown = REFRESH_SEC; }
  }, 1000);
}
