const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const { connectMongo } = require('../mongo');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        console.log('[upload-db] File received:', file.originalname, 'size:', file.size);
        cb(null, true);
    }
});

// Global error handler to ensure JSON is always returned
router.use((err, req, res, next) => {
    console.error('[upload-db] Global error handler:', err);
    console.error('[upload-db] Stack:', err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

router.post('/upload-db', upload.single('dbFile'), async (req, res) => {
    console.log('[upload-db] Received upload request');

    try {
        // Check SYNC_SECRET env var
        if (!process.env.SYNC_SECRET) {
            console.error('[upload-db] SYNC_SECRET environment variable is not set!');
            return res.status(500).json({ success: false, message: 'Server configuration error: SYNC_SECRET not set' });
        }

        // Validate sync-secret header
        if (req.headers['x-sync-secret'] !== process.env.SYNC_SECRET) {
            console.log('[upload-db] Invalid sync-secret header');
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        console.log('[upload-db] Headers received:', {
            'x-sync-secret': req.headers['x-sync-secret'] ? 'present' : 'missing',
            'content-type': req.headers['content-type']
        });

        console.log('[upload-db] Body keys:', Object.keys(req.body));
        console.log('[upload-db] Has file:', !!req.file);

        // Check if multipart data was received
        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
            console.log('[upload-db] Multipart form-data detected');
        } else {
            console.log('[upload-db] WARNING: Content-Type is not multipart/form-data');
        }

        const agentId = req.body.agent_id;
        if (!agentId) {
            console.log('[upload-db] Missing agent_id in body');
            return res.status(400).json({ success: false, message: 'Missing agent_id' });
        }

        if (!req.file) {
            console.log('[upload-db] Missing file in request');
            return res.status(400).json({ success: false, message: 'Missing file' });
        }

        console.log('[upload-db] Agent ID:', agentId, 'File size:', req.file.size);

        const mongo = await connectMongo();
        console.log('[upload-db] MongoDB connected, database:', mongo.databaseName);

        // Check if GridFS bucket exists, create if not
        const bucket = new GridFSBucket(mongo, { bucketName: 'agent_dbs' });
        console.log('[upload-db] GridFS bucket created');

        // Remove any previous file(s) for this agent before storing the fresh one.
        const existing = await mongo.collection('agent_dbs.files').find({ 'metadata.agent_id': agentId }).toArray();
        console.log('[upload-db] Found', existing.length, 'existing files for this agent');

        for (const f of existing) {
            await bucket.delete(f._id);
            console.log('[upload-db] Deleted old file:', f.filename);
        }

        const uploadStream = bucket.openUploadStream(`${agentId}.db`, {
            metadata: { agent_id: agentId, uploaded_at: new Date() }
        });
        uploadStream.end(req.file.buffer);

        uploadStream.on('finish', () => {
            console.log('[upload-db] Upload successful for agent:', agentId);
            res.json({ success: true, agent_id: agentId });
        });

        uploadStream.on('error', (err) => {
            console.error('[upload-db] Upload stream error:', err);
            res.status(500).json({ success: false, message: err.message });
        });

    } catch (err) {
        console.error('[upload-db] Error:', err);
        console.error('[upload-db] Stack:', err.stack);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
