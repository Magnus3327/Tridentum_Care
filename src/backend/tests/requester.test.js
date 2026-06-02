const request = require('supertest');
const express = require('express');
const { ObjectId } = require('mongodb');

const authMiddleware = require('../middleware/auth'); 
const requesterRouter = require('../api/requester');

// Indichiamo a Jest di intercettare le chiamate al modulo di autenticazione
jest.mock('../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    // Questo comportamento verrà sovrascritto dinamicamente nei test
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

  // US10 - Creazione Richiesta d'Aiuto

  describe('POST /api/v1/requesters/requests [US10]', () => {
    
    test('TC-10.1: Dovrebbe creare una richiesta valida con stato "Aperta"', async () => {
      const userId = new ObjectId();
      
      // Sovrascriviamo l'autenticazione per iniettare l'utente corretto
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

    test('TC-10.2: Errore 400 se manca un campo obbligatorio (Tipo Servizio)', async () => {
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

    test('TC-10.3: Errore 403 se un Volontario prova a creare una richiesta da Cittadino', async () => {
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
    
  test('TC-13.1: Dovrebbe restituire la lista delle richieste filtrate per il cittadino loggato', async () => {
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
    
      // --- DA SOSTITUIRE INTERAMENTE DENTRO IL TC-14.1 IN requester.test.js ---
    test('TC-14.1: Il richiedente segna con successo la richiesta come completata', async () => {
      const userId = new ObjectId().toString();
      const requestId = new ObjectId();
      const volunteerId = new ObjectId().toString();
    
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId, role: 'requester' };
        next();
      });

      // 1. Il database restituisce la richiesta in corso creata da questo utente e assegnata a un volontario
      mockDb.findOne.mockResolvedValueOnce({
        _id: requestId,
        userId: new ObjectId(userId),
        volunteerId: volunteerId,
        status: 'In Corso'
      });

      // 2. Mock per il primo updateOne (accredito punti al volontario nel codice reale)
      mockDb.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
      // 3. Mock per il secondo updateOne (aggiornamento stato richiesta a "Completata")
      mockDb.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

      // L'endpoint reale nel router è PATCH /api/v1/requesters/requests/:requestId con body { status }
      const res = await request(app)
        .patch(`/api/v1/requesters/requests/${requestId.toString()}`)
        .send({ status: 'Completata' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Stato aggiornato con successo');
    });
  });

});