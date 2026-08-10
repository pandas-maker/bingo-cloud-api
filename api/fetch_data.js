const { escapeHtml, formatMonthCommaDayYear } = require('../utils');

module.exports = (db, { date }) => {
    if (!date) return {};

    const rows = db.prepare("SELECT * FROM tablestat WHERE date = ? ORDER BY realtime DESC").all(date);

    let tabledata = [];
    if (rows.length > 0) {
        tabledata = rows.map(row => ({
            game: escapeHtml(row.game), stake: escapeHtml(row.stake), player: escapeHtml(row.player),
            calls: escapeHtml(row.calls), winner: escapeHtml(row.winner), bonus: escapeHtml(row.bonus),
            free: escapeHtml(row.free), status: escapeHtml(row.status)
        }));
    } else {
        tabledata = [{ calls: 'No Data is found' }];
    }

    const row2 = db.prepare("SELECT * FROM gamestatus WHERE timestat = ? LIMIT 1").get(date);

    let gameStatusData = {};
    if (row2) {
        gameStatusData = {
            earn: row2.earn || 0, game: row2.game || 0,
            time: formatMonthCommaDayYear(row2.timestat) || 0,
            net: row2.net || 0, remain: row2.remain || 0, realtime: row2.timestat
        };
    }

    return { table: tabledata, gamestatus: gameStatusData };
};
