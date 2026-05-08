const express = require('express');
const path = require('path');
const connectDB = require('../config/db');
const seedDatabase = require('../config/seed');
const volunteerRouter = require('./api/volunteer');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connessione Database asincrona
connectDB()
  .then(async (db) => {
    app.locals.db = db;
    // Esegui il seeding del database per popolare dati iniziali se vuoti
    await seedDatabase();
  })
  .catch((err) => {
    console.error("Inizializzazione database fallita:", err);
  });

// Servi i file statici del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Registro i router API
app.use('/api/volunteer', volunteerRouter);

// Configurazione base per le API (stubs per ora)
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'API funzionante' });
});

module.exports = app;
