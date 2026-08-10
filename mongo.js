const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);
let db;
let isConnected = false;

async function connectMongo() {
    if (db) return db;
    if (isConnected) return db;

    try {
        console.log('[mongo] Connecting to MongoDB at:', process.env.MONGO_URI);
        await client.connect();
        db = client.db(); // uses the db name already in MONGO_URI's path segment
        isConnected = true;
        console.log('[mongo] Connected to MongoDB, database:', db.databaseName);
        return db;
    } catch (err) {
        console.error('[mongo] Connection failed:', err.message);
        console.error('[mongo] MONGO_URI is:', process.env.MONGO_URI);
        throw new Error(`MongoDB connection failed: ${err.message}`);
    }
}

module.exports = { connectMongo };
