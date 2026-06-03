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
    const couponsCol = db.collection("coupons");
    const redemptionsCol = db.collection("coupon_redemptions");

    // Pulisci i dati esistenti
    await usersCol.deleteMany({});
    await requestsCol.deleteMany({});
    await couponsCol.deleteMany({});
    await redemptionsCol.deleteMany({});
    console.log("Collezioni 'users', 'requests', 'coupons' e 'coupon_redemptions' ripulite.");

    // Hash della password unificata per tutti gli utenti
    const hashedPassword = await bcrypt.hash("TridentumCare23!", 10);

    // Dati fittizi Utenti
    const users = [
      {
        email: "valerio.volpi@email.it",
        password: hashedPassword,
        name: "Valerio",
        surname: "Volpi",
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
        email: "massimo.modena@email.it",
        password: hashedPassword,
        name: "Massimo",
        surname: "Modena",
        role: "volunteer",
        authLvl: AUTH_LVL ? AUTH_LVL.MODERATOR : 1,
        points: 0,
        phone: "333 999 0000",
        skills: ["Trasporto", "Accompagnamento", "Compagnia"],
        age: 30,
        license: "Sì (Patente B)",
        gender: "M",
        createdAt: new Date()
      },
      {
        email: "admin@email.com",
        password: hashedPassword,
        name: "Admin",
        surname: "",
        role: "volunteer",
        authLvl: AUTH_LVL ? AUTH_LVL.ADMIN : 2,
        points: 0,
        createdAt: new Date()
      },
      {
        email: "riccardo.rossi@email.it",
        password: hashedPassword,
        name: "Riccardo",
        surname: "Rossi",
        role: "requester",
        address: "Via Belenzani 12, Trento",
        phone: "345 678 9012",
        createdAt: new Date()
      },
      {
        email: "farmacia.centrale@email.it",
        password: hashedPassword,
        role: "partner",
        companyName: "Farmacia Centrale",
        createdAt: new Date()
      }
    ];

    await usersCol.insertMany(users);
    console.log("Inseriti 5 utenti di test con password 'TridentumCare23!'.");

    // Recupera gli ID generati per le associazioni
    const richiedente = await usersCol.findOne({ email: "riccardo.rossi@email.it" });
    const richiedenteId = richiedente._id;
    
    const volontario = await usersCol.findOne({ email: "valerio.volpi@email.it" });
    const volontarioId = volontario._id;

    const partner = await usersCol.findOne({ email: "farmacia.centrale@email.it" });
    const partnerId = partner._id;

    // Dati fittizi Richieste di test
    const requests = [
      {
        userId: richiedenteId,
        title: "Trasporto per visita medica",
        category: "Trasporto",
        serviceType: "Trasporto",
        description: "Avrei bisogno di un passaggio per recarmi all'ospedale Santa Chiara per una visita di controllo.",
        notes: "Avrei bisogno di un passaggio per recarmi all'ospedale Santa Chiara per una visita di controllo.",
        address: "Via Belenzani 12, Trento",
        location: "Via Belenzani 12, Trento",
        dateTime: "Oggi, 17:00",
        date: new Date().toISOString().split("T")[0],
        time: "17:00",
        requesterName: "Riccardo Rossi",
        points: 150,
        status: "In Attesa di Volontario",
        volunteerId: null,
        createdAt: new Date()
      },
      {
        userId: richiedenteId,
        title: "Accompagnamento al parco",
        category: "Accompagnamento",
        serviceType: "Accompagnamento",
        description: "Cerco qualcuno che possa accompagnarmi a fare una passeggiata al parco vicino casa.",
        notes: "Cerco qualcuno che possa accompagnarmi a fare una passeggiata al parco vicino casa.",
        address: "Piazza Duomo 3, Trento",
        location: "Piazza Duomo 3, Trento",
        dateTime: "Domani, 10:00",
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "10:00",
        requesterName: "Riccardo Rossi",
        points: 100,
        status: "In Attesa di Volontario",
        volunteerId: null,
        createdAt: new Date()
      }
    ];

    const requestsResult = await requestsCol.insertMany(requests);
    console.log(`Inserite ${requestsResult.insertedCount} richieste mock associate al richiedente.`);

    // Seeding Coupons (Partner)
    const coupons = [
      {
        partnerId: partnerId,
        title: "Caffè e Brioche",
        description: "Colazione offerta (Caffè + Brioche) presso la Caffetteria del Centro.",
        pointsCost: 200,
        expirationDate: "2026-12-31",
        createdAt: new Date()
      },
      {
        partnerId: partnerId,
        title: "Sconto 5€ su spesa",
        description: "Sconto di 5€ su una spesa minima di 20€.",
        pointsCost: 400,
        expirationDate: "2026-10-31",
        createdAt: new Date()
      }
    ];

    const couponsResult = await couponsCol.insertMany(coupons);
    console.log(`Inseriti ${couponsResult.insertedCount} coupon mock per il partner.`);

    const firstCoupon = await couponsCol.findOne({ title: "Caffè e Brioche" });

    const redemptions = [
      {
        couponId: firstCoupon._id,
        volunteerId: volontarioId,
        volunteerName: "Valerio Volpi",
        redeemedCode: "TRIDENTUM-CAFFE-X1Y2",
        date: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date()
      }
    ];

    const redemptionsResult = await redemptionsCol.insertMany(redemptions);
    console.log(`Inseriti ${redemptionsResult.insertedCount} riscatti mock.`);

    console.log("Seeding completato con successo!");
  } catch (error) {
    console.error("Errore durante il seeding:", error);
  } finally {
    await client.close();
  }
}

seed();
