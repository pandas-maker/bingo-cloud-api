const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3-multiple-ciphers');
const { GridFSBucket } = require('mongodb');
const { connectMongo } = require('./mongo'); // mongo.js lives at project root, same folder as this file

function openEncrypted(dbPath, key) {
    const instance = new Database(dbPath);
    instance.pragma('cipher_plaintext_header_size = 32');
    instance.pragma('cipher_compatibility = 4');
    instance.pragma(`key='${key.replace(/'/g, "''")}'`);
    instance.prepare('SELECT count(*) FROM sqlite_master').get(); // force key verification now
    return instance;
}

/**
 * Downloads the agent's latest synced db from GridFS to a throwaway temp file,
 * opens it, runs `callback(db)`, then ALWAYS closes the handle and deletes the
 * temp file — even if callback throws.
 *
 * Throws an error with .code === 'NOT_SYNCED' if this agent_id has never synced.
 */
async function withAgentDb(agentId, callback) {
    const mongo = await connectMongo();
    const bucket = new GridFSBucket(mongo, { bucketName: 'agent_dbs' });

    const fileDoc = await mongo.collection('agent_dbs.files').findOne({ 'metadata.agent_id': agentId });
    if (!fileDoc) {
        const err = new Error('No synced data found for this Cloud ID yet.');
        err.code = 'NOT_SYNCED';
        throw err;
    }

    const tmpPath = path.join(os.tmpdir(), `agent-${agentId}-${Date.now()}.db`);
    await new Promise((resolve, reject) => {
        bucket.openDownloadStream(fileDoc._id)
            .pipe(fs.createWriteStream(tmpPath))
            .on('finish', resolve)
            .on('error', reject);
    });

    let sqlite;
    try {
        sqlite = openEncrypted(tmpPath, process.env.DB_KEY);
        return await callback(sqlite);
    } finally {
        if (sqlite) sqlite.close();
        fs.unlink(tmpPath, () => {}); // best-effort cleanup, don't block the response on it
    }
}

module.exports = { withAgentDb };
