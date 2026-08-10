const { todayYMD } = require('../utils');

module.exports = (db) => {
    const today = todayYMD();
    const rows = db.prepare("SELECT * FROM tablestat WHERE date = ? ORDER BY realtime DESC").all(today);

    const data = rows.map(row => ({
        stake: row.stake, game: row.game, calls: row.calls, status: row.status,
        winner: row.winner, bonus: row.bonus, free: row.free, player: row.player
    }));

    return data.length ? data : null;
};
