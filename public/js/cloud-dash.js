/* ===================== AGENT ID / LOGIN GUARD ===================== */
const agentId = sessionStorage.getItem('cloudAgentId');
if (!agentId) {
    window.location.href = './cloud-login.html';
}
document.getElementById('cloud-id-display').textContent = agentId;

document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('cloudAgentId');
    window.location.href = './cloud-login.html';
});

// Small helper so every call automatically carries the agentId, GET or POST.
async function cloudFetch(path, { method = 'GET', body = null } = {}) {
    const isGet = method === 'GET';
    const url = isGet ? `${path}?agentId=${encodeURIComponent(agentId)}` : path;
    const payload = isGet ? undefined : JSON.stringify({ ...(body || {}), agentId });
    const response = await fetch(url, {
        method,
        headers: isGet ? undefined : { 'Content-Type': 'application/json' },
        body: payload
    });
    const result = await response.json();
    if (response.status === 404 && result.message) {
        showNotice(result.message);
    }
    return { ok: response.ok, result };
}

/* ===================== SIDEBAR TOGGLE ===================== */
const showMenu = document.getElementById('menu-btn');
const menu = document.getElementById('menu');
const iface = document.getElementById('interface');
const backdrop = document.getElementById('backdrop');

showMenu.addEventListener('click', () => {
    if (menu.classList.contains('active')) {
        menu.classList.remove('active');
        iface.classList.add('activate');
        iface.classList.remove('button-event');
        backdrop.classList.remove('show');
    } else {
        menu.classList.add('active');
        iface.classList.add('button-event');
        iface.classList.remove('activate');
        backdrop.classList.add('show');
    }
});
backdrop.addEventListener('click', () => {
    menu.classList.remove('active');
    iface.classList.add('activate');
    iface.classList.remove('button-event');
    backdrop.classList.remove('show');
});

/* ===================== THEME TOGGLE ===================== */
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.className = theme === 'light' ? 'bx bxs-moon' : 'bx bxs-sun';
    try { localStorage.setItem('theme', theme); } catch (e) {}
}
(function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(saved || (systemPrefersLight ? 'light' : 'dark'));
})();
themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'light' ? 'dark' : 'light');
});

/* ===================== NOTIFICATION BANNER ===================== */
const noticeEl = document.getElementById('filter-notice');
const noticeText = document.getElementById('filter-notice-text');
const noticeClose = document.getElementById('filter-notice-close');
function showNotice(html) { noticeText.innerHTML = html; noticeEl.classList.remove('hidden'); }
function hideNotice() { noticeEl.classList.add('hidden'); }
noticeClose.addEventListener('click', hideNotice);

function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/* ===================== STATUS BADGES ===================== */
function statusBadge(status) {
    const raw = (status ?? '').toString().trim();
    const needle = raw.toLowerCase();
    let tone = 'neutral';
    if (/(win|complete|done|paid)/.test(needle)) tone = 'good';
    else if (/(pend|progress|wait)/.test(needle)) tone = 'warn';
    else if (/(cancel|void|fail|wrong)/.test(needle)) tone = 'bad';
    return `<span class="badge badge--${tone}">${raw || '—'}</span>`;
}

/* ===================== STAT WIDGETS ===================== */
const showingEarning = document.getElementById('earned');
const games = document.getElementById('games');
const showdate = document.getElementById('game-day');
const net = document.getElementById('not');
const balan = document.getElementById('balance');
const balance = document.getElementById('balance');

async function displaylast() {
    try {
        const { result } = await cloudFetch('/api/cloud/lastrow');
        if (result.success && result.data) {
            const row = result.data;
            games.innerHTML = row.game ?? 0;
            showingEarning.innerHTML = row.earn === '' ? 0 : row.earn;
            net.innerHTML = row.net;
        } else {
            showingEarning.innerHTML = 0;
            net.innerHTML = 0;
        }
    } catch (error) { console.error('fetch error', error); }
}
displaylast();

async function displayBalance() {
    try {
        const { result } = await cloudFetch('/api/cloud/balance');
        if (result.success && result.data) balance.innerHTML = result.data.balance;
    } catch (error) { console.error('balance fetch error', error); }
}
displayBalance();

/* ===================== DATE FILTER ===================== */
document.getElementById('filter-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const selectedDate = document.getElementById('date').value;
    const { result } = await cloudFetch('/api/cloud/fetch_data', { method: 'POST', body: { date: selectedDate } });
    if (!result || !result.table) return;

    const tableHead = document.getElementById('data-head');
    tableHead.innerHTML = `<tr>
        <th>Game</th><th>Stake</th><th>Players</th><th>Calls</th>
        <th>Winner</th><th>Bonus</th><th>Free</th><th>Status</th>
    </tr>`;

    const tableBody = document.getElementById('data-table');
    tableBody.innerHTML = '';
    document.getElementById('toget').style.display = 'none';

    let hasRows = false;
    result.table.forEach(row => {
        if (row.calls === 'No Data is found') {
            tableBody.innerHTML = `<td class="nodata">No data found for this date</td>`;
            tableBody.classList.add('nodata');
        } else {
            hasRows = true;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-cell="game">${row.game}</td>
                <td data-cell='stake'>${row.stake}</td>
                <td data-cell='player'>${row.player}</td>
                <td data-cell='calls'>${row.calls}</td>
                <td data-cell='winner'>${row.winner}</td>
                <td data-cell='bonus'>${row.bonus}</td>
                <td data-cell='free'>${row.free}</td>
                <td data-cell='status'>${statusBadge(row.status)}</td>
            `;
            tableBody.appendChild(tr);
        }
    });

    const gamestatus = result.gamestatus || {};
    balan.innerHTML = gamestatus.remain ?? 0;
    games.innerHTML = gamestatus.game ?? 0;
    net.innerHTML = gamestatus.net ?? 0;
    showingEarning.innerHTML = gamestatus.earn ?? 0;
    showdate.innerHTML = gamestatus.time ?? 'DATE not on record';

    const dateLabel = formatDateLabel(selectedDate);
    showNotice(hasRows ? `Showing results for <b>${dateLabel}</b>` : `No games recorded for <b>${dateLabel}</b>`);
});

/* ===================== MONTHLY / DAILY TOGGLE ===================== */
const filterBtn = document.getElementById('month');
const dailyBtn = document.getElementById('daily-data');

function setActiveToggle(activeBtn) {
    [filterBtn, dailyBtn].forEach(btn => btn.classList.remove('is-on'));
    activeBtn.classList.add('is-on');
}
dailyBtn.addEventListener('click', () => { setActiveToggle(dailyBtn); previoustable(); });
filterBtn.addEventListener('click', () => { setActiveToggle(filterBtn); altertable(); });

async function altertable() {
    try {
        const { result } = await cloudFetch('/api/cloud/fetch_content');
        if (!result.success || !result.data) { console.log('No data received'); return; }
        const data = result.data;

        document.getElementById('toget').style.display = 'none';
        const tableBody = document.getElementById('data-table');
        tableBody.innerHTML = '';
        tableBody.classList.remove('nodata');

        document.getElementById('data-head').innerHTML = `<tr>
            <th>No</th><th>Games</th><th>Earn</th><th>Net</th>
            <th>Topup-balance</th><th>Remain-bal</th><th>Time</th>
        </tr>`;
        document.getElementById('game-day').innerHTML = 'Monthly Status';

        data.forEach(row => {
            const rowed = row.balance === '0.00' ? '0.00' : `+ ${row.balance}`;
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td data-cell='No'>${row.No}</td>
                <td data-cell='games'>${row.game}</td>
                <td data-cell='earns'>${row.earn}</td>
                <td data-cell='net'>${row.net}</td>
                <td data-cell='topup-balance'>${rowed}</td>
                <td data-cell='time'>${row.remain}</td>
                <td data-cell='time'>${row.time}</td>
            `;
            tableBody.appendChild(newRow);
        });

        showNotice(`Showing <b>monthly summary</b> · ${data.length} record${data.length === 1 ? '' : 's'}`);
    } catch (error) { console.error('Error fetching or updating table:', error); }
}

async function previoustable() {
    try {
        const { ok, result } = await cloudFetch('/api/cloud/fetch_back');
        const tableBody = document.getElementById('data-table');
        if (!ok || !result.success || !result.data) {
            tableBody.innerHTML = `<td class="nodata">No result found</td>`;
            tableBody.classList.add('nodata');
            return;
        }
        const data = result.data;

        document.getElementById('toget').style.display = 'none';
        tableBody.innerHTML = '';
        tableBody.classList.remove('nodata');

        document.getElementById('data-head').innerHTML = `<tr>
            <th>Game</th><th>Stake</th><th>Players</th><th>Calls</th>
            <th>Winner</th><th>Bonus</th><th>Free</th><th>Status</th>
        </tr>`;
        document.getElementById('game-day').innerHTML = "TODAY'S GAMES";

        data.forEach(row => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td data-cell="game">${row.game}</td>
                <td data-cell="stake">${row.stake}</td>
                <td data-cell="player">${row.player}</td>
                <td data-cell="calls">${row.calls}</td>
                <td data-cell="winner">${row.winner}</td>
                <td data-cell="bonus">${row.bonus}</td>
                <td data-cell="free">${row.free}</td>
                <td data-cell="status">${statusBadge(row.status)}</td>
            `;
            tableBody.appendChild(newRow);
        });
        hideNotice();
    } catch (error) { console.error('Error fetching data:', error); }
}
previoustable();

/* ===================== LAST N DAYS FILTER ===================== */
async function customadd() {
    const inputvalue = document.getElementById('inputvalue').value;
    const finalvalue = document.getElementById('finalvalue').value;
    const warn = document.getElementById('warn');

    if (!inputvalue || !finalvalue) {
        warn.innerHTML = 'Please fill in both day fields.';
        setTimeout(() => { warn.innerHTML = ''; }, 3000);
        return;
    }
    if (finalvalue < inputvalue) {
        warn.innerHTML = 'Invalid input: the final day must be greater than the initial day.';
        setTimeout(() => { warn.innerHTML = ''; }, 3000);
        return;
    }

    try {
        const { result } = await cloudFetch('/api/cloud/basedinput', { method: 'POST', body: { inputvalue, finalvalue } });
        last(result);
    } catch (error) { console.error('Error:', error); }
}

async function last(result) {
    if (!result || !result.data) { console.log('No data received'); return; }

    document.getElementById('toget').style.display = 'flex';
    document.getElementById('birr').innerHTML = result.data.total.resultearn;
    document.getElementById('nett').innerHTML = result.data.total.resultnet;
    document.getElementById('bal').innerHTML = result.data.total.resultbal;
    document.getElementById('fun').innerHTML = result.data.total.resultgames;

    const data = result.data.table;
    const tableBody = document.getElementById('data-table');
    tableBody.innerHTML = '';
    tableBody.classList.remove('nodata');

    document.getElementById('data-head').innerHTML = `<tr>
        <th>No</th><th>Games</th><th>Earn</th><th>Net</th><th>Topup-balance</th><th>Time</th>
    </tr>`;
    document.getElementById('game-day').innerHTML = `${result.data.total.number} days earnings`;

    data.forEach(row => {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td data-cell='No'>${row.No}</td>
            <td data-cell='games'>${row.game}</td>
            <td data-cell='earns'>${row.earn}</td>
            <td data-cell='net'>${row.net}</td>
            <td data-cell='topup-balance'>${row.balance}</td>
            <td data-cell='time'>${row.time}</td>
        `;
        tableBody.appendChild(newRow);
    });

    showNotice(`Showing earnings from day <b>${result.data.total.number}</b> range · ${data.length} record${data.length === 1 ? '' : 's'}`);
}

document.getElementById('filterlast').addEventListener('click', () => customadd());
