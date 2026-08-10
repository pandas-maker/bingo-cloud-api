const { formatMonthDayYear, formatWeekday } = require('../utils');

module.exports = (db) => {
    const rows = db.prepare(
        `SELECT game, earn, timestat, net, fillbal, remain FROM gamestatus ORDER BY timestat DESC`
    ).all();

    const data = [];
    let i = 1;
    for (const row of rows) {
        if (i > 31) break;
        const formatDate = formatMonthDayYear(row.timestat);
        const day = formatWeekday(row.timestat);
        data.push({
            earn: row.earn, net: row.net, game: row.game, balance: row.fillbal,
            remain: row.remain, time: `${formatDate}, ${day}`, No: i
        });
        i++;
    }

    return data.length ? data : null;
};
