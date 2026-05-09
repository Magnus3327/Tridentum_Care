const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

// Stateful In-Memory Fallback Database if MongoDB Atlas connection fails
const memoryDb = {
  users: [
    {
      _id: "mario_rossi_id",
      email: "mario.rossi@email.it",
      name: "Mario",
      surname: "Rossi",
      role: "volunteer",
      address: "Via Roma 1, Trento",
      points: 1250,
      phone: "333 123 4567",
      skills: ["Trasporto", "Accompagnamento", "Compagnia"],
      createdAt: new Date()
    }
  ],
  requests: [
    {
      _id: "req_1",
      title: "Trasporto per visita medica (Mock DB)",
      category: "Trasporto",
      description: "Avrei bisogno di un passaggio per recarmi all'ospedale Santa Chiara per una visita di controllo. Non posso guidare.",
      address: "Via Belenzani 12, Trento",
      dateTime: "Oggi, 17:00",
      requesterName: "Angela Bianchi",
      points: 150,
      status: "active",
      volunteerId: null,
      createdAt: new Date()
    },
    {
      _id: "req_2",
      title: "Accompagnamento al parco (Mock DB)",
      category: "Accompagnamento",
      description: "Cerco qualcuno che possa accompagnarmi a fare una passeggiata al parco vicino casa. Ho bisogno di un braccio a cui appoggiarmi.",
      address: "Piazza Duomo 3, Trento",
      dateTime: "Domani, 10:00",
      requesterName: "Giuseppe N.",
      points: 120,
      status: "active",
      volunteerId: null,
      createdAt: new Date()
    },
    {
      _id: "req_3",
      title: "Compagnia e lettura quotidiano (Mock DB)",
      category: "Compagnia",
      description: "Cerco una persona gentile per fare quattro chiacchiere in giardino nel pomeriggio e leggere insieme le principali notizie del quotidiano locale L'Adige.",
      address: "Via Grazioli 45, Trento",
      dateTime: "Lunedì, 15:30",
      requesterName: "Rosa M.",
      points: 200,
      status: "active",
      volunteerId: null,
      createdAt: new Date()
    },
    {
      _id: "req_4",
      title: "Aiuto configurazione smartphone (Mock DB)",
      category: "Tecnologia",
      description: "Non riesco a configurare l'applicazione della sanità provinciale (TreC+) sul mio nuovo telefono Android. Qualcuno con pazienza saprebbe installarla e spiegarmi come si accede?",
      address: "Viale Verona 18, Trento",
      dateTime: "Sabato, 11:00",
      requesterName: "Luigi T.",
      points: 100,
      status: "active",
      volunteerId: null,
      createdAt: new Date()
    }
  ]
};

// Log helper to print when fallback is active
const useDbFallback = (req) => {
  const db = req.app.locals.db;
  if (!db) {
    console.warn("⚠️ Database non connesso! Utilizzo DB in memoria di fallback.");
    return true;
  }
  return false;
};

// 1. GET Profile
router.get("/profile", async (req, res) => {
  try {
    const email = req.query.email || "mario.rossi@email.it";
    
    if (useDbFallback(req)) {
      let volunteer = memoryDb.users.find(u => u.email === email && u.role === "volunteer");
      if (!volunteer) {
        // Create default volunteer in memory if not exists
        volunteer = {
          _id: "mario_rossi_id",
          email,
          name: "Mario",
          surname: "Rossi",
          role: "volunteer",
          address: "Via Roma 1, Trento",
          points: 1250,
          phone: "333 123 4567",
          skills: ["Trasporto", "Accompagnamento", "Compagnia"],
          createdAt: new Date()
        };
        memoryDb.users.push(volunteer);
      }
      return res.json(volunteer);
    }

    const db = req.app.locals.db;
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

    if (useDbFallback(req)) {
      const idx = memoryDb.users.findIndex(u => u.email === email && u.role === "volunteer");
      if (idx === -1) {
        return res.status(404).json({ error: "Profilo non trovato o non autorizzato" });
      }
      memoryDb.users[idx] = {
        ...memoryDb.users[idx],
        name,
        surname,
        address,
        phone,
        skills: Array.isArray(skills) ? skills : [],
        age: age ? parseInt(age) : null,
        license: license || "",
        gender: gender || "",
        updatedAt: new Date()
      };
      return res.json({ message: "Profilo aggiornato in memoria con successo" });
    }

    const db = req.app.locals.db;
    const updateData = {
      name,
      surname,
      address,
      phone,
      skills: Array.isArray(skills) ? skills : [],
      age: age ? parseInt(age) : null,
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
    const { category } = req.query;

    if (useDbFallback(req)) {
      let filtered = memoryDb.requests.filter(r => r.status === "active");
      if (category && category !== "Tutti i servizi") {
        filtered = filtered.filter(r => r.category === category);
      }
      return res.json(filtered);
    }

    const db = req.app.locals.db;
    const query = { status: "active" };
    if (category && category !== "Tutti i servizi") {
      query.category = category;
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

    if (useDbFallback(req)) {
      const volunteer = memoryDb.users.find(u => u.email === email && u.role === "volunteer");
      if (!volunteer) {
        return res.status(404).json({ error: "Volontario non trovato" });
      }
      const tasks = memoryDb.requests.filter(r => r.volunteerId === volunteer._id && r.status === "assigned");
      return res.json(tasks);
    }

    const db = req.app.locals.db;
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

    if (useDbFallback(req)) {
      const volunteer = memoryDb.users.find(u => u.email === email && u.role === "volunteer");
      if (!volunteer) {
        return res.status(404).json({ error: "Volontario non trovato" });
      }

      const reqIdx = memoryDb.requests.findIndex(r => r._id === requestId && r.status === "active");
      if (reqIdx === -1) {
        return res.status(400).json({ error: "Richiesta non disponibile o già assegnata" });
      }

      memoryDb.requests[reqIdx].status = "assigned";
      memoryDb.requests[reqIdx].volunteerId = volunteer._id;
      return res.json({ message: "Richiesta presa in carico con successo!" });
    }

    const db = req.app.locals.db;
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

    if (useDbFallback(req)) {
      const volunteerIdx = memoryDb.users.findIndex(u => u.email === email && u.role === "volunteer");
      if (volunteerIdx === -1) {
        return res.status(404).json({ error: "Volontario non trovato" });
      }
      const volunteer = memoryDb.users[volunteerIdx];

      const reqIdx = memoryDb.requests.findIndex(r => r._id === requestId && r.volunteerId === volunteer._id && r.status === "assigned");
      if (reqIdx === -1) {
        return res.status(404).json({ error: "Incarico non trovato o non valido" });
      }

      // Revert to active and clear volunteerId
      memoryDb.requests[reqIdx].status = "active";
      memoryDb.requests[reqIdx].volunteerId = null;

      return res.json({
        message: "Presa in carico annullata con successo. La richiesta è di nuovo disponibile in bacheca."
      });
    }

    const db = req.app.locals.db;
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

    if (useDbFallback(req)) {
      const volunteerIdx = memoryDb.users.findIndex(u => u.email === email && u.role === "volunteer");
      if (volunteerIdx === -1) {
        return res.status(404).json({ error: "Volontario non trovato" });
      }
      
      const volunteer = memoryDb.users[volunteerIdx];
      
      // OCL Constraint: check self.punti >= costoPunti
      if ((volunteer.points || 0) < pointsToDeduct) {
        return res.status(400).json({ error: "Punti insufficienti per riscattare questo coupon" });
      }

      // Deduct points and add coupon
      volunteer.points -= pointsToDeduct;
      const newCoupon = {
        name: couponName,
        cost: pointsToDeduct,
        code: "TC-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        acquiredAt: new Date()
      };
      if (!volunteer.coupons) volunteer.coupons = [];
      volunteer.coupons.push(newCoupon);

      return res.json({
        message: `Coupon "${couponName}" riscattato con successo!`,
        newPoints: volunteer.points
      });
    }

    const db = req.app.locals.db;
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
