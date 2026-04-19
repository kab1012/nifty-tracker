/* Global state */
let allData        = [];
let breadthData    = null;
let breadthPollTimer = null;
let countdown      = REFRESH_SEC;
let countdownTimer = null;
let expandedRows   = new Set();
let mainSort       = { col: null, dir: 1 };
const subSort      = {};
const stockCache   = {};

/* Boot */
async function boot() {
  const done = await fetchData();
  if (done) { startCountdown(); return; }
  const poll = setInterval(async () => {
    if (await fetchData()) { clearInterval(poll); startCountdown(); }
  }, 5000);
}

/* Refresh button */
document.getElementById('refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning'); btn.disabled = true;
  await fetchData();
  btn.classList.remove('spinning'); btn.disabled = false;
  clearInterval(countdownTimer); startCountdown();
});

/* Disclaimer */
const DISC_KEY = 'nifty_tracker_disclaimer_v1';
const overlay  = document.getElementById('disclaimer-overlay');
if (!localStorage.getItem(DISC_KEY)) overlay.style.display = 'flex';
document.getElementById('disc-ok-btn').addEventListener('click', () => {
  localStorage.setItem(DISC_KEY, '1');
  overlay.style.display = 'none';
});

boot();
