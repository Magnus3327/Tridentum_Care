const express = require("express");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");
const { AUTH_LVL } = require("../../config/constants");
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
router.get("/me", async (req, res) => {
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
router.put("/me", async (req, res) => {
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

    // Preserve existing volunteer document fields when partial update
    const existingVolunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
    if (!existingVolunteer) {
      return res.status(404).json({ error: "Profilo volontario non trovato" });
    }

    const preservedAuthLvl = (typeof existingVolunteer.authLvl === 'number') ? existingVolunteer.authLvl : AUTH_LVL.UNAUTHORIZED;

    const updateData = {
      name: (name !== undefined) ? name : existingVolunteer.name,
      surname: (surname !== undefined) ? surname : existingVolunteer.surname,
      address: (address !== undefined) ? address : existingVolunteer.address,
      phone: (phone !== undefined) ? phone : existingVolunteer.phone,
      skills: Array.isArray(skills) ? skills : (existingVolunteer.skills || []),
      license: (license !== undefined) ? license : (existingVolunteer.license || ""),
      gender: (gender !== undefined) ? gender : (existingVolunteer.gender || ""),
      updatedAt: new Date(),
      authLvl: preservedAuthLvl
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



// 4. GET Incarichi Assegnati
router.get("/me/tasks", async (req, res) => {
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



// 7. GET /coupons (Store)
router.get("/coupons", async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });
    
    // Mostra solo i coupon non scaduti
    const today = new Date().toISOString().split('T')[0];
    const coupons = await db.collection("coupons").find({ expirationDate: { $gte: today } }).toArray();
    
    // Recupera il nome del partner per ogni coupon
    const couponsWithPartnerName = await Promise.all(coupons.map(async (coupon) => {
      let companyName = "Partner Sconosciuto";
      if (coupon.partnerId) {
        const partner = await db.collection("users").findOne({ _id: new ObjectId(coupon.partnerId) });
        if (partner && partner.companyName) {
          companyName = partner.companyName;
        }
      }
      return { ...coupon, companyName };
    }));
    
    res.json(couponsWithPartnerName);
  } catch (error) {
    console.error("Errore GET /coupons:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 8. POST Riscatta Coupon
router.post("/coupons/redemptions", async (req, res) => {
  try {
    const { couponId } = req.body;
    const userId = req.user.userId;

    if (!couponId) {
      return res.status(400).json({ error: "Parametro couponId obbligatorio" });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ _id: new ObjectId(userId), role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    // Trova il coupon nel database
    const coupon = await db.collection("coupons").findOne({ _id: new ObjectId(couponId) });
    if (!coupon) {
      return res.status(404).json({ error: "Coupon non trovato" });
    }

    const pointsToDeduct = parseInt(coupon.pointsCost);

    // Controlla sufficienza punti
    const currentPoints = parseInt(volunteer.points || 0);
    if (currentPoints < pointsToDeduct) {
      return res.status(400).json({ error: "Punti insufficienti per riscattare questo coupon!" });
    }

    const newPoints = currentPoints - pointsToDeduct;
    const generatedCode = "TC-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    const newCouponForVolunteer = {
      name: coupon.title,
      cost: pointsToDeduct,
      code: generatedCode,
      acquiredAt: new Date()
    };

    // Salva deduzione punti e aggiungi coupon nel DB dell'utente
    await db.collection("users").updateOne(
      { _id: volunteer._id },
      { 
        $set: { points: newPoints },
        $push: { coupons: newCouponForVolunteer }
      }
    );

    // Registra l'acquisto nella collezione coupon_redemptions (per il partner)
    const redemption = {
      couponId: coupon._id,
      volunteerId: volunteer._id,
      volunteerName: `${volunteer.name} ${volunteer.surname}`,
      redeemedCode: generatedCode,
      date: new Date().toISOString(),
      createdAt: new Date()
    };
    await db.collection("coupon_redemptions").insertOne(redemption);

    res.json({
      message: `Coupon "${coupon.title}" riscattato con successo!`,
      newPoints: newPoints
    });
  } catch (error) {
    console.error("Errore POST /coupons/redeem:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// API per eliminare definitivamente il profilo del volontario.
router.delete('/me', async (req, res) => {
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
