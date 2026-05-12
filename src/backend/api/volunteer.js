const express = require("express");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// Proteggi tutte le rotte di questo router con l'authMiddleware
router.use(authMiddleware);

// Verifica che il ruolo dell'utente autenticato sia 'volunteer'
router.use((req, res, next) => {
  if (req.user.role !== "volunteer") {
    return res.status(403).json({ error: "Accesso negato: richiesto ruolo Volontario" });
  }
  next();
});

// 1. GET Profilo
router.get("/profile", async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Profilo volontario non trovato" });
    }
    res.json(volunteer);
  } catch (error) {
    console.error("Errore GET /profile:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 2. PUT Profilo
router.put("/profile", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, surname, address, phone, skills, age, license, gender } = req.body;

    // Validazione: Età >= 18
    if (age !== undefined && age !== null && age !== "") {
      const parsedAge = parseInt(age);
      if (!isNaN(parsedAge) && parsedAge < 18) {
        return res.status(400).json({ error: "Un volontario deve essere maggiorenne (Età >= 18)!" });
      }
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const updateData = {
      name,
      surname,
      address,
      phone,
      skills: Array.isArray(skills) ? skills : [],
      license: license || "",
      gender: gender || "",
      updatedAt: new Date()
    };

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId), role: "volunteer" },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Profilo non trovato o non autorizzato" });
    }

    res.json({ message: "Profilo aggiornato con successo" });
  } catch (error) {
    console.error("Errore PUT /profile:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 3. GET Richieste attive (Bacheca)
router.get("/requests", async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user.userId;

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    let skillsFilter = null;
    if (userId) {
      const volunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
      if (volunteer && volunteer.skills) {
        skillsFilter = volunteer.skills;
      } else {
        skillsFilter = [];
      }
    }

    // Cerchiamo le richieste nello stato "In Attesa di Volontario"
    const query = { status: "In Attesa di Volontario" };

    if (skillsFilter) {
      query.category = { $in: skillsFilter };
    }

    if (category && category !== "Tutti i servizi") {
      if (!skillsFilter || skillsFilter.includes(category)) {
        query.category = category;
      }
    }

    const requests = await db.collection("requests").find(query).sort({ createdAt: -1 }).toArray();
    res.json(requests);
  } catch (error) {
    console.error("Errore GET /requests:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 4. GET Incarichi Assegnati
router.get("/my-tasks", async (req, res) => {
  try {
    const userId = req.user.userId;

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    // Cerchiamo gli incarichi nello stato "In Corso"
    const tasks = await db.collection("requests").find({
      volunteerId: volunteer._id.toString(),
      status: "In Corso"
    }).sort({ createdAt: -1 }).toArray();

    res.json(tasks);
  } catch (error) {
    console.error("Errore GET /my-tasks:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 5. POST Accetta Richiesta
router.post("/requests/:id/accept", async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.userId;

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    const result = await db.collection("requests").updateOne(
      { _id: new ObjectId(requestId), status: "In Attesa di Volontario" },
      { $set: { status: "In Corso", volunteerId: volunteer._id.toString() } }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "Richiesta non disponibile o già assegnata" });
    }

    res.json({ message: "Richiesta presa in carico con successo!" });
  } catch (error) {
    console.error("Errore POST /requests/:id/accept:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 6. POST Annulla Presa in Carico
router.post("/requests/:id/cancel", async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.userId;

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    const request = await db.collection("requests").findOne({
      _id: new ObjectId(requestId),
      volunteerId: volunteer._id.toString(),
      status: "In Corso"
    });

    if (!request) {
      return res.status(404).json({ error: "Incarico non trovato o non valido" });
    }

    // Resetta lo status e rimuovi il volunteerId
    await db.collection("requests").updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: "In Attesa di Volontario", volunteerId: null } }
    );

    res.json({
      message: "Presa in carico annullata con successo. La richiesta è di nuovo disponibile in bacheca."
    });
  } catch (error) {
    console.error("Errore POST /requests/:id/cancel:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 7. POST Riscatta Coupon
router.post("/coupons/redeem", async (req, res) => {
  try {
    const { couponName, costoPunti } = req.body;
    const userId = req.user.userId;

    if (!couponName || !costoPunti) {
      return res.status(400).json({ error: "Parametri couponName e costoPunti obbligatori" });
    }

    const pointsToDeduct = parseInt(costoPunti);
    if (isNaN(pointsToDeduct) || pointsToDeduct <= 0) {
      return res.status(400).json({ error: "Punti non validi" });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    // Controlla sufficienza punti
    const currentPoints = parseInt(volunteer.points || 0);
    if (currentPoints < pointsToDeduct) {
      return res.status(400).json({ error: "Punti insufficienti per riscattare questo coupon!" });
    }

    const newPoints = currentPoints - pointsToDeduct;
    const newCoupon = {
      name: couponName,
      cost: pointsToDeduct,
      code: "TC-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      acquiredAt: new Date()
    };

    // Salva deduzione punti e aggiungi coupon nel DB
    await db.collection("users").updateOne(
      { _id: volunteer._id },
      { 
        $set: { points: newPoints },
        $push: { coupons: newCoupon }
      }
    );

    res.json({
      message: `Coupon "${couponName}" riscattato con successo!`,
      newPoints: newPoints
    });
  } catch (error) {
    console.error("Errore POST /coupons/redeem:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// API per eliminare definitivamente il profilo del volontario.
router.delete('/profile', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });
    const userId = req.user.userId;

    // GDPR: Se ci sono richieste "In Corso" accettate da questo volontario,
    // resettale allo stato "In Attesa di Volontario" in modo che tornino visibili in bacheca
    await db.collection('requests').updateMany(
      { volunteerId: userId, status: 'In Corso' },
      { $set: { status: 'In Attesa di Volontario', volunteerId: null } }
    );

    // Per tutte le altre richieste (completate, annullate), rimuoviamo semplicemente il volunteerId per anonimizzazione
    await db.collection('requests').updateMany(
      { volunteerId: userId },
      { $set: { volunteerId: null } }
    );

    // Elimina l'utente dal database
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Profilo non trovato' });
    }

    res.json({ message: 'Profilo eliminato definitivamente e contributi sbloccati/anonimizzati con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
