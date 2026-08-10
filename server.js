const express = require('express');
const path = require('path');
const { connectMongo } = require('./mongo');
const cloudDashboard = require('./routes/cloud-dashboard');
const uploadDb = require('./routes/upload-db'); // your existing GridFS receive endpoint

const app = express();
app.use(express.json());

// Static frontend: cloud-login.html, cloud-dash.html, js/cloud-dash.js
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/cloud', cloudDashboard);   // login, lastrow, balance, fetch_data, fetch_back, fetch_content, basedinput
app.use('/api', uploadDb);               // POST /api/upload-db — receives the sync from the local app

async function start() {
    await connectMongo();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
