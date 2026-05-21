// API Administrative

const express = require('express');
const { ObjectId } = require('mongodb');
const authMiddleware = require('../middleware/auth');
const { SERVICE_POINTS, ROLES, AUTH_LVL } = require('../../config/constants');

const router = express.Router();

router.use(authMiddleware);

// Allow only system admins OR volunteers with elevated authLvl (AUTH_LVL.ADMIN)
router.use(async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: 'Database non connesso' });

    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    // System role admin always allowed
    if (user.role === ROLES.ADMIN) return next();

    // Volunteers with authLvl >= ADMIN are allowed to access administrative routes
    if (user.role === ROLES.VOLUNTEER && typeof user.authLvl === 'number' && user.authLvl >= AUTH_LVL.ADMIN) {
      return next();
    }

    return res.status(403).json({ error: 'Accesso negato: permessi insufficienti' });
  } catch (err) {
    console.error('Errore middleware amministrativo:', err);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});