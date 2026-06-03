# TridentumCare

**Progetto per l'esame di Ingegneria del Software - 2026**

TridentumCare è una piattaforma web innovativa nata per connettere persone anziane o fragili con volontari disponibili, specificamente pensata per il territorio di Trento. L'obiettivo del sistema è facilitare il supporto reciproco fornendo un pannello di controllo chiaro per gestire servizi essenziali come *Trasporto*, *Accompagnamento* e *Compagnia*.

Il progetto si distingue per la sua interfaccia **Single Page Application (SPA)** dinamica dotata di un sofisticato sistema di gamification: i volontari accumulano "Punti" portando a termine gli incarichi e possono in seguito spenderli nello Store Premi per generare dei Coupon esclusivi, dotati di QR code.

---

## 🛠️ Tecnologie Utilizzate

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Font Awesome.
- **Backend:** Node.js con Express.js.
- **Sicurezza:** `bcryptjs` per la cifratura delle password e `jsonwebtoken` (JWT) per la gestione sicura delle sessioni di autenticazione.
- **Database:** MongoDB Atlas (NoSQL Cloud) con driver ufficiale `mongodb`.
- **Ambiente:** `dotenv` per la configurazione sicura delle chiavi e delle porte.

---

## 🚀 Requisiti e Installazione

Per avviare il progetto localmente, assicurati di avere installati **[Node.js](https://nodejs.org/it/)** e **npm**.

### 1. Posizionati nella directory del progetto
Apri il terminale e naviga nella root del progetto:

### 2. Installa le dipendenze
Installa i moduli necessari (Express, MongoDB driver, bcryptjs, jsonwebtoken, ecc.) definiti nel `package.json`:
```bash
npm install
```

### 3. Configura le variabili d'ambiente
Affinché il backend possa comunicare con il database Cloud e firmare i token di sessione in modo sicuro, crea o modifica il file denominato `.env` nella directory radice aggiungendo la stringa di connessione e la chiave segreta JWT:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tridentum_care
PORT=3000
JWT_SECRET=una_chiave_segreta_molto_sicura_e_lunga_123!
```

### 4. Popola il Database (Seeding)
Per avere subito i dati pronti per il testing (utenti di test reali e richieste caricate in bacheca), esegui lo script di popolamento iniziale.
*Attenzione: questo comando piallerà e riscriverà i dati delle collezioni `users` e `requests`.*
```bash
node src/backend/seed.js
```

---

## 💻 Avvio dell'Applicazione

Una volta installato tutto, puoi far partire il server di backend:

```bash
npm start
```

Il terminale ti confermerà l'avvio e la connessione a MongoDB. 
A questo punto, apri il tuo browser preferito e vai all'indirizzo:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Credenziali Utenti di Test

I vecchi pulsanti demo di bypass sono stati rimossi. Per provare le varie aree dell'applicazione, effettua l'accesso dalla pagina **Accedi** con i seguenti account. Tutte le password sono impostate su **`TridentumCare23!`**:

### 👑 Profilo Amministratore (Admin)
* **Email:** `admin@email.com`
* **Funzionalità:** Accesso completo al Pannello di Controllo. Può sospendere/riattivare utenti con ban progressivi (12h, 1gg, 1sett, 1mese), eliminare utenti (con pulizia dati a cascata), promuovere/retrocedere volontari a Moderatori, creare nuovi account Partner generando password sicure, ed eliminare richieste inappropriate.

### 🛡️ Profilo Moderatore (Massimo Modena)
* **Email:** `massimo.modena@email.it`
* **Funzionalità:** Accesso al Pannello di Controllo con permessi limitati. Può gestire gli utenti (sospensioni, eliminazioni) e le richieste, ma NON può promuovere/retrocedere altri utenti né creare nuovi Partner.

### 👨‍✈️ Profilo Volontario (Valerio Volpi)
* **Email:** `valerio.volpi@email.it`
* **Funzionalità:** Visualizza bacheca attiva basata sulle proprie competenze, accetta/annulla prese in carico, accumula punti e riscatta coupon nello store con generazione di QR code dinamici.

### 👵 Profilo Cittadino/Richiedente (Riccardo Rossi)
* **Email:** `riccardo.rossi@email.it`
* **Funzionalità:** Dashboard personale dinamica per controllare le proprie richieste caricate dal DB, form per la creazione di nuove richieste e modifica o eliminazione (annullamento) in tempo reale prima della presa in carico.

### 🏬 Profilo Partner Commerciale (Farmacia Centrale)
* **Email:** `farmacia.centrale@email.it`
* **Funzionalità:** Dashboard dedicata per gestire l'inserimento di nuovi Coupon e per visualizzare la lista storica dei coupon e chi li ha riscattati.