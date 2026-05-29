const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");
const { SERVICES, ROLES, AUTH_LVL } = require("../../config/constants");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "tridentum_care_secret_key_123";

// 1. REGISTRAZIONE
router.post("/register", async (req, res) => {
  try {
    const { name, surname, email, password, role, age, gender, license } = req.body;

    if (!name || !surname || !email || !password || !role) {
      return res.status(400).json({ error: "Tutti i campi obbligatori devono essere compilati" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: "La password non soddisfa i requisiti: minimo 8 caratteri, una maiuscola, un numero e un simbolo." });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    // Controlla se l'utente esiste già
    const existingUser = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "Questa email è già registrata" });
    }

    // Validazione specifica per il Volontario
    let volunteerData = {};
    if (role === ROLES.VOLUNTEER) {
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 18) {
        return res.status(400).json({ error: "Un volontario deve essere maggiorenne (Età >= 18)!" });
      }
      volunteerData = {
        age: parsedAge,
        gender: gender || "",
        license: license || "No",
        authLvl: AUTH_LVL.UNAUTHORIZED,
        points: 0,
        skills: [...SERVICES], // tutte le competenze attive di default, clonate dalle costanti
        coupons: []
      };
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      surname,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      phone: "",
      address: "",
      createdAt: new Date(),
      ...volunteerData
    };

    const result = await db.collection("users").insertOne(newUser);

    // Genera token di sessione per loggare automaticamente l'utente registrato
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Registrazione completata con successo!",
      token,
      user: {
        id: result.insertedId.toString(),
        name: newUser.name,
        surname: newUser.surname,
        email: newUser.email,
        role: newUser.role,
        points: newUser.points,
        authLvl: typeof newUser.authLvl === 'number' ? newUser.authLvl : undefined
      }
    });
  } catch (error) {
    console.error("Errore registrazione:", error);
    res.status(500).json({ error: "Errore interno durante la registrazione" });
  }
});

// 2. LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Inserisci email e password" });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const user = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Se l'utente non ha una password nel database (ad es. se è un utente fittizio del seed vecchio),
    // permettiamo di impostarla al primo login, o forziamo l'aggiornamento.
    // Ma con il nuovo seed, tutti avranno la password.
    if (!user.password) {
      return res.status(401).json({ error: "Password non impostata per questo utente. Esegui il seeding del DB o registrati." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }

    // Genera token JWT
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Accesso effettuato con successo!",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        points: user.points,
        authLvl: typeof user.authLvl === 'number' ? user.authLvl : undefined
      }
    });
  } catch (error) {
    console.error("Errore login:", error);
    res.status(500).json({ error: "Errore interno del server durante l'accesso" });
  }
});

// 3. RECUPERO INFORMAZIONI SESSIONE CORRENTE
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: user.role,
      points: user.points || 0,
      authLvl: typeof user.authLvl === 'number' ? user.authLvl : undefined
    });
  } catch (error) {
    console.error("Errore recupero sessione:", error);
    res.status(500).json({ error: "Errore nel recupero della sessione" });
  }
});

module.exports = router;
