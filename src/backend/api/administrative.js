// API Administrative

const express = require('express');
const { ObjectId } = require('mongodb');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { generatePassword } = require('../utils/password');
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

//put new volunteer -> admin
router.put("/admin", async(req, res) => {
  
})

//post new partner
router.post("/partner", async (req, res) => {
  try {
    const { legalForm, email } = req.body;

    if (!legalForm || !email) {
      return res.status(400).json({ error: "Tutti i campi obbligatori devono essere compilati" });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    // Controlla se l'utente esiste già
    const existingUser = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "Questa email è già registrata" });
    }

    

    // Generate a secure random password for the new partner and hash it
    const password = generatePassword(12);
    const hashedPassword = await bcrypt.hash(password, 10);

    const newPartner = {
      legalForm,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: "",
      address: "",
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newPartner);

    // Genera token di sessione per loggare automaticamente l'utente registrato
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email: newPartner.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Registrazione completata con successo!",
      token,
      user: {
        id: result.insertedId.toString(),
        legalForm: newPartner.legalForm,
        email: newPartner.email 
      }
    });
  } catch (error) {
    console.error("Errore registrazione:", error);
    res.status(500).json({ error: "Errore interno durante la registrazione" });
  }
});