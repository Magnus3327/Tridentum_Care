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
    
    test('TC-3: Registrazione con dati validi come Volontario', async () => {
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

    test('TC-3: Registrazione con dati validi come Richiedente', async () => {
      mockDb.findOne.mockResolvedValueOnce(null);
      mockDb.insertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

      const res = await request(app)
        .post('/api/v1/auth/registrations')
        .send({
          name: 'Mario',
          surname: 'Rossi',
          email: 'mario@gmail.com',
          password: 'Password1!',
          role: 'richiedente',
          age: 25,
          gender: 'M',
          gdprConsent: true
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Registrazione completata con successo!');
    });

    test('TC-5: Rifiuta registrazione se l\'email è già registrata', async () => {
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

    test('TC-6: Rifiuta la registrazione se l\'email non è in un formato valido', async () => {
      const res = await request(app)
        .post('/api/v1/auth/registrations')
        .send({
          name: 'Mario',
          surname: 'Rossi',
          email: 'mario/gmail.com', // Formato email errato
          password: 'Password1!',
          role: 'volunteer',
          age: 25,
          gdprConsent: true
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email non valida');
    });

    test('TC-7: Rifiuta la registrazione se il campo anagrafico (nome/cognome) è assente o vuoto', async () => {
      const res = await request(app)
        .post('/api/v1/auth/registrations')
        .send({
          name: '', // Campo vuoto
          surname: 'Rossi',
          email: 'mario@gmail.com',
          password: 'Password1!',
          role: 'volunteer',
          age: 25,
          gdprConsent: true
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Tutti i campi obbligatori devono essere compilati');
    });

    test('TC-8: Errore se la password non rispetta i vincoli di complessità', async () => {
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

    test('TC-9: Blocco della registrazione se non viene confermato il tickbox GDPR', async () => {
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
  });

  test('TC-3: Registrazione con età < 18', async () => {
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
          age: 17,
          gender: 'M',
          license: 'No',
          gdprConsent: true
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Un volontario deve essere maggiorenne (Età >= 18)!');
    });

  // US3 - LOGIN 
  
  describe('POST /api/v1/auth/sessions [US3]', () => {

    test('TC-11: Login con credenziali corrette (Volontario)', async () => {
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

    test('TC-12: Login con credenziali corrette (Richiedente)', async () => {
      const userId = new ObjectId();
      bcrypt.compare.mockResolvedValueOnce(true);
      mockDb.findOne.mockResolvedValueOnce({
        _id: userId,
        email: 'mario@gmail.com',
        password: 'hashed_password_mock',
        role: 'requester',
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
      expect(res.body.user).toHaveProperty('role', 'requester');
      expect(res.body).toHaveProperty('token'); 
    });

    test('TC-13: Login fallito per password errata', async () => {
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

    test('TC-14: Login fallito per email non registrata', async () => {
      mockDb.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/sessions')
        .send({
          email: 'nonregistrata@gmail.com',
          password: 'Password1!'
        });

      expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error', 'Credenziali non valide');
    });

    test('TC-15: Login fallito se i campi sono vuoti', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sessions')
        .send({
          email: '',
          password: ''
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Inserisci email e password');
    });

    test('TC-16: Rifiuta l\'accesso ai dati protetti se l\'utente non ha una sessione attiva', async () => {
      // Sovrascriviamo temporaneamente il middleware simulando l'assenza di token/utente loggato
      authMiddleware.mockImplementationOnce((req, res, next) => {
        return res.status(401).json({ error: 'Accesso negato: token mancante o non valido' });
      });

      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Accesso negato: token mancante o non valido');
    });
  });

  // US5 - LOGOUT

  describe('POST /api/v1/auth/logout [US5]', () => {

    test('TC-17: Logout della sessione corrente', async () => {
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'volunteer' };
        next();
      });

      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Logout effettuato con successo');
    });
  
    test('TC-18: Verifica che dopo il logout la rotta protetta risponda correttamente con errore', async () => {
      // 1. Esegui il logout
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { userId: new ObjectId().toString(), role: 'volunteer' };
        next();
      });
      await request(app).post('/api/v1/auth/logout');

      // 2. Subito dopo, prova ad accedere senza credenziali
      authMiddleware.mockImplementationOnce((req, res, next) => {
        return res.status(401).json({ error: 'Token non valido o sessione scaduta' });
      });

      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });
  // US4 - SESSIONE CORRENTE

  describe('GET /api/v1/auth/me [US4]', () => {

    test('TC-19/20: Recupera i dati della sessione corrente', async () => {
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

});