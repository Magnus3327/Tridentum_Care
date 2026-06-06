# TridentumCare

**Progetto per l'esame di Ingegneria del Software - 2026**

🌐 **Demo Live:** [https://tridentum-care.onrender.com/](https://tridentum-care.onrender.com/)

TridentumCare è una piattaforma web innovativa nata per connettere persone anziane o fragili con volontari disponibili, specificamente pensata per il territorio di Trento. L'obiettivo del sistema è facilitare il supporto reciproco fornendo un pannello di controllo chiaro per gestire servizi essenziali come *Trasporto*, *Accompagnamento* e *Compagnia*.

Il progetto si distingue per la sua interfaccia **Single Page Application (SPA)** dinamica dotata di un sofisticato sistema di gamification: i volontari accumulano "Punti" portando a termine gli incarichi e possono in seguito spenderli nello Store Premi per generare dei Coupon esclusivi, dotati di QR code.

---

## 🛠️ Tecnologie Utilizzate

Il progetto è stato sviluppato adottando lo stack MEN (MongoDB, Express, Node.js), optando per un frontend "Vanilla" (senza framework pesanti) per massimizzare il controllo diretto sul DOM e sulle performance.

### Frontend (Client-Side)
- **Linguaggi base:** HTML5, CSS3 (con variabili custom e design responsive) e Vanilla JavaScript.
- **Architettura:** Single Page Application (SPA) con rendering dinamico dei moduli tramite DOM manipulation.
- **Librerie e API esterne:**
  - **Leaflet.js e OpenStreetMap:** per la renderizzazione della mappa interattiva.
  - **Font Awesome:** per l'iconografia dell'interfaccia.
  - **Inter (Google Fonts):** tipografia principale del sito.

### Backend (Server-Side) e Moduli npm
- **Ambiente di esecuzione:** Node.js.
- **Web Framework:** `express` (v5.x) - Per la creazione delle RESTful API e il serving dei file statici.
- **Database & ORM:** `mongodb` e `mongoose` - Per la connessione e la modellazione dei dati su DB NoSQL.

### Sicurezza & Autenticazione
- **bcryptjs:** Per l'hashing sicuro delle password (salt & hash).
- **jsonwebtoken:** Per la generazione e validazione dei token JWT necessari per la gestione delle sessioni stateless e dell'RBAC (Role-Based Access Control).
- **cors:** Per la gestione del Cross-Origin Resource Sharing.
- **Utility:** 
  - `dotenv` - Per il caricamento sicuro delle variabili d'ambiente (URI database, secret JWT).
  - `swagger-ui-express` e `yamljs` - Per la renderizzazione e il serving dinamico della documentazione interattiva OpenAPI/Swagger a partire dal file YAML.

### Testing e Sviluppo
- **Test:** `jest` (Test runner e assertion library) e `supertest` (per il testing degli endpoint HTTP).
- **Ambiente:** `cross-env` - Per settare variabili d'ambiente in modo cross-platform durante i test.
- **Versionamento & Hosting:** Git, GitHub (Version Control), Render (Platform as a Service per il deploy live).

---

## 🏗️ Architettura API (Role-Based)

### Motivazioni scelta User/Role-based API:
1. **Principio di Isolamento e Sicurezza Out-of-the-Box:** Raggruppare le rotte sotto prefissi basati sui ruoli in Express permette di applicare middleware di autenticazione e autorizzazione centralizzati (es. su `/api/v1/administrators`). Questo approccio di *Security by Design* riduce drasticamente il rischio di errori umani, come dimenticare di proteggere singoli endpoint sensibili.
2. **Prevenzione delle Collisioni e Differenziazione dei Contesti:** Consente di distinguere chiaramente l'accesso alla stessa entità in base all'attore. Mentre un utente accede al proprio profilo in logica self-service (`/api/v1/volunteers/me`), un amministratore utilizza una vista globale (`/api/v1/administrators/users`) che espone campi e operazioni differenti, evitando condizionali complessi all'interno dei controller.
3. **Semantica delle Operazioni B2B/Partner:** Esplicita il dominio funzionale delle operazioni commerciali. L'isolamento sotto `/api/v1/partners/` garantisce che la logica di business e i dati siano circoscritti esclusivamente all'operatività degli stakeholder commerciali.

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
*Attenzione: questo comando piallerà e riscriverà i dati delle collezioni `users`, `requests`, `coupons` e `coupon_redemptions`.*
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
* **Email:** `admin@email.it`
* **Funzionalità:** Accesso completo al Pannello di Controllo. Può sospendere/riattivare utenti con ban progressivi (12h, 1gg, 1sett, 1mese), eliminare utenti (con pulizia dati a cascata), promuovere/retrocedere volontari a Moderatori, creare nuovi account Partner generando password sicure, ed eliminare richieste inappropriate.

### 🛡️ Profilo Moderatore (Massimo Modena)
* **Email:** `massimo.modena@email.it`
* **Funzionalità:** Accesso al Pannello di Controllo con permessi limitati. Può gestire gli utenti (solo sospensioni) e le richieste, ma NON può eliminare utenti, promuovere/retrocedere altri utenti né creare nuovi Partner.

### 👨‍✈️ Profilo Volontario (Valerio Volpi)
* **Email:** `valerio.volpi@email.it`
* **Funzionalità:** Visualizza bacheca attiva basata sulle proprie competenze, accetta/annulla prese in carico, accumula punti e riscatta coupon nello store con generazione di QR code dinamici.

### 👵 Profilo Cittadino/Richiedente (Riccardo Rossi)
* **Email:** `riccardo.rossi@email.it`
* **Funzionalità:** Dashboard personale dinamica per controllare le proprie richieste caricate dal DB, form per la creazione di nuove richieste e modifica o eliminazione (annullamento) in tempo reale prima della presa in carico.

### 🏬 Profilo Partner Commerciale (Farmacia Centrale)
* **Email:** `farmacia.centrale@email.it`
* **Funzionalità:** Dashboard dedicata per gestire l'inserimento di nuovi Coupon e per visualizzare la lista storica dei coupon e chi li ha riscattati.

---

## 👥 Autori

* **Matteo Miglio** (243947) - [Profilo GitHub](https://github.com/Magnus3327)
* **Alessio Cristoforetti** (243629) - [Profilo GitHub](https://github.com/acristoforetti-1-pixel)
* **Riccardo De Riz** (243317) - [Profilo GitHub](https://github.com/27ricky020)