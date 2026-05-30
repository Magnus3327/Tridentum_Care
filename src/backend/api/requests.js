const express = require("express");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");
const { AUTH_LVL } = require("../../config/constants");
const router = express.Router();

router.use(authMiddleware);

// Verifica che il ruolo dell'utente autenticato sia 'volunteer'
router.use((req, res, next) => {
  if (req.user.role !== "volunteer") {
    return res.status(403).json({ error: "Accesso negato: richiesto ruolo Volontario" });
  }
  next();
});

// GET Richieste attive (Bacheca)
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user.userId;

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    let skillsFilter = null;
    if (userId) {
      const volunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
      if (volunteer) {
        if (volunteer.authLvl >= AUTH_LVL.MODERATOR) {
          skillsFilter = null;
        } else if (volunteer.skills && volunteer.skills.length > 0) {
          skillsFilter = volunteer.skills;
        } else {
          skillsFilter = [];
        }
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

// POST Accetta Richiesta
router.post("/:id/assignments", async (req, res) => {
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
    console.error("Errore POST /requests/:id/assignments:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// DELETE Annulla Presa in Carico
router.delete("/:id/assignments", async (req, res) => {
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
    console.error("Errore DELETE /requests/:id/assignments:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

module.exports = router;
