module.exports = (db) => {
    const result = db.prepare("SELECT * FROM balanced LIMIT 1").get();
    return result || null;
};
