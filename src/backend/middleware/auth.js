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
        if (user.suspendedUntil && new Date() > new Date(user.suspendedUntil)) {
          await db.collection("users").updateOne(
            { _id: user._id },
            { $set: { isSuspended: false }, $unset: { suspendedUntil: "" } }
          );
        } else {
          let msg = "Accesso negato: il tuo account è stato sospeso.";
          if (user.suspendedUntil) {
            const diffMs = new Date(user.suspendedUntil) - new Date();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
              msg = `Accesso negato: account sospeso per altri ${diffDays} giorn${diffDays === 1 ? 'o' : 'i'}.`;
            } else {
              const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
              msg = `Accesso negato: account sospeso per altr${diffHours === 1 ? 'a' : 'e'} ${diffHours} or${diffHours === 1 ? 'a' : 'e'}.`;
            }
          }
          return res.status(403).json({ error: msg });
        }
      }
    }

    next();
  } catch (error) {
    console.error("Errore validazione JWT:", error.message);
    return res.status(401).json({ error: "Accesso negato: sessione non valida o scaduta" });
  }
}

module.exports = authMiddleware;
