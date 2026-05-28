const { MongoClient } = require("mongodb");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { AUTH_LVL } = require("../config/constants");

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error("ERRORE: MONGO_URI non impostata nel file .env");
  process.exit(1);
}

const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    console.log("Connesso a MongoDB. Inizio il seeding dei dati...");
    const db = client.db(process.env.DB_NAME || "tridentum_care");

    const usersCol = db.collection("users");
    const requestsCol = db.collection("requests");

    // Pulisci i dati esistenti
    await usersCol.deleteMany({});
    await requestsCol.deleteMany({});
    console.log("Collezioni 'users' e 'requests' ripulite.");

    // Hash della password fissa per entrambi gli utenti di test
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Dati fittizi Utenti
    const users = [
      {
        email: "mario.rossi@email.it",
        password: hashedPassword,
        name: "Mario",
        surname: "Rossi",
        role: "volunteer",
        address: "Via Roma 1, Trento",
        authLvl: AUTH_LVL ? AUTH_LVL.UNAUTHORIZED : 0,
        points: 1250,
        phone: "333 123 4567",
        skills: ["Trasporto", "Accompagnamento", "Compagnia"],
        age: 25,
        license: "Sì (Patente B)",
        gender: "M",
        createdAt: new Date()
      },
      {
        email: "angela.bianchi@email.it",
        password: hashedPassword,
        name: "Angela",
        surname: "Bianchi",
        role: "requester",
        address: "Via Belenzani 12, Trento",
        phone: "345 678 9012",
        createdAt: new Date()
      },
      {
        name: "Admin",
        surname: "Tridentum",
        email: "admin@tridentumcare.it",
        password: hashedPassword,
        role: "volunteer",
        authLvl: AUTH_LVL ? AUTH_LVL.ADMIN : 2,
        points: 0,
        createdAt: new Date()
      }
    ];

    await usersCol.insertMany(users);
    console.log("Inseriti 2 utenti di test (Mario Rossi e Angela Bianchi) con password 'password123'.");

    // Recupera l'id generato di Angela Bianchi per associarle le richieste
    const angela = await usersCol.findOne({ email: "angela.bianchi@email.it" });
    const angelaId = angela._id;

    // Dati fittizi Richieste di test (con campi mappati sia per richiedente che per volontario)
    const requests = [
      {
        userId: angelaId,
        title: "Trasporto per visita medica",
        category: "Trasporto",
        serviceType: "Trasporto",
        description: "Avrei bisogno di un passaggio per recarmi all'ospedale Santa Chiara per una visita di controllo. Non posso guidare.",
        notes: "Avrei bisogno di un passaggio per recarmi all'ospedale Santa Chiara per una visita di controllo. Non posso guidare.",
        address: "Via Belenzani 12, Trento",
        location: "Via Belenzani 12, Trento",
        dateTime: "Oggi, 17:00",
        date: new Date().toISOString().split("T")[0], // Data di oggi
        time: "17:00",
        requesterName: "Angela Bianchi",
        points: 150,
        status: "In Attesa di Volontario", // Stato uniforme
        volunteerId: null,
        createdAt: new Date()
      },
      {
        userId: angelaId,
        title: "Accompagnamento al parco",
        category: "Accompagnamento",
        serviceType: "Accompagnamento",
        description: "Cerco qualcuno che possa accompagnarmi a fare una passeggiata al parco vicino casa. Ho bisogno di un braccio a cui appoggiarmi.",
        notes: "Cerco qualcuno che possa accompagnarmi a fare una passeggiata al parco vicino casa. Ho bisogno di un braccio a cui appoggiarmi.",
        address: "Piazza Duomo 3, Trento",
        location: "Piazza Duomo 3, Trento",
        dateTime: "Domani, 10:00",
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Data di domani
        time: "10:00",
        requesterName: "Angela Bianchi",
        points: 100,
        status: "In Attesa di Volontario", // Stato uniforme
        volunteerId: null,
        createdAt: new Date()
      },
      {
        userId: angelaId,
        title: "Compagnia e lettura quotidiano",
        category: "Compagnia",
        serviceType: "Compagnia",
        description: "Cerco una persona gentile per fare quattro chiacchiere in giardino nel pomeriggio e leggere insieme le principali notizie del quotidiano locale L'Adige.",
        notes: "Cerco una persona gentile per fare quattro chiacchiere in giardino nel pomeriggio e leggere insieme le principali notizie del quotidiano locale L'Adige.",
        address: "Via Grazioli 45, Trento",
        location: "Via Grazioli 45, Trento",
        dateTime: "Lunedì, 15:30",
        date: "2026-05-18",
        time: "15:30",
        requesterName: "Rosa M.",
        points: 50,
        status: "In Attesa di Volontario", // Stato uniforme
        volunteerId: null,
        createdAt: new Date()
      }
    ];

    const requestsResult = await requestsCol.insertMany(requests);
    console.log(`Inserite ${requestsResult.insertedCount} richieste mock associate ad Angela Bianchi.`);

    console.log("Seeding completato con successo!");
  } catch (error) {
    console.error("Errore durante il seeding:", error);
  } finally {
    await client.close();
  }
}

seed();
