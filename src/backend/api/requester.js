// API Requester

const express = require('express');
const { ObjectId } = require('mongodb');
const connectDB = require('../../config/db');
const authMiddleware = require('../middleware/auth');
const { SERVICE_POINTS } = require('../../config/constants');

const router = express.Router();

// Proteggi tutte le rotte di questo router con l'authMiddleware
router.use(authMiddleware);

// Verifica che il ruolo dell'utente autenticato sia 'requester'
router.use((req, res, next) => {
  if (req.user.role !== 'requester') {
    return res.status(403).json({ error: 'Accesso negato: richiesto ruolo Cittadino (Richiedente)' });
  }
  next();
});

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
    const userId = req.user.userId;
    const { serviceType, location, date, time, notes } = req.body;

    if (!serviceType || !location || !date || !time) {
      return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati' });
    }

    // Recupera il nome e cognome reale del richiedente per popolare 'requesterName'
    const requester = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const requesterName = requester ? `${requester.name} ${requester.surname}` : 'Utente Richiedente';

    const newRequest = {
      userId: new ObjectId(userId),
      serviceType,
      category: serviceType, // per compatibilità volontario
      title: `${serviceType} a ${location}`, // per compatibilità volontario
      location,
      address: location, // per compatibilità volontario
      date,
      time,
      dateTime: `${date}, ${time}`, // per compatibilità volontario
      notes: notes || '',
      description: notes || '', // per compatibilità volontario
      points: SERVICE_POINTS[serviceType] || 100, // punti associati all'attività presi dalle costanti
      status: 'In Attesa di Volontario',
      createdAt: new Date(),
      volunteerId: null,
      completedAt: null,
      rating: null,
      review: null,
      requesterName
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

// API per ottenere tutte le richieste dell'utente loggato
router.get('/requests', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const userId = req.user.userId;

    const requests = await db
      .collection('requests')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("DEBUG /api/requester/requests - requests in DB:", JSON.stringify(requests, null, 2));

    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      if (request.volunteerId) {
        try {
          const volunteer = await db.collection('users').findOne(
            { _id: new ObjectId(request.volunteerId) },
            { projection: { name: 1, surname: 1 } }
          );
          if (volunteer) {
            return {
              ...request,
              volunteerName: volunteer.name,
              volunteerSurname: volunteer.surname
            };
          }
        } catch (e) {
          console.error("Errore recupero volontario:", e);
        }
      }
      return request;
    }));

    res.json(enrichedRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compatibilità con path param (assicurando l'autorizzazione)
router.get('/:userId/requests', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { userId } = req.params;

    if (userId !== req.user.userId) {
      return res.status(403).json({ error: 'Non autorizzato a visualizzare queste richieste' });
    }

    const requests = await db
      .collection('requests')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      if (request.volunteerId) {
        try {
          const volunteer = await db.collection('users').findOne(
            { _id: new ObjectId(request.volunteerId) },
            { projection: { name: 1, surname: 1 } }
          );
          if (volunteer) {
            return {
              ...request,
              volunteerName: volunteer.name,
              volunteerSurname: volunteer.surname
            };
          }
        } catch (e) {
          console.error("Errore recupero volontario:", e);
        }
      }
      return request;
    }));

    res.json(enrichedRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per aggiornare una richiesta esistente dell'utente loggato
router.put('/requests/:requestId', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { requestId } = req.params;
    const userId = req.user.userId;
    const { serviceType, location, date, time, notes } = req.body;

    if (!serviceType || !location || !date || !time) {
      return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati' });
    }

    const request = await db.collection('requests').findOne({ 
      _id: new ObjectId(requestId),
      userId: new ObjectId(userId)
    });

    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata o non autorizzata' });
    }

    if (request.status !== 'In Attesa di Volontario') {
      return res.status(400).json({ error: 'La richiesta non può essere modificata' });
    }

    const result = await db.collection('requests').updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          serviceType, 
          category: serviceType,
          title: `${serviceType} a ${location}`,
          location, 
          address: location,
          date, 
          time, 
          dateTime: `${date}, ${time}`,
          notes: notes || '',
          description: notes || ''
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    res.json({ message: 'Richiesta aggiornata con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per aggiornare lo stato di una richiesta (es. completata o annullata)
router.put('/requests/:requestId/status', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { requestId } = req.params;
    const userId = req.user.userId;
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

    // Assicurati che appartenga all'utente loggato
    const request = await db.collection('requests').findOne({ 
      _id: new ObjectId(requestId),
      userId: new ObjectId(userId)
    });

    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata o non autorizzata' });
    }

    const updateData = { status };
    if (status === 'Completata') {
      updateData.completedAt = new Date();
      
      // Quando il richiedente segna una richiesta come "Completata", assegniamo i punti al volontario!
      if (request.volunteerId) {
        const pointsEarned = parseInt(request.points || 100);
        await db.collection('users').updateOne(
          { _id: new ObjectId(request.volunteerId) },
          { $inc: { points: pointsEarned } }
        );
      }
    }

    const result = await db
      .collection('requests')
      .updateOne({ _id: new ObjectId(requestId) }, { $set: updateData });

    res.json({ message: 'Stato aggiornato con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per aggiungere valutazione alla richiesta completata
router.put('/requests/:requestId/ratings', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { requestId } = req.params;
    const userId = req.user.userId;
    const { rating, review } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valutazione non valida. Deve essere un numero da 1 a 5.' });
    }

    const request = await db.collection('requests').findOne({ 
      _id: new ObjectId(requestId),
      userId: new ObjectId(userId)
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata o non autorizzata' });
    }

    if (request.status !== 'Completata') {
      return res.status(400).json({ error: 'È possibile valutare solo richieste completate.' });
    }

    const result = await db.collection('requests').updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { rating, review: review || '' } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    res.json({ message: 'Valutazione salvata con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Elimina o Annulla richiesta
router.delete('/requests/:requestId', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const { requestId } = req.params;
    const userId = req.user.userId;

    const request = await db.collection('requests').findOne({ 
      _id: new ObjectId(requestId),
      userId: new ObjectId(userId)
    });

    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata o non autorizzata' });
    }

    // Se la richiesta è già annullata o completata, l'utente vuole eliminarla del tutto dal database per pulire la cronologia!
    if (request.status === 'Annullata' || request.status === 'Completata') {
      await db.collection('requests').deleteOne({ _id: new ObjectId(requestId) });
      return res.json({ message: 'Richiesta eliminata definitivamente con successo' });
    }

    if (!canEditRequest(request)) {
      return res.status(400).json({ error: 'La richiesta non può essere annullata in quanto già in corso' });
    }

    const result = await db
      .collection('requests')
      .updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: 'Annullata' } }
      );

    res.json({ message: 'Richiesta annullata con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per caricare il profilo del richiedente.
router.get('/me', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const userId = req.user.userId;

    const requester = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!requester) {
      return res.status(404).json({ error: 'Profilo richiedente non trovato' });
    }

    res.json(requester);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per aggiornare il profilo del richiedente.
router.put('/me', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const userId = req.user.userId;
    const { name, surname, phone, address } = req.body;

    if (!name || !surname) {
      return res.status(400).json({ error: 'Nome e cognome sono obbligatori' });
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { name, surname, phone: phone || '', address: address || '', updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Profilo richiedente non trovato o non autorizzato' });
    }

    res.json({ message: 'Profilo aggiornato con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API per eliminare definitivamente il profilo del richiedente.
router.delete('/me', async (req, res) => {
  try {
    const db = await getDatabase(req);
    const userId = req.user.userId;

    // GDPR: Elimina tutte le richieste create da questo richiedente
    await db.collection('requests').deleteMany({ userId: new ObjectId(userId) });

    // Elimina il profilo utente stesso
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Profilo non trovato' });
    }

    res.json({ message: 'Profilo e tutte le richieste collegate eliminati definitivamente con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
