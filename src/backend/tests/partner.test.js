const request = require('supertest');
const express = require('express');
const { ObjectId } = require('mongodb');

const authMiddleware = require('../middleware/auth');
const partnerRouter = require('../api/partner');

jest.mock('../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    next();
  });
});

describe('--- Test Suite: Router Partner (Esercente Commerciale) ---', () => {
  let app;
  let mockDb;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    mockDb = {
      collection: jest.fn().mockReturnThis(),
      insertOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn()
    };
    app.locals.db = mockDb;

    app.use('/api/v1/partners', partnerRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // US20: Inserimento Premi nel Catalogo
  // ==========================================
  describe('POST /api/v1/partners/coupons [US20]', () => {
    
    test('TC-20.1: Un partner autenticato inserisce un coupon valido con successo (201)', async () => {
      const partnerId = new ObjectId();
      
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: partnerId.toString(), role: 'partner' };
        next();
      });

      mockDb.insertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

      const res = await request(app)
        .post('/api/v1/partners/coupons')
        .send({
          title: 'Sconto 20% Pizza a Scelta',
          description: 'Valido presso le pizzerie convenzionate di Trento',
          pointsCost: 75,
          expirationDate: '2026-12-31' // Campo obbligatorio richiesto dal backend
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Coupon creato con successo');
      
      // Verifica che il costo in punti sia stato passato e salvato come numero numerico coerente
      const savedDocument = mockDb.insertOne.mock.calls[0][0];
      expect(savedDocument.partnerId.toString()).toBe(partnerId.toString());
      expect(savedDocument.pointsCost).toBe(75);
    });

    test('TC-20.2: Rifiuta la creazione (400) se il costo in punti è assente o minore di 1', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'partner' };
        next();
      });

      const res = await request(app)
        .post('/api/v1/partners/coupons')
        .send({
          title: 'Caffè Omaggio',
          description: 'Un caffè espresso in omaggio',
          pointsCost: 0, // Invalido (<= 0)
          expirationDate: '2026-12-31'
        });

      expect(res.status).toBe(400);
    });

    test('TC-20.3: Rifiuta l\'accesso (403) se un cittadino (requester) tenta di inserire un coupon', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'requester' }; // Ruolo errato per questa route
        next();
      });

      const res = await request(app)
        .post('/api/v1/partners/coupons')
        .send({
          title: 'Intrusione Catalogo',
          pointsCost: 50
        });

      expect(res.status).toBe(403);
    });
  });
});