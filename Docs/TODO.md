## TODO TridentumCare 

## 🛠️ Da Implementare / Migliorare

### 📄 Legale e Documentazione
- [X] **Link Legali in Signup**: Linkare privacy policy e ToS durante il signup, aggiungere spunta di presa visione necessaria

### 👨‍✈️ Sezione Volontario (Miglioramenti UX e Logica)
- [ ] **Storico degli Incarichi**: Mostrare in una sezione apposita la lista dei compiti completati e archiviati (attualmente sono visibili solo quelli con stato `In Corso`).

### 🏪 Sezione Ente Partner (In fase di Mockup)
- [ ] **Backend API (`partner.js`)**: Creare il router Express e proteggerlo con il middleware di autenticazione per il ruolo `partner`.
- [ ] **Dashboard Premi Dinamica**: Mostrare la tabella dei premi messi a disposizione dall'attività commerciale collegata.
- [ ] **Creazione di un Premio**: Collegare il form "Nuovo Premio" a un endpoint per l'inserimento nel DB.

### 💻 Sezione Amministrazione (In fase di Mockup)
- [ ] **Backend API (`administrative.js`)**: Sviluppare le rotte protette riservate agli amministratori del sistema.
- [ ] **Console di Moderazione**: Sviluppare la ricerca reale degli utenti iscritti con possibilità di sospensione temporanea o eliminazione definitiva dal DB.
- [ ] **Approvazione Richieste (Forse)**: Implementare una coda di approvazione per verificare le richieste dei cittadini prima di pubblicarle in bacheca.
- [ ] **Registrazione Partner**: Collegare il form "Registra Nuovo Partner" per salvare le credenziali dell'esercente nel database.

### ⚡ Ottimizzazioni Generali & UX
- [ ] **Notifiche Push / Socket**: Notificare in tempo reale il cittadino richiedente quando un volontario accetta la sua richiesta di aiuto.
- [ ] **Gestione Avatar**: Permettere l'upload (o la selezione di una lista predefinita) di immagini del profilo per rendere l'interfaccia ancora più amichevole e personalizzata.l'interfaccia ancora più amichevole e personalizzata.
