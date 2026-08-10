const { todayYMD } = require('../utils');

module.exports = (db) => {
    const today = todayYMD();
    const lastRow = db.prepare("SELECT * FROM gamestatus WHERE timestat = ?").get(today);
    return lastRow || null;
};
