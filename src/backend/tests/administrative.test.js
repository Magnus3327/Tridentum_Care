const request = require('supertest');
const express = require('express');
const { ObjectId } = require('mongodb');
const administrativeRouter = require('../api/administrative');
const { ROLES, AUTH_LVL } = require('../../config/constants');

// Mocking di bcryptjs per evitare computazioni pesanti durante i test
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_mock')
}));

// Mocking del middleware di autenticazione per simulare la decodifica del token JWT
jest.mock('../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    const testUserId = req.headers['x-test-user-id'];
    const testUserRole = req.headers['x-test-user-role'];
    if (testUserId || testUserRole) {
      req.user = {
        userId: testUserId,
        role: testUserRole
      };
      next();
    } else {
      return res.status(401).json({ error: 'Accesso negato: token mancante o non valido' });
    }
  });
});

describe('Test Suite EX: Admin e Moderazione', () => {
  let app;
  let mockDb;
  let adminId;
  let moderatorId;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    adminId = new ObjectId().toString();
    moderatorId = new ObjectId().toString();

    // Configurazione mock del database MongoDB
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      insertOne: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn()
    };
    app.locals.db = mockDb;

    app.use('/api/v1/admin', administrativeRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Middleware amministrativo e controllo permessi di accesso delle rotte
  describe('Middleware di verifica privilegi amministrativi', () => {
    test('Rifiuta l\'accesso se l\'utente non ha un livello di autorizzazione sufficiente (< MODERATOR)', async () => {
      // Configura il mock per trovare l'utente che effettua l'azione ma senza privilegi (authLvl = 0)
      mockDb.findOne.mockResolvedValueOnce({
        _id: new ObjectId(moderatorId),
        authLvl: AUTH_LVL.UNAUTHORIZED // Livello base / volontario
      });

      const res = await request(app)
        .get('/api/v1/admin/requests')
        .set('x-test-user-id', moderatorId)
        .set('x-test-user-role', 'volunteer');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Accesso negato: permessi insufficienti');
    });
  });

  // Test: Modifica Permessi / Promozione e Retrocessione Volontari
  describe('PUT /api/v1/admin/users/:userId/roles/administrator', () => {
    test('Promozione con successo di un volontario a moderatore da parte di un Admin', async () => {
      const targetVolunteerId = new ObjectId();

      // 1. getAdminUser: Trova l'utente attore (Amministratore)
      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(adminId), authLvl: AUTH_LVL.ADMIN });
      // 2. getTargetUser: Trova l'utente target (Volontario)
      mockDb.findOne.mockResolvedValueOnce({ _id: targetVolunteerId, role: ROLES.VOLUNTEER, authLvl: AUTH_LVL.UNAUTHORIZED });
      // 3. updateOne dell'operazione di aggiornamento (mock successo)
      mockDb.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });
      // 4. findOne finale per restituire l'utente aggiornato
      mockDb.findOne.mockResolvedValueOnce({ _id: targetVolunteerId, role: ROLES.VOLUNTEER, authLvl: AUTH_LVL.MODERATOR });

      const res = await request(app)
        .put(`/api/v1/admin/users/${targetVolunteerId.toString()}/roles/administrator`)
        .set('x-test-user-id', adminId)
        .set('x-test-user-role', 'admin')
        .send({ targetLevel: AUTH_LVL.MODERATOR });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('promosso a moderatore');
      expect(res.body.user).toHaveProperty('authLvl', AUTH_LVL.MODERATOR);
    });

    test('Rifiuta se l\'attore ha privilegi inferiori ad ADMIN (es. Moderatore)', async () => {
      const targetVolunteerId = new ObjectId().toString();

      // getAdminUser: Trova l'attore che è solo un moderatore
      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(moderatorId), authLvl: AUTH_LVL.MODERATOR });

      const res = await request(app)
        .put(`/api/v1/admin/users/${targetVolunteerId}/roles/administrator`)
        .set('x-test-user-id', moderatorId)
        .set('x-test-user-role', 'volunteer')
        .send({ targetLevel: AUTH_LVL.ADMIN });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Accesso negato: permessi insufficienti per modificare i permessi di un utente');
    });

    test('Rifiuta se il target non ha il ruolo di volontario', async () => {
      const targetRequesterId = new ObjectId();

      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(adminId), authLvl: AUTH_LVL.ADMIN });
      mockDb.findOne.mockResolvedValueOnce({ _id: targetRequesterId, role: ROLES.REQUESTER }); // Ruolo errato

      const res = await request(app)
        .put(`/api/v1/admin/users/${targetRequesterId.toString()}/roles/administrator`)
        .set('x-test-user-id', adminId)
        .set('x-test-user-role', 'admin')
        .send({ targetLevel: AUTH_LVL.ADMIN });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Puoi modificare i permessi solo agli utenti con ruolo volontario');
    });
  });

  // Test: Creazione Account Partner Aziendali
  describe('POST /api/v1/admin/partners', () => {
    test('Creazione con successo di un nuovo utente Partner', async () => {
      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(adminId), authLvl: AUTH_LVL.ADMIN }); // Attore
      mockDb.findOne.mockResolvedValueOnce(null); // Nessun utente esistente con quella email
      mockDb.insertOne.mockResolvedValueOnce({ insertedId: new ObjectId() });

      const res = await request(app)
        .post('/api/v1/admin/partners')
        .set('x-test-user-id', adminId)
        .set('x-test-user-role', 'admin')
        .send({
          email: 'azienda.test@partner.com',
          companyName: 'Test Corporation S.r.l.'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Partner creato con successo');
      expect(res.body).toHaveProperty('newPassword');
      expect(res.body.user).toHaveProperty('role', ROLES.PARTNER);
    });

    test('Rifiuta la creazione se l\'email è già registrata', async () => {
      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(adminId), authLvl: AUTH_LVL.ADMIN });
      mockDb.findOne.mockResolvedValueOnce({ email: 'azienda.test@partner.com' }); // Email esistente

      const res = await request(app)
        .post('/api/v1/admin/partners')
        .set('x-test-user-id', adminId)
        .set('x-test-user-role', 'admin')
        .send({
          email: 'azienda.test@partner.com',
          companyName: 'Test Corporation S.r.l.'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Questa email è già registrata');
    });
  });

  // Test: Sospensione e Riattivazione Utenti
  describe('Sospensioni (PUT & DELETE /api/v1/admin/users/:userId/suspensions)', () => {
    test('Sospensione (primo richiamo) applica un blocco di 12 ore', async () => {
      const targetUserId = new ObjectId();

      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(adminId), authLvl: AUTH_LVL.ADMIN }); // Attore
      mockDb.findOne.mockResolvedValueOnce({ _id: targetUserId, authLvl: AUTH_LVL.UNAUTHORIZED, suspensionCount: 0 }); // Target

      const res = await request(app)
        .put(`/api/v1/admin/users/${targetUserId.toString()}/suspensions`)
        .set('x-test-user-id', adminId)
        .set('x-test-user-role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('sospeso con successo per 12 ore');
      expect(mockDb.updateOne).toHaveBeenCalledWith(
        { _id: targetUserId },
        expect.objectContaining({
          $set: expect.objectContaining({
            isSuspended: true,
            suspensionCount: 1
          })
        })
      );
    });

    test('Riattivazione (restore) rimuove lo stato di sospensione', async () => {
      const targetUserId = new ObjectId();

      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(adminId), authLvl: AUTH_LVL.ADMIN }); // Attore
      mockDb.findOne.mockResolvedValueOnce({ _id: targetUserId, authLvl: AUTH_LVL.UNAUTHORIZED, isSuspended: true }); // Target
      mockDb.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      const res = await request(app)
        .delete(`/api/v1/admin/users/${targetUserId.toString()}/suspensions`)
        .set('x-test-user-id', adminId)
        .set('x-test-user-role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Utente riattivato con successo');
    });
  });

  // Test: Eliminazione Logica/Fisica dell'Utente e cascate correlate
  describe('DELETE /api/v1/admin/users/:userId', () => {
    test('Eliminazione di un richiedente rimuove a cascata le sue richieste di assistenza', async () => {
      const targetRequesterId = new ObjectId();

      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(adminId), authLvl: AUTH_LVL.ADMIN }); // Attore
      mockDb.findOne.mockResolvedValueOnce({ _id: targetRequesterId, role: ROLES.REQUESTER, authLvl: AUTH_LVL.UNAUTHORIZED }); // Target
      mockDb.deleteMany.mockResolvedValueOnce({ deletedCount: 3 }); // Cascata richieste
      mockDb.deleteOne.mockResolvedValueOnce({ deletedCount: 1 }); // Delete utente

      const res = await request(app)
        .delete(`/api/v1/admin/users/${targetRequesterId.toString()}`)
        .set('x-test-user-id', adminId)
        .set('x-test-user-role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Utente eliminato con successo');
      expect(mockDb.deleteMany).toHaveBeenCalledWith({ userId: targetRequesterId });
    });

    test('Impedisce l\'eliminazione se il target ha privilegi pari o superiori (es. Admin vs Admin)', async () => {
      const anotherAdminId = new ObjectId();

      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(adminId), authLvl: AUTH_LVL.ADMIN }); // Attore
      mockDb.findOne.mockResolvedValueOnce({ _id: anotherAdminId, role: ROLES.VOLUNTEER, authLvl: AUTH_LVL.ADMIN }); // Target con pari livello

      const res = await request(app)
        .delete(`/api/v1/admin/users/${anotherAdminId.toString()}`)
        .set('x-test-user-id', adminId)
        .set('x-test-user-role', 'admin');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Puoi eliminare solo utenti con privilegi inferiori ai tuoi');
    });
  });

  // Test: Gestione e moderazione delle richieste di assistenza
  describe('DELETE /api/v1/admin/requests/:requestId', () => {
    test('Eliminazione di una singola richiesta da parte di un Amministratore o Moderatore', async () => {
      const requestId = new ObjectId();

      mockDb.findOne.mockResolvedValueOnce({ _id: new ObjectId(moderatorId), authLvl: AUTH_LVL.MODERATOR }); // Attore (Mod valido)
      mockDb.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/api/v1/admin/requests/${requestId.toString()}`)
        .set('x-test-user-id', moderatorId)
        .set('x-test-user-role', 'volunteer');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Richiesta eliminata con successo');
    });
  });
});