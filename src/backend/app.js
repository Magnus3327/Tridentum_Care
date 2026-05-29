const express = require('express');
const path = require('path');
const connectDB = require('../config/db');

const authRouter = require('./api/auth');
const volunteerRouter = require('./api/volunteer');
const requesterRouter = require('./api/requester');
const administrativeRouter = require('./api/administrative');
const partnerRouter = require('./api/partner');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connessione asincrona al Database
connectDB()
  .then(async (db) => {
    app.locals.db = db;

  })
  .catch((err) => {
    console.error("Inizializzazione database fallita:", err);
  });

// Servi i file statici del frontend
app.use(express.static(path.join(__dirname, '../frontend')));


// Registrazione dei router API
app.use('/api/auth', authRouter);
app.use('/api/volunteer', volunteerRouter);
app.use('/api/requester', requesterRouter);
app.use('/api/administrative', administrativeRouter);
app.use('/api/admin', administrativeRouter);
app.use('/api/partner', partnerRouter);

// Configurazione base per le API
const { SERVICES, ROLES, REQUEST_STATUS, AUTH_LVL, DEFAULT_POINTS } = require('../config/constants');

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'API funzionante' });
});

app.get('/api/constants', (req, res) => {
    res.json({ SERVICES, ROLES, REQUEST_STATUS, AUTH_LVL, DEFAULT_POINTS });
});

module.exports = app;
