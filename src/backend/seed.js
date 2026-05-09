const { MongoClient } = require("mongodb");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

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

    // Dati fittizi Utenti
    const users = [
      {
        email: "mario.rossi@email.it",
        name: "Mario",
        surname: "Rossi",
        role: "volunteer",
        address: "Via Roma 1, Trento",
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
        name: "Angela",
        surname: "Bianchi",
        role: "requester",
        address: "Via Belenzani 12, Trento",
        phone: "345 678 9012",
        createdAt: new Date()
      }
    ];

    const usersResult = await usersCol.insertMany(users);
    console.log(`Inseriti ${usersResult.insertedCount} utenti mock.`);

    // Dati fittizi Richieste
    const requests = [
      {
        title: "Trasporto per visita medica",
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
        title: "Accompagnamento al parco",
        category: "Accompagnamento",
        description: "Cerco qualcuno che possa accompagnarmi a fare una passeggiata al parco vicino casa. Ho bisogno di un braccio a cui appoggiarmi.",
        address: "Piazza Duomo 3, Trento",
        dateTime: "Domani, 10:00",
        requesterName: "Giuseppe N.",
        points: 100,
        status: "active",
        volunteerId: null,
        createdAt: new Date()
      },
      {
        title: "Compagnia e lettura quotidiano",
        category: "Compagnia",
        description: "Cerco una persona gentile per fare quattro chiacchiere in giardino nel pomeriggio e leggere insieme le principali notizie del quotidiano locale L'Adige.",
        address: "Via Grazioli 45, Trento",
        dateTime: "Lunedì, 15:30",
        requesterName: "Rosa M.",
        points: 50,
        status: "active",
        volunteerId: null,
        createdAt: new Date()
      },

    ];

    const requestsResult = await requestsCol.insertMany(requests);
    console.log(`Inserite ${requestsResult.insertedCount} richieste mock.`);

    console.log("Seeding completato con successo!");
  } catch (error) {
    console.error("Errore durante il seeding:", error);
  } finally {
    await client.close();
  }
}

seed();
