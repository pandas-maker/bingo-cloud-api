const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const { connectMongo } = require('../mongo');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/upload-db', upload.single('dbFile'), async (req, res) => {
    if (req.headers['x-sync-secret'] !== process.env.SYNC_SECRET) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const agentId = req.body.agent_id;
    if (!agentId || !req.file) {
        return res.status(400).json({ success: false, message: 'Missing agent_id or file' });
    }

    try {
        const mongo = await connectMongo();
        const bucket = new GridFSBucket(mongo, { bucketName: 'agent_dbs' });

        // Remove any previous file(s) for this agent before storing the fresh one.
        const existing = await mongo.collection('agent_dbs.files').find({ 'metadata.agent_id': agentId }).toArray();
        for (const f of existing) await bucket.delete(f._id);

        const uploadStream = bucket.openUploadStream(`${agentId}.db`, {
            metadata: { agent_id: agentId, uploaded_at: new Date() }
        });
        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', () => res.json({ success: true, agent_id: agentId }));
        uploadStream.on('error', (err) => res.status(500).json({ success: false, message: err.message }));
    } catch (err) {
        console.error('upload-db error', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
