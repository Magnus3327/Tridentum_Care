const express = require('express');
const path = require('path');
const connectDB = require('../config/db');

const volunteerRouter = require('./api/volunteer');
const requesterRouter = require('./api/requester');

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
app.use('/api/volunteer', volunteerRouter);
app.use('/api/requester', requesterRouter);

// Configurazione base per le API
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'API funzionante' });
});

module.exports = app;
