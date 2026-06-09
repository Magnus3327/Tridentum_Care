// 1. Mock preventivo del Database con il percorso corretto per evitare handles asincroni residui
jest.mock('../../config/db', () => jest.fn().mockResolvedValue({
  collection: jest.fn().mockReturnThis()
}));

const request = require('supertest');
const app = require('../app'); 

describe('--- Test Suite: User Story 1 - Panoramica ed Endpoint Pubblici ---', () => {

  test('TC-1: Un utente non autenticato può accedere alle costanti generali per l\'overview della homepage', async () => {
    const res = await request(app)
      .get('/api/v1/constants')
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('SERVICES');
    expect(res.body).toHaveProperty('ROLES');
    expect(res.body).toHaveProperty('REQUEST_STATUS');
    expect(res.body).toHaveProperty('AUTH_LVL');
  });

  test('TC-2: Il server risponde correttamente per lo stato del sistema senza richiedere token di sessione', async () => {
    const res = await request(app)
      .get('/api/v1/system-status')
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('message', 'API funzionante');
  });
});