const connectDB = require("./db");

async function seedDatabase() {
  try {
    const db = await connectDB();
    console.log("Controllo seeding del database...");

    const usersCollection = db.collection("users");
    const requestsCollection = db.collection("requests");

    // 1. Seed Users (Volontario e Richiedente)
    const volunteerCount = await usersCollection.countDocuments({ role: "volunteer" });
    if (volunteerCount === 0) {
      console.log("Nessun volontario trovato, inserisco il volontario di default...");
      await usersCollection.insertOne({
        email: "mario.rossi@email.it",
        name: "Mario",
        surname: "Rossi",
        role: "volunteer",
        address: "Via Roma 1, Trento",
        points: 1250,
        phone: "333 123 4567",
        skills: ["Spesa", "Farmaci", "Compagnia"],
        createdAt: new Date()
      });
    }

    const requesterCount = await usersCollection.countDocuments({ role: "requester" });
    if (requesterCount === 0) {
      console.log("Nessun richiedente trovato, inserisco il richiedente di default...");
      await usersCollection.insertOne({
        email: "angela.bianchi@email.it",
        name: "Angela",
        surname: "Bianchi",
        role: "requester",
        address: "Via Belenzani 12, Trento",
        phone: "345 987 6543",
        createdAt: new Date()
      });
    }

    // 2. Seed Requests
    const requestCount = await requestsCollection.countDocuments();
    if (requestCount === 0) {
      console.log("Nessuna richiesta trovata, inserisco le richieste di esempio...");
      const sampleRequests = [
        {
          title: "Spesa settimanale di alimentari",
          category: "Spesa",
          description: "Avrei bisogno di acquistare latte parzialmente scremato, un pacco di pasta Barilla n.5, pomodori freschi e pane comune. Abito al secondo piano senza ascensore, quindi serve un po' di forza fisica.",
          address: "Via Belenzani 12, Trento",
          dateTime: "Oggi, 17:00",
          requesterName: "Angela Bianchi",
          points: 150,
          status: "active",
          volunteerId: null,
          createdAt: new Date()
        },
        {
          title: "Ritiro farmaci salvavita",
          category: "Farmaci",
          description: "Ritiro ricetta medica presso la farmacia di Piazza Duomo. La ricetta è già pagata e ho caricato il codice fiscale. Bisogna solo ritirare la scatola di cardioaspirina.",
          address: "Piazza Duomo 3, Trento",
          dateTime: "Domani, 10:00",
          requesterName: "Giuseppe N.",
          points: 120,
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
          points: 200,
          status: "active",
          volunteerId: null,
          createdAt: new Date()
        },
        {
          title: "Aiuto configurazione smartphone",
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
      ];
      await requestsCollection.insertMany(sampleRequests);
      console.log("Richieste di esempio inserite correttamente!");
    } else {
      console.log(`Trovate ${requestCount} richieste esistenti. Salto inserimento.`);
    }

  } catch (error) {
    console.error("Errore durante il seeding del database:", error);
  }
}

module.exports = seedDatabase;
