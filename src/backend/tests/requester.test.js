const request = require('supertest');
const express = require('express');
const { ObjectId } = require('mongodb');

const authMiddleware = require('../middleware/auth'); 
const requesterRouter = require('../api/requester');

// Indichiamo a Jest di intercettare le chiamate al modulo di autenticazione
jest.mock('../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    next();
  });
});

describe('--- Test Suite: Router Requester (Cittadino) ---', () => {
  let app;
  let mockDb;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Configurazione del mock DB
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn()
    };
    app.locals.db = mockDb;

    // Aggancio il router reale
    app.use('/api/v1/requesters', requesterRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // US6 - Visualizzazione Profilo Personale Richiedente

  describe('GET /api/v1/requesters/me [US6]', () => {
    test('TC-20: Il richiedente visualizza correttamente i propri dati di profilo', async () => {
      const userId = new ObjectId().toString();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId, role: 'requester' };
        next();
      });

      // Simula il caricamento del profilo utente dal DB finto
      mockDb.findOne.mockResolvedValueOnce({
        _id: new ObjectId(userId),
        username: 'Riccardo',
        email: 'riccardo@example.com',
        role: 'requester',
        name: 'Riccardo',
        surname: 'Rossi'
      });

      const res = await request(app)
        .get('/api/v1/requesters/me')
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'Riccardo');
      expect(res.body).toHaveProperty('email', 'riccardo@example.com');
      expect(res.body).toHaveProperty('role', 'requester');
      expect(res.body).not.toHaveProperty('points'); // I richiedenti non accumulano punti
    });
  });

  // US7 - Modifica Dati Profilo

  describe('PUT /api/v1/requesters/me [US7]', () => {
    test('TC-22: Rifiuta la modifica se un campo obbligatorio (nome/cognome) è vuoto', async () => {
      const userId = new ObjectId().toString();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId, role: 'requester' };
        next();
      });

      const res = await request(app)
        .put('/api/v1/requesters/me')
        .send({
          name: '', // campo obbligatorio vuoto
          surname: 'Rossi',
          phone: '3331234567',
          address: 'Via Roma 1, Trento'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Nome e cognome sono obbligatori');
    });
  });

  // US8 - Eliminazione Account & Pulizia a Cascata (GDPR)

  describe('DELETE /api/v1/requesters/me [US8]', () => {
    test('TC-23: Elimina con successo l\'account e cancella a cascata le richieste associate', async () => {
      const userId = new ObjectId().toString();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId, role: 'requester' };
        next();
      });

      // 1. Mock deleteMany su 'requests'
      mockDb.collection().deleteMany = jest.fn().mockResolvedValueOnce({ deletedCount: 3 });
      
      // 2. Mock deleteOne su 'users'
      mockDb.collection().deleteOne = jest.fn().mockResolvedValueOnce({ deletedCount: 1 });

      const res = await request(app)
        .delete('/api/v1/requesters/me')
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Profilo e tutte le richieste collegate eliminati definitivamente con successo');

      // Verifica che la pulizia a cascata sul DB sia avvenuta con l'ID corretto
      expect(mockDb.collection).toHaveBeenCalledWith('requests');
      expect(mockDb.collection).toHaveBeenCalledWith('users');
    });
  });

  // US10 - Creazione Richiesta d'Aiuto

  describe('POST /api/v1/requesters/requests [US10]', () => {
    
    test('TC-25: Dovrebbe creare una richiesta valida con stato "Aperta"', async () => {
      const userId = new ObjectId();
      
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: userId.toString(), role: 'requester' };
        next();
      });

      mockDb.findOne.mockResolvedValueOnce({ _id: userId, name: 'Anna', surname: 'Bianchi' });
      mockDb.insertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

      const res = await request(app)
        .post('/api/v1/requesters/requests')
        .send({
          serviceType: 'Spesa',
          description: 'Spesa settimanale di beni di prima necessità',
          date: '2026-06-15',
          time: '10:45',
          location: 'Via Roma 1, Trento'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Richiesta creata con successo');
    });

    test('TC-26: Errore 400 se manca un campo obbligatorio (Tipo Servizio)', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'requester' };
        next();
      });

      const res = await request(app)
        .post('/api/v1/requesters/requests')
        .send({
          description: 'Spesa senza specificare il tipo',
          date: '2026-06-15',
          location: 'Via Roma 1, Trento'
        });

      expect(res.status).toBe(400);
    });

    test('TC-26/2: Errore 403 se un Volontario prova a creare una richiesta da Cittadino', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'volunteer' };
        next();
      });

      const res = await request(app)
        .post('/api/v1/requesters/requests')
        .send({
          serviceType: 'Spesa',
          date: '2026-06-15',
          location: 'Via Roma 1, Trento'
        });

      expect(res.status).toBe(403);
    });
  });

  // US13 - Visualizzazione Richieste Personali

  describe('GET /api/v1/requesters/requests [US13]', () => {
    
  test('TC-27: Dovrebbe restituire la lista delle richieste filtrate per il cittadino loggato', async () => {
    const userObjectId = new ObjectId();
    const volunteerId = new ObjectId();

    authMiddleware.mockImplementationOnce((req, res, next) => {
      req.user = { userId: userObjectId.toString(), role: 'requester' };
      next();
    });

    const mockRequests = [
      { 
        _id: new ObjectId(), 
        userId: userObjectId, 
        serviceType: 'Spesa', 
        status: 'In Corso', 
        volunteerId: volunteerId 
      }
    ];
    
    mockDb.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValueOnce(mockRequests)
      })
    });
    
    mockDb.findOne.mockResolvedValueOnce({ _id: volunteerId, name: 'Marco', surname: 'Rossi' });

    const res = await request(app).get('/api/v1/requesters/requests');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('volunteerName', 'Marco');
  });
  });

  // US14 - Richiesta Segnata come Completata
  
  describe('PATCH /api/v1/requesters/requests/:requestId [US14]', () => {
    
    test('TC-28: Il richiedente segna con successo la richiesta come completata', async () => {
      const userId = new ObjectId().toString();
      const requestId = new ObjectId();
      const volunteerId = new ObjectId().toString();
    
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId, role: 'requester' };
        next();
      });

      mockDb.findOne.mockResolvedValueOnce({
        _id: requestId,
        userId: new ObjectId(userId),
        volunteerId: volunteerId,
        status: 'In Corso'
      });

      // (mock accredito punti al volontario nel codice reale)
      mockDb.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
      // (mock aggiornamento stato richiesta a "Completata")
      mockDb.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

      const res = await request(app)
        .patch(`/api/v1/requesters/requests/${requestId.toString()}`)
        .send({ status: 'Completata' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Stato aggiornato con successo');
    });
  });

});