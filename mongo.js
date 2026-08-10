const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectMongo() {
    if (db) return db;
    await client.connect();
    db = client.db(); // uses the db name already in MONGO_URI's path segment
    console.log('Connected to MongoDB');
    return db;
}

module.exports = { connectMongo };
