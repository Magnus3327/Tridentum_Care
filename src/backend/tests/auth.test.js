const request = require('supertest');
const express = require('express');
const { ObjectId } = require('mongodb');
const authRouter = require('../api/auth');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcryptjs');

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_mock'),
  compare: jest.fn().mockImplementation((plain, hashed) => {
    return Promise.resolve(plain === 'Password1!' && hashed === 'hashed_password_mock');
  })
}));

jest.mock('../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    next();
  });
});

describe('--- Test Suite: Autenticazione e Registrazione (Auth) ---', () => {
  let app;
  let mockDb;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      const testUserId = req.headers['x-test-user-id'];
      const testUserRole = req.headers['x-test-user-role'];
      if (testUserId || testUserRole) {
        req.user = {
          userId: testUserId,
          role: testUserRole
        };
      }
      next();
    });

    // Configurazione mock del Database
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      insertOne: jest.fn()
    };
    app.locals.db = mockDb;

    // Agganciamo il router sotto il path reale
    app.use('/api/v1/auth', authRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // US2 - REGISTRAZIONE
 
  describe('POST /api/v1/auth/registrations [US2]', () => {
    
    test('TC-2.1 (o TC-3): Registrazione con dati validi come Volontario', async () => {
      mockDb.findOne.mockResolvedValueOnce(null);
      mockDb.insertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

      const res = await request(app)
        .post('/api/v1/auth/registrations')
        .send({
          name: 'Mario',
          surname: 'Rossi',
          email: 'mario@gmail.com',
          password: 'Password1!',
          role: 'volunteer',
          age: 25,
          gender: 'M',
          license: 'No',
          gdprConsent: true
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Registrazione completata con successo!');
    });

    test('TC-2.4: Blocco della registrazione se non viene confermato il tickbox GDPR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/registrations')
        .send({
          name: 'Mario',
          surname: 'Rossi',
          email: 'mario@gmail.com',
          password: 'Password1!',
          role: 'volunteer',
          age: 25,
          gdprConsent: false
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Devi accettare di aver letto la Privacy Policy e i Termini di Servizio.');
    });

    test('TC-2.2 (o TC-5): Rifiuta registrazione se l\'email è già registrata', async () => {
      mockDb.findOne.mockResolvedValueOnce({ email: 'mario@gmail.com' });

      const res = await request(app)
        .post('/api/v1/auth/registrations')
        .send({
          name: 'Mario',
          surname: 'Rossi',
          email: 'mario@gmail.com',
          password: 'Password1!',
          role: 'volunteer',
          age: 25,
          gdprConsent: true
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Questa email è già registrata');
    });

    test('TC-2.3 (o TC-8): Errore se la password non rispetta i vincoli di complessità', async () => {
      const res = await request(app)
        .post('/api/v1/auth/registrations')
        .send({
          name: 'Mario',
          surname: 'Rossi',
          email: 'mario@gmail.com',
          password: 'abc', // Troppo corta, senza numeri o maiuscole
          role: 'volunteer',
          age: 25,
          gdprConsent: true
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('La password non soddisfa i requisiti');
    });
  });

  // US3 - LOGIN 
  
  describe('POST /api/v1/auth/sessions [US3]', () => {

    test('TC-3.1 (o TC-11): Login con credenziali corrette (Volontario)', async () => {
      const userId = new ObjectId();
      bcrypt.compare.mockResolvedValueOnce(true);
      mockDb.findOne.mockResolvedValueOnce({
        _id: userId,
        email: 'mario@gmail.com',
        password: 'hashed_password_mock',
        role: 'volunteer',
        username: 'Mario Rossi'
      });

      const res = await request(app)
        .post('/api/v1/auth/sessions')
        .send({
          email: 'mario@gmail.com',
          password: 'Password1!'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Accesso effettuato con successo!');
      expect(res.body.user).toHaveProperty('role', 'volunteer');
      expect(res.body).toHaveProperty('token'); 
    });

    test('TC-3.2 (o TC-13): Login fallito per password errata', async () => {
      mockDb.findOne.mockResolvedValueOnce({
        email: 'mario@gmail.com',
        password: 'hashed_password_mock',
        role: 'volunteer'
      });

      const res = await request(app)
        .post('/api/v1/auth/sessions')
        .send({
          email: 'mario@gmail.com',
          password: 'WrongPassword!' // Sbagliata
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Credenziali non valide');
    });

    test('TC-3.3 (o TC-15): Login fallito se i campi sono vuoti', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sessions')
        .send({
          email: '',
          password: ''
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Inserisci email e password');
    });
  });

  // US4 - SESSIONE CORRENTE

  describe('GET /api/v1/auth/me [US4]', () => {

    test('TC-4.1: Recupera i dati della sessione corrente', async () => {
      const userId = new ObjectId();

      mockDb.findOne.mockResolvedValueOnce({
        _id: userId,
        name: 'Mario',
        surname: 'Rossi',
        email: 'mario@gmail.com',
        role: 'volunteer',
        points: 25,
        authLvl: 1
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('x-test-user-id', userId.toString())
        .set('x-test-user-role', 'volunteer');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('role', 'volunteer');
      expect(res.body).toHaveProperty('email', 'mario@gmail.com');
    });
  });

  // US5 - LOGOUT

  describe('POST /api/v1/auth/logout [US5]', () => {

    test('TC-5.1: Logout della sessione corrente', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'volunteer' };
        next();
      });

      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Logout effettuato con successo');
    });
  });
});