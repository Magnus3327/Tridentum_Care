# TridentumCare 🛡️❤️

**Progetto per l'esame di Ingegneria del Software - UNI2026**

TridentumCare è una piattaforma web innovativa nata per connettere persone anziane o fragili con volontari disponibili, specificamente pensata per il territorio di Trento. L'obiettivo del sistema è facilitare il supporto reciproco fornendo un pannello di controllo chiaro per gestire servizi essenziali come *Trasporto*, *Accompagnamento* e *Compagnia*.

Il progetto si distingue per la sua interfaccia **Single Page Application (SPA)** dinamica dotata di un sofisticato sistema di gamification: i volontari accumulano "Punti" portando a termine gli incarichi e possono in seguito spenderli nello Store Premi per generare dei Coupon esclusivi, dotati di QR code.

---

## 🛠️ Tecnologie Utilizzate

- **Frontend:** HTML5, CSS , Vanilla JavaScript.
- **Backend:** Node.js con Express.js.
- **Database:** MongoDB Atlas (NoSQL Cloud).
- **Extra:** Autenticazione Mongoose (predisposta), dotenv per l'ambiente.

---

## 🚀 Requisiti e Installazione

Per avviare il progetto localmente, assicurati di avere installati **[Node.js](https://nodejs.org/it/)** e **npm**.

### 1. Posizionati nella directory del progetto
Apri il terminale e naviga nella root del progetto:

### 2. Installa le dipendenze
Installa i moduli necessari (Express, MongoDB driver, ecc.) definiti nel `package.json`:
```bash
npm install
```

### 3. Configura le variabili d'ambiente
Affinché il backend possa comunicare con il database Cloud, assicurati che esista un file denominato `.env` nella directory radice e che contenga la stringa di connessione (se l'hai già configurata in passato, salta questo passaggio):
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tridentum_care
PORT=3000
```

### 4. Popola il Database (Seeding)
Per avere subito dei dati funzionanti e testare la piattaforma (utenti mock, richieste già pronte in bacheca con i corretti punteggi), esegui lo script di popolamento iniziale.
*Attenzione: questo comando piallerà e riscriverà i dati base.*
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

## 🗂 Struttura dei Ruoli e Testing

Il sistema prevede quattro principali "Viste" o ruoli, testabili cliccando i rispettivi pulsanti nella pagina di autenticazione:
1. **Volontario:** Può filtrare la bacheca in base alle proprie skill, accettare task, vedere i punti aumentare e comprare Coupon.
2. **Cittadino (Richiedente):** Può inserire nuove richieste di assistenza *(in fase di allineamento e completamento dinamico, vedi `TODO.md`)*.
3. **Ente Partner:** Generatore e validatore dei premi/coupon.
4. **Amministrazione:** Controllo globale.

In futuro bisognerebbe integrare in volontario anche la vista admin.
Visto che abbiamo pensato che l'utente admin può avere vari livelli di autorizzazione e che esso è anche volontario. 
Dunque, in base al ruolo dell'utente, gli verranno mostrate diverse opzioni.
Quindi, bisognerebbe implementare un modo per identificare il ruolo dell'utente e mostrarli le opzioni corrette.