const express = require('express');
const router = express.Router();
const { withAgentDb } = require('../db-helper');

// Drop your real endpoint logic in ./api/<name>.js, each exporting:
//   module.exports = (db, params) => { ...your existing query logic...; return data; }
// `db` is the opened better-sqlite3 handle for this agent's synced file.
const lastrow = require('../api/lastrow');
const balanceQuery = require('../api/balance');
const fetchData = require('../api/fetch_data');
const fetchBack = require('../api/fetch_back');
const fetchContent = require('../api/fetch_content');
const basedInput = require('../api/basedinput');

function requireAgentId(req, res) {
    const agentId = req.query.agentId || req.body.agentId;
    if (!agentId) {
        res.status(400).json({ success: false, message: 'Missing agentId' });
        return null;
    }
    return agentId;
}

function handleErr(e, res) {
    if (e.code === 'NOT_SYNCED') return res.status(404).json({ success: false, message: e.message });
    console.error('cloud dashboard error', e);
    res.status(500).json({ success: false, message: 'Server error reading synced data' });
}

// ---------- LOGIN — just confirms this Cloud ID has synced data ----------
router.post('/login', async (req, res) => {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ success: false, message: 'Cloud ID required' });
    try {
        await withAgentDb(agentId, (db) => {
            // Two-layer check: withAgentDb already found this file by matching
            // GridFS metadata.agent_id (step 1). This confirms the db file's own
            // cloud_sync.agent_id column agrees — catches a mismatched/corrupt sync.
            const row = db.prepare('SELECT agent_id FROM cloud_sync WHERE agent_id = ?').get(agentId);
            if (!row) {
                const err = new Error('Cloud ID not found in this database.');
                err.code = 'NOT_SYNCED';
                throw err;
            }
        });
        res.json({ success: true, agent_id: agentId });
    } catch (e) { handleErr(e, res); }
});

// ---------- LAST ROW ----------
router.get('/lastrow', async (req, res) => {
    const agentId = requireAgentId(req, res); if (!agentId) return;
    try {
        const data = await withAgentDb(agentId, (db) => lastrow(db));
        res.json({ success: true, data });
    } catch (e) { handleErr(e, res); }
});

// ---------- BALANCE ----------
router.get('/balance', async (req, res) => {
    const agentId = requireAgentId(req, res); if (!agentId) return;
    try {
        const data = await withAgentDb(agentId, (db) => balanceQuery(db));
        res.json({ success: true, data });
    } catch (e) { handleErr(e, res); }
});

// ---------- DATE FILTER ----------
router.post('/fetch_data', async (req, res) => {
    const agentId = requireAgentId(req, res); if (!agentId) return;
    const { date } = req.body;
    try {
        const result = await withAgentDb(agentId, (db) => fetchData(db, { date }));
        res.json(result);
    } catch (e) { handleErr(e, res); }
});

// ---------- TODAY'S GAMES ----------
router.get('/fetch_back', async (req, res) => {
    const agentId = requireAgentId(req, res); if (!agentId) return;
    try {
        const data = await withAgentDb(agentId, (db) => fetchBack(db));
        res.json({ success: true, data });
    } catch (e) { handleErr(e, res); }
});

// ---------- MONTHLY SUMMARY ----------
router.get('/fetch_content', async (req, res) => {
    const agentId = requireAgentId(req, res); if (!agentId) return;
    try {
        const data = await withAgentDb(agentId, (db) => fetchContent(db));
        res.json({ success: true, data });
    } catch (e) { handleErr(e, res); }
});

// ---------- LAST N DAYS RANGE ----------
router.post('/basedinput', async (req, res) => {
    const agentId = requireAgentId(req, res); if (!agentId) return;
    const { inputvalue, finalvalue } = req.body;
    try {
        const result = await withAgentDb(agentId, (db) => basedInput(db, { inputvalue, finalvalue }));
        res.json(result);
    } catch (e) { handleErr(e, res); }
});

module.exports = router;
