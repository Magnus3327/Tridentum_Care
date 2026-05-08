const express = require('express');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servi i file statici del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Configurazione base per le API (stubs per ora)
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'API funzionante' });
});

module.exports = app;
