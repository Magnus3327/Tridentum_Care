// API Requester

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const connectDB = require('../../config/db');

const router = express.Router();

router.post("/requests", async (req, res) => {
  try {
    const db = await connectDB();
    const { userId, serviceType, location, date, time, notes } = req.body;

    // Validate required fields
    if (!serviceType || !location || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newRequest = {
      userId: new ObjectId(userId),  // Non funzionerà finche non avremo l'autenticazione, ma è un placeholder per ora
      serviceType,
      location,
      date,
      time,
      notes: notes || "",
      status: "In Attesa di Volontario",
      createdAt: new Date(),
      volunteerId: null,
      completedAt: null,
      rating: null,
      review: null,
    };

    const result = await db.collection("requests").insertOne(newRequest);
    res.status(201).json({
      message: "Richiesta creata con successo",
      requestId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
