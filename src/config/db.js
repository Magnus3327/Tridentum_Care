const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error("ERRORE: MONGO_URI o MONGODB_URI non è impostata nel file .env");
}

const client = new MongoClient(uri);

async function connectDB() {
  await client.connect();
  console.log("Connesso a MongoDB Atlas con successo!");
  return client.db(process.env.DB_NAME || "tridentum_care");
}

module.exports = connectDB;