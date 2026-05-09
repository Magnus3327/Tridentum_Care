const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

// 1. GET Profile
router.get("/profile", async (req, res) => {
  try {
    const email = req.query.email || "mario.rossi@email.it";
    
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ email, role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Profilo volontario non trovato" });
    }
    res.json(volunteer);
  } catch (error) {
    console.error("Errore GET /profile:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 2. PUT Profile
router.put("/profile", async (req, res) => {
  try {
    const { email, name, surname, address, phone, skills, age, license, gender } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email richiesta per aggiornare il profilo" });
    }

    // OCL Constraint validation: age >= 18
    if (age !== undefined && age !== null && age !== "") {
      const parsedAge = parseInt(age);
      if (!isNaN(parsedAge) && parsedAge < 18) {
        return res.status(400).json({ error: "Vincolo OCL: Un volontario deve essere maggiorenne (Età >= 18)!" });
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
      { email, role: "volunteer" },
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

// 3. GET Active Requests (Bacheca)
router.get("/requests", async (req, res) => {
  try {
    const { category, email } = req.query;

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    let skillsFilter = null;
    if (email) {
      const volunteer = await db.collection("users").findOne({ email, role: "volunteer" });
      if (volunteer && volunteer.skills) {
        skillsFilter = volunteer.skills;
      } else {
        skillsFilter = [];
      }
    }

    const query = { status: "active" };

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

// 4. GET Assigned Tasks
router.get("/my-tasks", async (req, res) => {
  try {
    const email = req.query.email || "mario.rossi@email.it";

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ email, role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    const tasks = await db.collection("requests").find({
      volunteerId: volunteer._id.toString(),
      status: "assigned"
    }).sort({ createdAt: -1 }).toArray();

    res.json(tasks);
  } catch (error) {
    console.error("Errore GET /my-tasks:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 5. POST Accept Request
router.post("/requests/:id/accept", async (req, res) => {
  try {
    const requestId = req.params.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email del volontario richiesta" });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ email, role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    const result = await db.collection("requests").updateOne(
      { _id: new ObjectId(requestId), status: "active" },
      { $set: { status: "assigned", volunteerId: volunteer._id.toString() } }
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

// 6. POST Cancel Request (Annulla presa in carico)
router.post("/requests/:id/cancel", async (req, res) => {
  try {
    const requestId = req.params.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email del volontario richiesta" });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ email, role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    const request = await db.collection("requests").findOne({
      _id: new ObjectId(requestId),
      volunteerId: volunteer._id.toString(),
      status: "assigned"
    });

    if (!request) {
      return res.status(404).json({ error: "Incarico non trovato o non valido" });
    }

    // Reset status and remove volunteerId
    await db.collection("requests").updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: "active", volunteerId: null } }
    );

    res.json({
      message: "Presa in carico annullata con successo. La richiesta è di nuovo disponibile in bacheca."
    });
  } catch (error) {
    console.error("Errore POST /requests/:id/cancel:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 7. POST Redeem Coupon (Riscatto Coupon con addebito punti)
router.post("/coupons/redeem", async (req, res) => {
  try {
    const { email, couponName, costoPunti } = req.body;

    if (!email || !couponName || !costoPunti) {
      return res.status(400).json({ error: "Parametri email, couponName e costoPunti obbligatori" });
    }

    const pointsToDeduct = parseInt(costoPunti);
    if (isNaN(pointsToDeduct) || pointsToDeduct <= 0) {
      return res.status(400).json({ error: "Punti non validi" });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: "Database non connesso" });

    const volunteer = await db.collection("users").findOne({ email, role: "volunteer" });
    if (!volunteer) {
      return res.status(404).json({ error: "Volontario non trovato" });
    }

    // OCL Constraint: check points sufficiency
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

    // Save points deduction and add coupon in DB
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

module.exports = router;
