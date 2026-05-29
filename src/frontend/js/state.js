// Router semplice per Single Page App e Stato Globale
const AUTH_LEVELS = {
    UNAUTHORIZED: 0,
    MODERATOR: 1,
    ADMIN: 2
};

const appState = {
    userRole: null, // 'requester', 'volunteer', 'partner', null
    userAuthLvl: AUTH_LEVELS.UNAUTHORIZED,
    userEmail: null, // email dell'utente loggato
    userId: null, // id utente reale estratto dal token
    userName: null, // nome dell'utente loggato per instant rendering
    points: 0,
    constants: null,
};

let currentRoute = 'home';
let previousRoute = 'home';
