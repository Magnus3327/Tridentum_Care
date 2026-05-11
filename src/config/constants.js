/**
 * TridentumCare - Costanti di Sistema Centralizzate
 * Questo file funge da "Single Source of Truth" (SST) per evitare disallineamenti di stringhe nel codice.
 */

const SERVICES = ["Trasporto", "Accompagnamento", "Compagnia"];

const ROLES = {
  VOLUNTEER: "volunteer",
  REQUESTER: "requester",
  PARTNER: "partner",
  ADMIN: "admin"
};

const REQUEST_STATUS = {
  PENDING: "In Attesa di Volontario",
  ACCEPTED: "Presa in Carico",
  COMPLETED: "Completata",
  CANCELLED: "Annullata"
};

const DEFAULT_POINTS = {
  REWARD_TASK: 100 // Punti assegnati di default per il completamento di un incarico
};

module.exports = {
  SERVICES,
  ROLES,
  REQUEST_STATUS,
  DEFAULT_POINTS
};
