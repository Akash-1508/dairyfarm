const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const dns = require("dns");

// Load .env file from backend root directory
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

// Is system pe DNS SRV resolve nahi hota; Node ko Google DNS use karne do
dns.setServers(["8.8.8.8", "8.8.4.4"]);

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return mongoose.connection.db;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in environment");
  }

  try {
    await mongoose.connect(uri);
    isConnected = true;
    const dbName = mongoose.connection.db.databaseName;
    console.log(`[db] Connected to MongoDB database="${dbName}"`);
    return mongoose.connection.db;
  } catch (error) {
    console.error("[db] Connection error:", error);
    throw error;
  }
}

function getDb() {
  if (!isConnected) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return mongoose.connection.db;
}

async function disconnectDatabase() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("[db] Disconnected from MongoDB");
  }
}

module.exports = {
  connectToDatabase,
  getDb,
  disconnectDatabase,
  mongoose,
};
