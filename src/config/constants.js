/**
 * TridentumCare - Costanti di Sistema Centralizzate
 * Questo file funge da "Single Source of Truth" (SST) per evitare disallineamenti di stringhe nel codice.
 */

// Punti differenti assegnati a ciascuna attività in base alla complessità e all'impegno richiesto
const SERVICE_POINTS = {
  "Trasporto": 150,       // Richiede patente, mezzo proprio e spostamenti su strada (impegno alto)
  "Accompagnamento": 100, // Richiede presenza e accompagnamento a piedi o visite (impegno medio)
  "Compagnia": 50         // Visite domiciliari per conversazione, lettura o svago (impegno base)
};

// Genera automaticamente la lista dei servizi a partire dalle chiavi dei punti
const SERVICES = Object.keys(SERVICE_POINTS);

const ROLES = {
  VOLUNTEER: "volunteer",
  REQUESTER: "requester",
  PARTNER: "partner",
  ADMIN: "admin"
};

// Authorization levels for volunteers (numeric values stored on user documents)
const AUTH_LVL = {
  UNVERIFIED: 0,
  VERIFIED: 1,
  ADMIN: 2
};

const REQUEST_STATUS = {
  PENDING: "In Attesa di Volontario",
  ACCEPTED: "Presa in Carico",
  COMPLETED: "Completata",
  CANCELLED: "Annullata"
};

module.exports = {
  SERVICE_POINTS,
  SERVICES,
  ROLES,
  REQUEST_STATUS,
  AUTH_LVL
};
