# Roadmap & TODO TridentumCare 

## 🏆 1. Completati con Successo (Milestones Raggiunte)

### 🔑 Autenticazione e Sessioni (JWT)
- [x] **Rimosso il bypass demo**: Eliminati i pulsanti di accesso istantaneo privi di sicurezza.
- [x] **Gestione Password Sicura**: Password cifrate con `bcryptjs` nel database (nessuna password in chiaro).
- [x] **Sessioni JWT**: Emissione di token crittografati validi per 24 ore salvati localmente.
- [x] **Ripristino Sessione Automatico**: Ricarica istantanea del profilo utente all'avvio se il token è valido.
- [x] **Utenti di Test Reali**: Creato lo script `seed.js` per popolare il database con profili reali:
  - Volontario (`mario.rossi@email.it` / `password123`)
  - Richiedente (`angela.bianchi@email.it` / `password123`)
- [x] **Rimozione OCL**: Puliti tutti i riferimenti accademici/OCL dai commenti e dai messaggi toast.
- [x] **Interfaccia di Sicurezza**: Aggiunto l'occhiolino interattivo per mostrare/nascondere la password nei form.

### 👵 Sezione Richiedente (Cittadino)
- [x] **Dashboard Dinamica**: Recupero e ordinamento in tempo reale di tutte le richieste caricate dal DB.
- [x] **Creazione Richieste**: Form di inserimento funzionante connesso direttamente all'endpoint `/api/requester/requests`.
- [x] **Allineamento Grafico**: Rinnovata l'estetica della dashboard con griglie responsive, card premium e badge eleganti.
- [x] **API basate su ID**: Rotte interamente protette ed interrogate tramite il campo `userId` del JWT.
- [ ] **Modifica richieste**: Aggiungere possibilità di modifcare le richieste, solo se non sono ancora prese in carico da un volontario. Aggiungere una modal apposita.
- [ ] **Eliminazione richieste**: Aggiungere possibilità di eliminare le richieste, solo se non sono ancora prese in carico da un volontario. Aggiungere una modal apposita.
- [ ] **Completare le richieste**: Aggiungere possibilità di completare le richieste, solo se sono prese in carico da un volontario. Aggiungere una modal apposita.

### 👨‍✈️ Sezione Volontario
- [x] **Rifattorizzazione API su ID**: Tutte le rotte di `volunteer.js` ora interrogano il database in base all'ID univoco (`_id` / `userId`) del token anziché l'email, ottimizzando la velocità di indicizzazione e l'integrità del database.

---

## 🛠️ 2. Da Implementare / Migliorare

### 📄 Legale e Documentazione
- [ ] Creare pagina e contenuti statici completi per la **Privacy Policy**.
- [ ] Creare pagina e contenuti statici completi per i **Termini di Servizio**.
- [ ] Inserire i link funzionanti nel footer (attualmente puntano a `#`).

### 👨‍✈️ Sezione Volontario (Miglioramenti UX e Logica)
- [ ] **Storico degli Incarichi**: Mostrare in una sezione apposita la lista dei compiti completati e archiviati (attualmente sono visibili solo quelli con stato `In Corso`).
- [ ] **Completamento Richiesta**: Aggiungere un bottone "Segna come Completato" per gli incarichi presi in carico dal volontario, che accrediti automaticamente i punti previsti (es. +100 punti) al suo profilo.

- [ ] **Modifica Competenze**: Consentire al volontario di aggiornare le proprie competenze (es. Trasporto, Accompagnamento, Compagnia) direttamente dal pannello Profilo, aggiornando dinamicamente i filtri della bacheca.

### 🏪 Sezione Ente Partner (In fase di Mockup)
- [ ] **Backend API (`partner.js`)**: Creare il router Express e proteggerlo con il middleware di autenticazione per il ruolo `partner`.
- [ ] **Dashboard Premi Dinamica**: Mostrare la tabella dei premi messi a disposizione dall'attività commerciale collegata.
- [ ] **Creazione di un Premio**: Collegare il form "Nuovo Premio" a un endpoint per l'inserimento nel DB.
- [ ] **Validazione Coupon**: Implementare una funzionalità (es. inserimento codice alfanumerico o simulazione scansione QR) per consentire all'esercente partner di "consumare" e validare un coupon riscosso da un volontario.

### 💻 Sezione Amministrazione (In fase di Mockup)
- [ ] **Backend API (`administrative.js`)**: Sviluppare le rotte protette riservate agli amministratori del sistema.
- [ ] **Console di Moderazione**: Sviluppare la ricerca reale degli utenti iscritti con possibilità di sospensione temporanea o eliminazione definitiva dal DB.
- [ ] **Approvazione Richieste**: Implementare una coda di approvazione per verificare le richieste dei cittadini prima di pubblicarle in bacheca.
- [ ] **Registrazione Partner**: Collegare il form "Registra Nuovo Partner" per salvare le credenziali dell'esercente nel database.

### ⚡ Ottimizzazioni Generali & UX
- [ ] **Notifiche Push / Socket**: Notificare in tempo reale il cittadino richiedente quando un volontario accetta la sua richiesta di aiuto.
- [ ] **Gestione Avatar**: Permettere l'upload (o la selezione di una lista predefinita) di immagini del profilo per rendere l'interfaccia ancora più amichevole e personalizzata.
