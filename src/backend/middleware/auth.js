const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const JWT_SECRET = process.env.JWT_SECRET || "tridentum_care_secret_key_123";

async function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Accesso negato: token sessione mancante" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Accesso negato: formato token non valido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, role }

    // Controllo utente sospeso
    const db = req.app.locals.db;
    if (db && ObjectId.isValid(req.user.userId)) {
      const user = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });
      if (user && user.isSuspended) {
        return res.status(403).json({ error: "Accesso negato: il tuo account è stato sospeso" });
      }
    }

    next();
  } catch (error) {
    console.error("Errore validazione JWT:", error.message);
    return res.status(401).json({ error: "Accesso negato: sessione non valida o scaduta" });
  }
}

module.exports = authMiddleware;
