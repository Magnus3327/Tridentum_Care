const express = require('express');
const path = require('path');
const connectDB = require('../config/db');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const authRouter = require('./api/auth');
const volunteerRouter = require('./api/volunteer');
const requesterRouter = require('./api/requester');
const administrativeRouter = require('./api/administrative');
const partnerRouter = require('./api/partner');
const requestsRouter = require('./api/requests');

const app = express();

// Carica il documento Swagger
const swaggerDocument = YAML.load(path.join(__dirname, '../../swagger.yaml'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Registrazione dei router API
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/volunteers', volunteerRouter);
app.use('/api/v1/requesters', requesterRouter);
app.use('/api/v1/administrators', administrativeRouter);
app.use('/api/v1/partners', partnerRouter);
app.use('/api/v1/requests', requestsRouter);

// Configurazione base per le API
const { SERVICES, ROLES, REQUEST_STATUS, AUTH_LVL, DEFAULT_POINTS } = require('../config/constants');

app.get('/api/v1/system-status', (req, res) => {
    res.json({ status: 'ok', message: 'API funzionante' });
});

app.get('/api/v1/constants', (req, res) => {
    res.json({ SERVICES, ROLES, REQUEST_STATUS, AUTH_LVL, DEFAULT_POINTS });
});

module.exports = app;
