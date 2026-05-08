const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
  await client.connect();

  console.log("Connesso a MongoDB Atlas");

  return client.db(process.env.DB_NAME);
}

module.exports = connectDB;