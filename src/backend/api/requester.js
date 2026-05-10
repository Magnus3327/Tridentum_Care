// API Requester

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const connectDB = require('../../config/db');

const router = express.Router();

async function getDatabase(req) {
  if (req.app?.locals?.db) return req.app.locals.db;
  return connectDB();
}

function buildRequestDate(request) {
  if (!request.date || !request.time) return null;
  return new Date(`${request.date}T${request.time}`);
}

function canEditRequest(request) {
  if (!request) return false;
  if (request.status !== 'In Attesa di Volontario') return false;
  const reqDate = buildRequestDate(request);
  if (!reqDate) return false;
  return reqDate > new Date();
}

// API per la creazione di una nuova richiesta di assistenza
router.post('/requests', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { userId, serviceType, location, date, time, notes } = req.body;

    if (!serviceType || !location || !date || !time || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newRequest = {
      userId: new ObjectId(userId),
      serviceType,
      location,
      date,
      time,
      notes: notes || '',
      status: 'In Attesa di Volontario',
      createdAt: new Date(),
      volunteerId: null,
      completedAt: null,
      rating: null,
      review: null,
    };

    const result = await db.collection('requests').insertOne(newRequest);
    res.status(201).json({
      message: 'Richiesta creata con successo',
      requestId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per ottenere tutte le richieste di un utente specifico
router.get('/requests', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const requests = await db
      .collection('requests')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compatibilità con path param
router.get('/requests/:userId', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { userId } = req.params;

    const requests = await db
      .collection('requests')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per aggiornare una richiesta esistente
router.put('/requests/:requestId', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { requestId } = req.params;
    const { serviceType, location, date, time, notes } = req.body;

    if (!serviceType || !location || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const request = await db.collection('requests').findOne({ _id: new ObjectId(requestId) });
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    if (!canEditRequest(request)) {
      return res.status(400).json({ error: 'La richiesta non può essere modificata' });
    }

    const result = await db.collection('requests').updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { serviceType, location, date, time, notes: notes || '' } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    res.json({ message: 'Richiesta aggiornata con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per aggiornare lo stato di una richiesta
router.put('/requests/:requestId/status', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { requestId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'In Attesa di Volontario',
      'In Corso',
      'Completata',
      'Annullata',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }

    const updateData = { status };
    if (status === 'Completata') {
      updateData.completedAt = new Date();
    }

    const result = await db
      .collection('requests')
      .updateOne({ _id: new ObjectId(requestId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    res.json({ message: 'Stato aggiornato con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel request
router.delete('/requests/:requestId', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { requestId } = req.params;

    const request = await db.collection('requests').findOne({ _id: new ObjectId(requestId) });
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    if (!canEditRequest(request)) {
      return res.status(400).json({ error: 'La richiesta non può essere annullata' });
    }

    const result = await db
      .collection('requests')
      .updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: 'Annullata' } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    res.json({ message: 'Richiesta annullata con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
