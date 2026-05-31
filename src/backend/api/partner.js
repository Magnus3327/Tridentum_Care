const express = require("express");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");
const { ROLES } = require("../../config/constants");

const router = express.Router();

// Middleware per limitare l'accesso ai soli partner
const isPartner = (req, res, next) => {
  if (req.user.role !== ROLES.PARTNER) {
    return res.status(403).json({ error: "Accesso negato. Solo i partner possono eseguire questa operazione." });
  }
  next();
};

// 1. GET /coupons - Ottieni tutti i coupon del partner loggato
router.get("/coupons", authMiddleware, isPartner, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const coupons = await db.collection("coupons").find({ partnerId: new ObjectId(req.user.userId) }).toArray();
    
    // Per ogni coupon, aggiungi il numero di riscatti
    for (let coupon of coupons) {
        const count = await db.collection("coupon_redemptions").countDocuments({ couponId: coupon._id });
        coupon.redemptionsCount = count;
    }

    res.json(coupons);
  } catch (error) {
    console.error("Errore recupero coupons partner:", error);
    res.status(500).json({ error: "Impossibile recuperare i coupon." });
  }
});

// 2. POST /coupons - Crea un nuovo coupon
router.post("/coupons", authMiddleware, isPartner, async (req, res) => {
  try {
    const { title, description, pointsCost, expirationDate } = req.body;
    if (!title || !pointsCost || !expirationDate) {
      return res.status(400).json({ error: "Titolo, costo in punti e data di scadenza sono obbligatori." });
    }

    const parsedDate = Date.parse(expirationDate);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: "La data di scadenza inserita non è valida." });
    }
    const today = new Date().toISOString().split('T')[0];
    if (expirationDate < today) {
      return res.status(400).json({ error: "La data di scadenza non può essere nel passato." });
    }

    const db = req.app.locals.db;
    const newCoupon = {
      partnerId: new ObjectId(req.user.userId),
      title,
      description: description || "",
      pointsCost: parseInt(pointsCost),
      expirationDate,
      createdAt: new Date()
    };

    const result = await db.collection("coupons").insertOne(newCoupon);
    res.status(201).json({ message: "Coupon creato con successo", coupon: { ...newCoupon, _id: result.insertedId } });
  } catch (error) {
    console.error("Errore creazione coupon:", error);
    res.status(500).json({ error: "Impossibile creare il coupon." });
  }
});

// 3. PUT /coupons/:id - Modifica un coupon
router.put("/coupons/:id", authMiddleware, isPartner, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, pointsCost, expirationDate } = req.body;

    const db = req.app.locals.db;
    const couponId = new ObjectId(id);

    // Controlla che il coupon appartenga a questo partner
    const coupon = await db.collection("coupons").findOne({ _id: couponId, partnerId: new ObjectId(req.user.userId) });
    if (!coupon) {
      return res.status(404).json({ error: "Coupon non trovato o non autorizzato." });
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (pointsCost !== undefined) updateFields.pointsCost = parseInt(pointsCost);
    if (expirationDate !== undefined) {
      const parsedDate = Date.parse(expirationDate);
      if (isNaN(parsedDate)) {
        return res.status(400).json({ error: "La data di scadenza inserita non è valida." });
      }
      const today = new Date().toISOString().split('T')[0];
      if (expirationDate < today) {
        return res.status(400).json({ error: "La data di scadenza non può essere nel passato." });
      }
      updateFields.expirationDate = expirationDate;
    }

    await db.collection("coupons").updateOne(
      { _id: couponId },
      { $set: updateFields }
    );

    res.json({ message: "Coupon aggiornato con successo" });
  } catch (error) {
    console.error("Errore modifica coupon:", error);
    res.status(500).json({ error: "Impossibile modificare il coupon." });
  }
});

// 4. DELETE /coupons/:id - Elimina un coupon
router.delete("/coupons/:id", authMiddleware, isPartner, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const couponId = new ObjectId(id);

    const result = await db.collection("coupons").deleteOne({ _id: couponId, partnerId: new ObjectId(req.user.userId) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Coupon non trovato o non autorizzato." });
    }

    res.json({ message: "Coupon eliminato con successo" });
  } catch (error) {
    console.error("Errore eliminazione coupon:", error);
    res.status(500).json({ error: "Impossibile eliminare il coupon." });
  }
});

// 5. GET /coupons/:id/purchases - Ottieni lo storico riscatti di un coupon
router.get("/coupons/:id/purchases", authMiddleware, isPartner, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const couponId = new ObjectId(id);

    // Prima controlliamo che il coupon sia del partner
    const coupon = await db.collection("coupons").findOne({ _id: couponId, partnerId: new ObjectId(req.user.userId) });
    if (!coupon) {
      return res.status(404).json({ error: "Coupon non trovato o non autorizzato." });
    }

    const redemptions = await db.collection("coupon_redemptions").find({ couponId }).sort({ date: -1 }).toArray();
    res.json(redemptions);
  } catch (error) {
    console.error("Errore recupero riscatti:", error);
    res.status(500).json({ error: "Impossibile recuperare lo storico dei riscatti." });
  }
});

module.exports = router;
