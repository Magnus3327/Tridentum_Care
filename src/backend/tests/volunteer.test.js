const request = require('supertest');
const express = require('express');
const { ObjectId } = require('mongodb');

const authMiddleware = require('../middleware/auth');
const volunteerRouter = require('../api/volunteer');
const requestsRouter = require('../api/requests');

jest.mock('../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    next();
  });
});

describe('--- Test Suite: Router Volunteer (Volontario) ---', () => {
  let app;
  let mockDb;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    mockDb = {
      collection: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      insertOne: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn()
    };
    app.locals.db = mockDb;

    app.use('/api/v1/volunteers', volunteerRouter);
    app.use('/api/v1/requests', requestsRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // US6 - Visualizzazione Profilo Personale

  describe('GET /api/v1/volunteers/me [US6]', () => {
    test('TC-19: Il volontario visualizza correttamente i propri dati e il saldo punti', async () => {
      const volunteerId = new ObjectId();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: volunteerId.toString(), role: 'volunteer' };
        next();
      });

      mockDb.findOne.mockResolvedValueOnce({
        _id: volunteerId,
        username: 'Volontario_Trento',
        email: 'volontario@example.com',
        role: 'volunteer',
        points: 120,
        skills: ['Consegna Farmaci', 'Spesa']
      });

      const res = await request(app)
        .get('/api/v1/volunteers/me')
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'Volontario_Trento');
      expect(res.body).toHaveProperty('points', 120);
      expect(Array.isArray(res.body.skills)).toBe(true);
    });
  });

  // US7 - Modifica dati Profilo con controllo Età

  describe('PUT /api/v1/volunteers/me [US7]', () => {
    
    test('TC-21: Accetta la modifica con dati validi', async () => {
      const userId = new ObjectId();  
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'volunteer' };
        next();
      });

      mockDb.findOne.mockResolvedValueOnce({
        _id: userId,
        role: "volunteer",
        authLvl: 1
      });

      mockDb.updateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

      const res = await request(app)
        .put('/api/v1/volunteers/me')
        .send({
          name: 'Mario',
          surname: 'Rossi',
          age: 25
        });

      expect(res.status).toBe(200);
    });

    test('TC-22: Rifiuta la modifica se un campo obbligatorio (nome/cognome) è vuoto', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'volunteer' };
        next();
      });

      const res = await request(app)
        .put('/api/v1/volunteers/me')
        .send({
          name: '', // campo obbligatorio vuoto
          surname: 'Rossi',
          age: 25
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Nome e cognome sono obbligatori');
    });
  });

  // US8 - Eliminazione Account Volontario & GDPR

  describe('DELETE /api/v1/volunteers/me [US8]', () => {
    test('TC-23: Rimuove l\'account e reimposta in bacheca le sue richieste "In Corso"', async () => {
      const volunteerId = new ObjectId().toString();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: volunteerId, role: 'volunteer' };
        next();
      });

      mockDb.collection().updateMany = jest.fn()
        .mockResolvedValueOnce({ modifiedCount: 1 })  // Ripristina richieste "In Corso"
        .mockResolvedValueOnce({ modifiedCount: 2 }); // Anonimizza richieste "Completate"
      
      mockDb.collection().deleteOne = jest.fn().mockResolvedValueOnce({ deletedCount: 1 });

      const res = await request(app)
        .delete('/api/v1/volunteers/me')
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Profilo eliminato definitivamente e contributi sbloccati/anonimizzati con successo');
    });
  });

  // US17 - Visualizzazione Bacheca Richieste Aperte

  describe('GET /api/v1/requests [US17]', () => {
    
    test('TC-29: Il volontario visualizza correttamente le richieste in attesa', async () => {
      const volunteerId = new ObjectId();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: volunteerId.toString(), role: 'volunteer' };
        next();
      });

      const mockAvailableRequests = [
        {
          _id: new ObjectId(),
          serviceType: 'Consegna Farmaci',
          category: 'Consegna Farmaci',
          status: 'In Attesa di Volontario',
          location: 'Trento Centro'
        }
      ];

      mockDb.findOne.mockResolvedValueOnce({
        _id: volunteerId,
        role: 'volunteer',
        skills: ['Consegna Farmaci']
      });

      mockDb.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValueOnce(mockAvailableRequests)
        })
      });

      const res = await request(app).get('/api/v1/requests');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // US19 - Accettazione di una richiesta

  describe('POST /api/v1/requests/:id/assignments [US19]', () => {
    
    test('TC-30: Il volontario accetta una richiesta disponibile cambiandone lo stato', async () => {
      const volunteerId = new ObjectId();
      const requestId = new ObjectId();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: volunteerId.toString(), role: 'volunteer' };
        next();
      });

      mockDb.findOne.mockResolvedValueOnce({ _id: volunteerId, role: 'volunteer' });
      mockDb.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      const res = await request(app)
        .post(`/api/v1/requests/${requestId.toString()}/assignments`)
        .send();

      expect(res.status).toBe(200);
    });

    test('TC-31: Azione bloccata se la richiesta è già stata presa in carico da un altro volontario', async () => {
      const volunteerId = new ObjectId();
      const requestId = new ObjectId();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: volunteerId.toString(), role: 'volunteer' };
        next();
      });

      mockDb.findOne.mockResolvedValueOnce({ _id: volunteerId, role: 'volunteer' });
      // Se updateOne non modifica documenti, la richiesta non è più disponibile.
      mockDb.updateOne.mockResolvedValueOnce({ modifiedCount: 0 });

      const res = await request(app)
        .post(`/api/v1/requests/${requestId.toString()}/assignments`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Richiesta non disponibile o già assegnata');
    });

  });

  // US20 - Visualizzazione Catalogo Coupon Disponibili

  describe('GET /api/v1/volunteers/coupons [US20]', () => {
    test('TC-33: Il volontario visualizza la lista dei coupon attivi nel catalogo', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'volunteer' };
        next();
      });

      const mockCoupons = [
        { _id: new ObjectId(), title: 'Sconto Conad 10€', pointsCost: 50, expirationDate: '2026-12-31' }
      ];

      mockDb.find = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValueOnce(mockCoupons)
      });

      const res = await request(app)
        .get('/api/v1/volunteers/coupons')
        .send();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('title', 'Sconto Conad 10€');
    });
  });

  // US21 - Acquisto/Riscatto Coupon Catalogo Premi

  describe('POST /api/v1/volunteers/coupons/redemptions [US21]', () => {
    
    test('TC-34: Ritiro completato con successo se i punti sono sufficienti', async () => {
      const volunteerId = new ObjectId();
      const couponId = new ObjectId();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: volunteerId.toString(), role: 'volunteer' };
        next();
      });

      mockDb.findOne.mockResolvedValueOnce({ _id: volunteerId, points: 100 });
      mockDb.findOne.mockResolvedValueOnce({ _id: couponId, title: 'Buono Conad 10€', pointsCost: 50 });
      
      mockDb.updateOne.mockResolvedValueOnce({ matchedCount: 1 });
      mockDb.insertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

      const res = await request(app)
        .post('/api/v1/volunteers/coupons/redemptions')
        .send({ couponId: couponId.toString() });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('newPoints', 50);
    });

    test('TC-35: Fallisce se il saldo punti del volontario è insufficiente', async () => {
      const volunteerId = new ObjectId();
      const couponId = new ObjectId();

      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: volunteerId.toString(), role: 'volunteer' };
        next();
      });

      mockDb.findOne.mockResolvedValueOnce({ _id: volunteerId, points: 30 });
      mockDb.findOne.mockResolvedValueOnce({ _id: couponId, title: 'Buono Spesa 10€', pointsCost: 50 });

      const res = await request(app)
        .post('/api/v1/volunteers/coupons/redemptions')
        .send({ couponId: couponId.toString() });

      expect(res.status).toBe(400);
    });

  });
});