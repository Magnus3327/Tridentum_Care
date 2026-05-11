// Router semplice per Single Page App e Stato Globale
const appState = {
    userRole: null, // 'requester', 'volunteer', 'partner', 'admin', null
    userEmail: null, // email dell'utente loggato
    userId: null, // id utente reale estratto dal token
    userName: null, // nome dell'utente loggato per instant rendering
    points: 0,
    constants: null,
};

async function fetchConstants() {
    if (appState.constants) return appState.constants;
    try {
        const response = await fetch('/api/constants');
        if (response.ok) {
            appState.constants = await response.json();
            return appState.constants;
        }
    } catch (e) {
        console.error("Errore nel caricamento delle costanti:", e);
    }
    return {
        SERVICES: ["Trasporto", "Accompagnamento", "Compagnia"]
    };
}

async function renderDynamicProfileSkills(userSkills = []) {
    const container = document.getElementById('profile-skills-container');
    if (!container) return;
    
    const consts = await fetchConstants();
    const services = consts.SERVICES || [];
    
    container.innerHTML = '';
    services.forEach(service => {
        const idSafe = `skill-${service.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`;
        const div = document.createElement('div');
        div.style = 'display: flex; align-items: center; gap: 0.75rem;';
        
        const isChecked = userSkills.includes(service) ? 'checked' : '';
        
        div.innerHTML = `
            <input type="checkbox" id="${idSafe}" data-service="${service}" ${isChecked} style="width: 1.25rem; height: 1.25rem; cursor: pointer;">
            <label for="${idSafe}" style="font-weight: 500; cursor: pointer;">${service}</label>
        `;
        container.appendChild(div);
    });
}

async function renderDynamicRequestServices() {
    const select = document.getElementById('req-serviceType');
    if (!select) return;
    
    const consts = await fetchConstants();
    const services = consts.SERVICES || [];
    
    select.innerHTML = '<option value="">Seleziona un servizio...</option>';
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = service;
        select.appendChild(option);
    });
}

// Mappatura della navigazione
const routes = {
    'home': 'view-public-home',
    'auth': 'view-public-auth',
    'recovery': 'view-public-recovery',
    'profile': 'view-shared-profile',
    'req-dashboard': 'view-req-dashboard',
    'req-form': 'view-req-form',
    'req-detail': 'view-req-detail',
    'vol-board': 'view-vol-board',
    'vol-store': 'view-vol-store',
    'partner-dash': 'view-partner-dash',
    'partner-coupon': 'view-partner-coupon',
    'admin-dash': 'view-admin-dash'
};

// Helper per fetch autenticate con JWT
async function authorizedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}

function navigateTo(routeId) {
    if (!routes[routeId]) return;
    
    // Nasconde tutte le viste
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
    });
    
    // Mostra la vista di destinazione
    const targetView = document.getElementById(routes[routeId]);
    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo(0, 0);
    }
    
    updateNavbar(routeId);

    // Caricamento dinamico dei dati in base alla vista
    if (routeId === 'req-dashboard') {
        loadRequesterDashboard();
    } else if (routeId === 'vol-board') {
        loadVolunteerDashboard();
    } else if (routeId === 'profile') {
        loadProfile();
    } else if (routeId === 'vol-store') {
        updateStorePoints();
    } else if (routeId === 'auth') {
        toggleRegisterRoleFields();
    }
}

function updateNavbar(routeId) {
    const navLinks = document.getElementById('dynamic-nav-links');
    if (!navLinks) return;
    
    let linksHTML = '';
    
    // Mostra i link in base alla vista corrente per simulare i ruoli
    if (routeId.startsWith('req-') || (routeId === 'profile' && appState.userRole === 'requester')) {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('req-dashboard')">Le mie richieste</a>
            <a href="#" class="nav-link" onclick="navigateTo('req-form')">Nuova richiesta</a>
            <a href="#" class="nav-link" onclick="navigateTo('profile')">Profilo</a>
            <a href="#" class="nav-link text-danger" onclick="logout()">Esci</a>
        `;
    } else if (routeId.startsWith('vol-') || (routeId === 'profile' && appState.userRole === 'volunteer')) {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('vol-board')">Bacheca</a>
            <a href="#" class="nav-link" onclick="navigateTo('vol-store')">Store Premi (${appState.points} pts)</a>
            <a href="#" class="nav-link" onclick="navigateTo('profile')">Profilo</a>
            <a href="#" class="nav-link text-danger" onclick="logout()">Esci</a>
        `;
    } else if (routeId.startsWith('partner-')) {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('partner-dash')">Dashboard</a>
            <a href="#" class="nav-link" onclick="navigateTo('partner-coupon')">Crea Coupon</a>
            <a href="#" class="nav-link text-danger" onclick="logout()">Esci</a>
        `;
    } else if (routeId.startsWith('admin-')) {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('admin-dash')">Moderazione</a>
            <a href="#" class="nav-link text-danger" onclick="logout()">Esci</a>
        `;
        }
    
    navLinks.innerHTML = linksHTML;
}

// Funzioni e logica per il requester
window.resetRequesterForm = function() {
    const form = document.getElementById('requester-form');
    if (form) form.reset();
    window.currentRequesterRequestId = null;
    const title = document.getElementById('req-form-title');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;
    if (title) title.innerText = 'Crea Nuova Richiesta di Aiuto';
    if (submitButton) submitButton.innerText = 'Invia Richiesta';
};

window.openNewRequesterRequest = async function() {
    resetRequesterForm();
    await renderDynamicRequestServices();
    navigateTo('req-form');
};

function getRequesterFormData() {
    return {
        serviceType: document.getElementById('req-serviceType')?.value,
        location: document.getElementById('req-location')?.value,
        date: document.getElementById('req-date')?.value,
        time: document.getElementById('req-time')?.value,
        notes: document.getElementById('req-notes')?.value || ''
    };
}

window.submitRequesterRequest = async function(event) {
    if (event) event.preventDefault();
    if (window.currentRequesterRequestId) {
        return updateRequesterRequest(window.currentRequesterRequestId);
    }
    return createRequesterRequest();
};

window.createRequesterRequest = async function() {
    const payload = getRequesterFormData();
    if (!payload.serviceType || !payload.location || !payload.date || !payload.time) {
        showToast('Compila tutti i campi richiesti prima di inviare la richiesta.', 'danger');
        return;
    }

    // Validazione data futura
    const requestDate = new Date(`${payload.date}T${payload.time}`);
    if (isNaN(requestDate.getTime()) || requestDate <= new Date()) {
        showToast('La data e ora della richiesta devono essere valide e future.', 'danger');
        return;
    }

    try {
        const response = await authorizedFetch('/api/requester/requests', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Impossibile creare la richiesta.'}`, 'danger');
            return;
        }

        showToast('Richiesta creata con successo.', 'success');
        navigateTo('req-dashboard');
    } catch (error) {
        console.error('Errore nella creazione della richiesta:', error);
        showToast('Si è verificato un errore durante l\'invio della richiesta.', 'danger');
    }
};

window.openRequesterEdit = async function(requestId) {
    const req = (window.requesterRequestsCache || []).find(r => r._id === requestId);
    if (!req) return;
    if (!isRequesterRequestEditable(req)) {
        showToast('Non è possibile modificare questa richiesta.', 'danger');
        return;
    }

    const form = document.getElementById('requester-form');
    if (!form) return;

    await renderDynamicRequestServices();

    document.getElementById('req-serviceType').value = req.serviceType;
    document.getElementById('req-location').value = req.location;
    document.getElementById('req-date').value = req.date;
    document.getElementById('req-time').value = req.time;
    document.getElementById('req-notes').value = req.notes || '';

    window.currentRequesterRequestId = requestId;
    document.getElementById('req-form-title').innerText = 'Modifica Richiesta';
    form.querySelector('button[type="submit"]').innerText = 'Salva Modifiche';
    navigateTo('req-form');
};

window.isRequesterRequestEditable = function(req) {
    if (!req) return false;
    if (req.status !== 'In Attesa di Volontario') return false;
    const now = new Date();
    const requestDate = new Date(`${req.date}T${req.time}`);
    return requestDate > now;
};

window.canRequesterComplete = function(req) {
    return req && req.status === 'In Corso';
};

window.canRequesterCancel = function(req) {
    if (!req) return false;
    if (req.status !== 'In Attesa di Volontario') return false;
    const now = new Date();
    const requestDate = new Date(`${req.date}T${req.time}`);
    return requestDate > now;
};

window.canRequesterRate = function(req) {
    return req && req.status === 'Completata';
};

window.renderRequesterRatingSection = function(req) {
    const ratingSection = document.getElementById('req-detail-rating-section');
    const ratingContent = document.getElementById('req-detail-rating-content');
    if (!ratingSection || !ratingContent) return;

    if (!window.canRequesterRate(req)) {
        ratingSection.style.display = 'none';
        ratingContent.innerHTML = '';
        return;
    }

    ratingSection.style.display = 'block';
    if (typeof req.rating === 'number' && req.rating > 0) {
        ratingContent.innerHTML = `
            <p style="margin: 0 0 0.75rem;">Hai già valutato questa richiesta con <strong>${req.rating} su 5</strong>.</p>
            <p style="margin: 0;">${req.review ? req.review : 'Nessuna recensione aggiunta.'}</p>
        `;
        return;
    }

    ratingContent.innerHTML = `
        <div class="form-group">
            <label class="form-label">Valutazione</label>
            <select id="req-rating" class="form-control form-control-lg">
                <option value="">Seleziona una valutazione...</option>
                <option value="5">5 - Ottimo</option>
                <option value="4">4 - Molto Buono</option>
                <option value="3">3 - Buono</option>
                <option value="2">2 - Sufficiente</option>
                <option value="1">1 - Insufficiente</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Commento (opzionale)</label>
            <textarea id="req-review" class="form-control form-control-lg" rows="3" placeholder="Racconta brevemente com'è andata."></textarea>
        </div>
        <button class="btn btn-secondary btn-large btn-block" onclick="submitRequesterRating(window.currentRequesterRequestId)">Invia Valutazione</button>
    `;
};

window.submitRequesterRating = async function(requestId) {
    if (!requestId) return;

    const ratingValue = parseInt(document.getElementById('req-rating')?.value, 10);
    const review = document.getElementById('req-review')?.value || '';

    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
        showToast('Seleziona una valutazione valida da 1 a 5.', 'danger');
        return;
    }

    try {
        const response = await authorizedFetch(`/api/requester/requests/${encodeURIComponent(requestId)}/rating`, {
            method: 'PUT',
            body: JSON.stringify({ rating: ratingValue, review })
        });

        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Impossibile salvare la valutazione.'}`, 'danger');
            return;
        }

        showToast('Valutazione inviata con successo.', 'success');
        navigateTo('req-dashboard');
    } catch (error) {
        console.error('Errore nella valutazione della richiesta:', error);
        showToast('Si è verificato un errore durante l invio della valutazione.', 'danger');
    }
};

window.updateRequesterRequest = async function(requestId) {
    const payload = getRequesterFormData();
    if (!payload.serviceType || !payload.location || !payload.date || !payload.time) {
        showToast('Compila tutti i campi richiesti prima di salvare le modifiche.', 'danger');
        return;
    }

    // Validazione data futura
    const requestDate = new Date(`${payload.date}T${payload.time}`);
    if (isNaN(requestDate.getTime()) || requestDate <= new Date()) {
        showToast('La data e ora della richiesta devono essere valide e future.', 'danger');
        return;
    }

    try {
        const response = await authorizedFetch(`/api/requester/requests/${encodeURIComponent(requestId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Impossibile aggiornare la richiesta.'}`, 'danger');
            return;
        }

        showToast('Richiesta aggiornata con successo.', 'success');
        navigateTo('req-dashboard');
    } catch (error) {
        console.error('Errore nell\'aggiornamento della richiesta:', error);
        showToast('Si è verificato un errore durante l\'aggiornamento della richiesta.', 'danger');
    }
};

window.loadRequesterDashboard = async function() {
    const container = document.getElementById('requester-requests-container');
    if (!container) return;

    // Mostra istantaneamente il nome salvato in stato locale per evitare sfarfallii
    const welcomeName = document.getElementById("requester-welcome-name");
    if (welcomeName && appState.userName) {
        welcomeName.innerText = appState.userName;
    }

    // Carica/Aggiorna il nome reale del richiedente per il banner di benvenuto
    try {
        const profileRes = await authorizedFetch('/api/requester/profile');
        if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile.name) {
                appState.userName = profile.name;
                if (welcomeName) {
                    welcomeName.innerText = profile.name;
                }
            }
        }
    } catch (e) {
        console.error("Errore nel caricamento del nome richiedente:", e);
    }

    try {
        const response = await authorizedFetch('/api/requester/requests');
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const message = errorData?.error || 'Impossibile caricare le richieste.';
            throw new Error(message);
        }

        const requests = await response.json();
        if (!Array.isArray(requests) || requests.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted" style="padding: 2rem;">
                    <i class="fa-solid fa-clipboard-question" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p style="margin: 0; font-weight: 600;">Non ci sono richieste per il momento.</p>
                    <p style="margin: 0.5rem 0 0;">Crea una nuova richiesta per avere aiuto dai volontari.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; width: 100%;">';
        requests.forEach(req => {
            const badgeClass = req.status === 'Completata' ? 'badge-success' : req.status === 'Annullata' ? 'badge-danger' : 'badge-warning';
            html += `
                <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; min-height: 260px;">
                    <div>
                        <div class="flex justify-between items-center" style="margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
                            <span class="badge ${badgeClass}">${req.status}</span>
                            <span style="font-size: 0.9rem; color: var(--text-muted);">${req.date} ${req.time}</span>
                        </div>
                        <h3 style="margin: 0 0 0.75rem;">${req.serviceType}</h3>
                        <p style="margin: 0.25rem 0; color: var(--text-muted);">${req.location}</p>
                        <p style="margin: 1rem 0 0; color: var(--text-dark);">${req.notes || 'Nessuna nota aggiuntiva.'}</p>
                    </div>
                    <button class="btn btn-outline btn-block btn-sm" onclick="openRequesterDetail('${req._id}')">Vedi Dettagli</button>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        window.requesterRequestsCache = requests;
    } catch (error) {
        console.error('Errore nel caricamento delle richieste requester:', error);
        container.innerHTML = `
            <div class="card text-center text-danger" style="padding: 2rem;">
                <p>Impossibile caricare le tue richieste in questo momento. Riprova più tardi.</p>
            </div>
        `;
    }
};

window.openRequesterDetail = function(requestId) {
    const req = (window.requesterRequestsCache || []).find(r => r._id === requestId);
    if (!req) return;

    window.currentRequesterRequestId = requestId;
    document.getElementById('req-detail-status').innerText = req.status;
    document.getElementById('req-detail-title').innerText = req.serviceType;
    document.getElementById('req-detail-date').innerText = req.date;
    document.getElementById('req-detail-time').innerText = req.time;
    document.getElementById('req-detail-location').innerText = req.location;
    document.getElementById('req-detail-notes').innerText = req.notes || 'Nessuna nota aggiuntiva.';

    const cancelBtn = document.getElementById('req-detail-cancel-btn');
    const completeBtn = document.getElementById('req-detail-complete-btn');
    const editBtn = document.getElementById('req-detail-edit-btn');
    const editable = isRequesterRequestEditable(req);
    const canComplete = window.canRequesterComplete(req);
    const canCancel = window.canRequesterCancel(req);

    // Nasconde completamente i bottoni per richieste completate o annullate
    if (req.status === 'Annullata' || req.status === 'Completata') {
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (completeBtn) completeBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
    } else {
        // Mostra i bottoni e gestisci la loro abilitazione
        if (cancelBtn) {
            cancelBtn.style.display = canCancel ? 'inline-block' : 'none';
        }
        if (completeBtn) {
            completeBtn.style.display = canComplete ? 'inline-block' : 'none';
        }
        if (editBtn) {
            editBtn.style.display = editable ? 'inline-block' : 'none';
        }
    }

    window.renderRequesterRatingSection(req);
    navigateTo('req-detail');
};

window.updateRequesterStatus = async function(requestId, status) {
    if (!requestId) return;

    try {
        const response = await authorizedFetch(`/api/requester/requests/${encodeURIComponent(requestId)}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Non è stato possibile aggiornare lo stato.'}`, 'danger');
            return;
        }

        showToast('Stato aggiornato con successo.', 'success');
        await loadRequesterDashboard();
        if (window.currentRequesterRequestId === requestId) {
            navigateTo('req-dashboard');
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento dello stato:', error);
        showToast('Si è verificato un errore durante l\'aggiornamento dello stato.', 'danger');
    }
};

window.cancelRequesterRequest = async function(requestId) {
    if (!requestId) return;

    try {
        const response = await authorizedFetch(`/api/requester/requests/${encodeURIComponent(requestId)}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Non è stato possibile annullare la richiesta.'}`, 'danger');
            return;
        }

        showToast('Richiesta annullata con successo.', 'success');
        navigateTo('req-dashboard');
    } catch (error) {
        console.error('Errore nell\'annullamento della richiesta:', error);
        showToast('Si è verificato un errore durante l\'annullamento della richiesta.', 'danger');
    }
};

// Funzioni per i Modal
window.openModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
}
window.closeModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}

window.showQRCode = function(name, code) {
    document.getElementById("qr-modal-title").innerText = name;
    document.getElementById("qr-modal-code").innerText = code;
    document.getElementById("qr-modal-image").src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
    openModal("qr-code-modal");
}

// Sistema di Notifiche Globali
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '2rem';
        container.style.right = '2rem';
        container.style.zIndex = '10000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.75rem';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'success' ? 'var(--primary-color, #1a5f7a)' : 'var(--danger-color, #dc3545)';
    toast.style.color = 'white';
    toast.style.padding = '0.85rem 1.5rem';
    toast.style.borderRadius = 'var(--radius-md, 8px)';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
    toast.style.fontSize = '0.875rem';
    toast.style.fontWeight = '500';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.5rem';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    const icon = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation';
    toast.innerHTML = `<i class="${icon}" style="font-size: 1rem;"></i> <span>${message}</span>`;

    container.appendChild(toast);

    // Effetto di entrata
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 50);

    // Effetto di uscita e rimozione
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-15px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Helper per il logout reale
window.logout = function() {
    localStorage.removeItem('token');
    appState.userRole = null;
    appState.userEmail = null;
    appState.userId = null;
    appState.points = 0;
    navigateTo('home');
    showToast('Hai disconnesso il profilo correttamente.', 'success');
}

window.togglePasswordVisibility = function(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);
    if (passwordInput && toggleIcon) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            toggleIcon.classList.remove("fa-eye");
            toggleIcon.classList.add("fa-eye-slash");
        } else {
            passwordInput.type = "password";
            toggleIcon.classList.remove("fa-eye-slash");
            toggleIcon.classList.add("fa-eye");
        }
    }
}

// Funzioni per l'autenticazione reale e tabbed login/register
window.openAuth = function(mode) {
    navigateTo('auth');
    setTimeout(() => {
        toggleAuthMode(mode);
    }, 50);
};

window.toggleAuthMode = function(mode) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    
    if (!loginForm || !registerForm || !tabLogin || !tabRegister) return;
    
    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        
        tabLogin.style.borderBottom = '3px solid var(--primary-color)';
        tabLogin.style.color = 'var(--primary-color)';
        
        tabRegister.style.borderBottom = '3px solid transparent';
        tabRegister.style.color = 'var(--text-muted)';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        
        tabLogin.style.borderBottom = '3px solid transparent';
        tabLogin.style.color = 'var(--text-muted)';
        
        tabRegister.style.borderBottom = '3px solid var(--secondary-color, var(--primary-color))';
        tabRegister.style.color = 'var(--secondary-color, var(--primary-color))';
    }
};

window.toggleRegisterRoleFields = function() {
    const roleSelect = document.getElementById('reg-role');
    const volunteerFields = document.getElementById('reg-volunteer-fields');
    if (!roleSelect || !volunteerFields) return;
    
    if (roleSelect.value === 'volunteer') {
        volunteerFields.style.display = 'block';
    } else {
        volunteerFields.style.display = 'none';
    }
};

// Funzione di gestione degli eventi dei form caricati dinamicamente
function bindAuthEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (!response.ok) {
                    showToast(data.error || 'Credenziali non valide', 'danger');
                    return;
                }

                // Salva token e ripristina lo stato globale
                localStorage.setItem('token', data.token);
                appState.userRole = data.user.role;
                appState.userEmail = data.user.email;
                appState.userId = data.user.id;
                appState.userName = data.user.name;
                appState.points = data.user.points || 0;

                showToast(data.message, 'success');

                // Reindirizzamento basato sul ruolo
                if (data.user.role === 'volunteer') {
                    navigateTo('vol-board');
                } else if (data.user.role === 'requester') {
                    navigateTo('req-dashboard');
                } else {
                    navigateTo('home');
                }
            } catch (error) {
                console.error('Errore login:', error);
                showToast('Errore durante l\'accesso. Controlla la connessione.', 'danger');
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const surname = document.getElementById('reg-surname').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;

            const payload = { name, surname, email, password, role };

            if (role === 'volunteer') {
                const ageVal = document.getElementById('reg-age').value;
                if (!ageVal) {
                    showToast('L\'età è obbligatoria per registrarsi come volontario.', 'danger');
                    return;
                }
                const age = parseInt(ageVal);
                if (age < 18) {
                    showToast('Un volontario deve essere maggiorenne (Età >= 18)!', 'danger');
                    return;
                }
                payload.age = age;
                payload.gender = document.getElementById('reg-gender').value;
                payload.license = document.getElementById('reg-license').value;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (!response.ok) {
                    showToast(data.error || 'Impossibile completare la registrazione.', 'danger');
                    return;
                }

                // Salva token e aggiorna stato
                localStorage.setItem('token', data.token);
                appState.userRole = data.user.role;
                appState.userEmail = data.user.email;
                appState.userId = data.user.id;
                appState.points = data.user.points || 0;

                showToast(data.message, 'success');

                if (data.user.role === 'volunteer') {
                    navigateTo('vol-board');
                } else if (data.user.role === 'requester') {
                    navigateTo('req-dashboard');
                } else {
                    navigateTo('home');
                }
            } catch (error) {
                console.error('Errore registrazione:', error);
                showToast('Errore durante la registrazione. Riprova più tardi.', 'danger');
            }
        });
    }
}

// ==========================================
// AZIONI VOLONTARIO E LOGICA BACHECA
// ==========================================

async function loadVolunteerDashboard() {
    try {
        const response = await authorizedFetch('/api/volunteer/profile');
        if (response.ok) {
            const profile = await response.json();
            appState.points = profile.points || 0;
            appState.skills = profile.skills || [];
            
            // Imposta i valori nella dashboard
            const welcomeName = document.getElementById("volunteer-welcome-name");
            const headerPoints = document.getElementById("volunteer-header-points");
            if (welcomeName) welcomeName.innerText = profile.name || "Volontario";
            if (headerPoints) headerPoints.innerHTML = `${profile.points} <span style="font-size: 1rem;">pts</span>`;
            
            // Aggiorna il filtro categorie basato sulle competenze
            const filterSelect = document.getElementById("request-category-filter");
            if (filterSelect) {
                let optionsHtml = '<option value="Tutti i servizi">Tutti i servizi</option>';
                appState.skills.forEach(skill => {
                    optionsHtml += `<option value="${skill}">${skill}</option>`;
                });
                const currentVal = filterSelect.value;
                filterSelect.innerHTML = optionsHtml;
                if (appState.skills.includes(currentVal) || currentVal === "Tutti i servizi") {
                    filterSelect.value = currentVal;
                } else {
                    filterSelect.value = "Tutti i servizi";
                }
            }

            // Sincronizza con l'anteprima dei punti nella navbar
            updateNavbar('vol-board');
        }
    } catch (e) {
        console.error("Errore nel caricamento del profilo volontario:", e);
    }
    
    // Carica le liste
    loadActiveRequests();
    loadMyTasks();
}

window.loadActiveRequests = async function() {
    const container = document.getElementById("volunteer-requests-container");
    if (!container) return;

    const filterSelect = document.getElementById("request-category-filter");
    const category = filterSelect ? filterSelect.value : "Tutti i servizi";

    try {
        const url = `/api/volunteer/requests?category=${encodeURIComponent(category)}`;
        const response = await authorizedFetch(url);
        if (!response.ok) throw new Error("Errore nel caricamento richieste");

        const requests = await response.json();
        
        if (requests.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted" style="padding: 3rem 0; grid-column: span 2;">
                    <i class="fa-solid fa-clipboard-question" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p style="font-weight: 500; margin-bottom: 0;">Nessuna richiesta attiva compatibile disponibile al momento.</p>
                    <small>Riprova più tardi, cambia filtro o aggiungi competenze nel tuo profilo.</small>
                </div>
            `;
            return;
        }

        let html = '<div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; width: 100%;">';
        
        requests.forEach(req => {
            const badgeClass = getCategoryBadgeClass(req.category);
            html += `
                <div class="card flex flex-col justify-between" style="padding: 1.5rem; height: 100%;">
                    <div>
                        <div class="flex justify-between items-center" style="margin-bottom: 0.75rem;">
                            <span class="badge ${badgeClass}">${req.category}</span>
                            <span style="font-weight: bold; color: var(--accent-color); font-size: 0.95rem;">+${req.points} pts</span>
                        </div>
                        <h3 style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--primary-color);">${req.title}</h3>
                        <p class="text-muted" style="font-size: 0.875rem; margin-bottom: 0.5rem;">
                            <i class="fa-solid fa-location-dot text-primary"></i> ${req.address}
                        </p>
                        <p style="font-size: 0.875rem; margin-bottom: 1rem; color: var(--text-dark);">
                            <i class="fa-regular fa-clock text-secondary"></i> ${req.dateTime}
                        </p>
                        <p style="font-size: 0.9rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 1.5rem;">
                            ${req.description}
                        </p>
                    </div>
                    <button class="btn btn-outline btn-block btn-sm" onclick="showRequestDetails('${req._id}')">Vedi Dettagli</button>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        window.activeRequestsCache = requests;
    } catch (e) {
        console.error("Errore nel caricamento delle richieste:", e);
        container.innerHTML = `
            <div class="card text-center text-danger" style="padding: 2rem;">
                <p>Impossibile caricare le richieste attive in questo momento.</p>
            </div>
        `;
    }
}

function getCategoryBadgeClass(cat) {
    if (cat === "Trasporto") return "badge-primary";
    if (cat === "Accompagnamento") return "badge-success";
    if (cat === "Compagnia") return "badge-warning";
    return "badge-primary";
}

window.showRequestDetails = function(requestId) {
    const req = window.activeRequestsCache.find(r => r._id === requestId);
    if (!req) return;

    const modal = document.getElementById("vol-req-detail-modal");
    if (!modal) return;

    document.getElementById("modal-req-title").innerText = req.title;
    document.getElementById("modal-req-requester").innerHTML = `<i class="fa-solid fa-user"></i> <strong>Richiedente:</strong> ${req.requesterName}`;
    document.getElementById("modal-req-address").innerText = req.address;
    document.getElementById("modal-req-datetime").innerText = req.dateTime;
    document.getElementById("modal-req-points").innerText = `+${req.points} pts`;
    document.getElementById("modal-req-description").innerText = req.description;

    const badge = document.getElementById("modal-req-badge");
    badge.innerText = req.category;
    badge.className = `badge ${getCategoryBadgeClass(req.category)}`;

    const acceptBtn = document.getElementById("modal-accept-btn");
    acceptBtn.onclick = async function() {
        await acceptRequest(req._id);
        closeModal("vol-req-detail-modal");
    };

    openModal("vol-req-detail-modal");
}

async function acceptRequest(requestId) {
    try {
        const response = await authorizedFetch(`/api/volunteer/requests/${requestId}/accept`, {
            method: "POST"
        });
        
        const data = await response.json();
        if (response.ok) {
            showToast("Richiesta Accettata con successo! L'attività è stata aggiunta ai tuoi incarichi.", "success");
            loadVolunteerDashboard();
        } else {
            showToast(`Errore: ${data.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nell'accettazione dell'incarico:", e);
        showToast("Si è verificato un errore durante l'operazione di presa in carico.", "danger");
    }
}

async function loadMyTasks() {
    const container = document.getElementById("volunteer-my-tasks-container");
    if (!container) return;

    try {
        const response = await authorizedFetch('/api/volunteer/my-tasks');
        if (!response.ok) throw new Error("Errore nel caricamento dei propri compiti");

        const tasks = await response.json();

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted" style="padding: 2rem 1rem; border: 2px dashed var(--border-color); border-radius: var(--radius-lg); background: var(--surface-color);">
                    <i class="fa-solid fa-hands-holding" style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-muted);"></i>
                    <p style="font-size: 0.875rem; margin-bottom: 0;">Nessun incarico in corso. Accetta qualche richiesta in bacheca per aiutare!</p>
                </div>
            `;
            return;
        }

        let html = '';
        tasks.forEach(task => {
            const badgeClass = getCategoryBadgeClass(task.category);
            html += `
                <div class="card" style="padding: 1.25rem; border-left: 5px solid var(--secondary-color); margin-bottom: 1rem;">
                    <div class="flex justify-between items-start" style="margin-bottom: 0.5rem;">
                        <span class="badge ${badgeClass}">${task.category}</span>
                        <span style="font-weight: bold; color: var(--accent-color); font-size: 0.875rem;">+${task.points} pts</span>
                    </div>
                    <h4 style="font-size: 1rem; margin-bottom: 0.25rem; color: var(--primary-color);">${task.title}</h4>
                    <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.25rem;">
                        <i class="fa-solid fa-location-dot"></i> ${task.address}
                    </p>
                    <p style="font-size: 0.8rem; margin-bottom: 0.75rem; color: var(--text-dark);">
                        <i class="fa-regular fa-clock"></i> ${task.dateTime}
                    </p>
                    <div style="background: var(--background-light); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem; margin-bottom: 1rem; border-left: 2px solid var(--border-color);">
                        <strong>Richiedente:</strong> ${task.requesterName}<br>
                        <strong>Note:</strong> ${task.description}
                    </div>
                    <button type="button" class="btn btn-outline btn-block" style="padding: 0.5rem 1rem; font-size: 0.875rem; border-color: var(--danger-color); color: var(--danger-color);" onclick="event.preventDefault(); event.stopPropagation(); cancelTask('${task._id}')">
                        <i class="fa-solid fa-rectangle-xmark" style="margin-right: 0.5rem;"></i> Annulla Presa in Carico
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (e) {
        console.error("Errore nel caricamento dei propri incarichi:", e);
        container.innerHTML = `<p class="text-danger" style="font-size: 0.875rem;">Impossibile caricare gli incarichi.</p>`;
    }
}

window.cancelTask = async function(taskId) {
    try {
        const response = await authorizedFetch(`/api/volunteer/requests/${taskId}/cancel`, {
            method: "POST"
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Presa in carico annullata. La richiesta è tornata in bacheca!", "success");
            loadVolunteerDashboard();
        } else {
            showToast(`Errore: ${data.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nell'annullamento dell'incarico:", e);
        showToast("Si è verificato un errore durante l'annullamento.", "danger");
    }
}

function updateStorePoints() {
    const pointsBal = document.getElementById("store-points-balance");
    if (pointsBal) {
        pointsBal.innerHTML = `${appState.points} <span style="font-size: 1.5rem;">pts</span>`;
    }
}

// ==========================================
// CARICAMENTO E SALVATAGGIO PROFILO
// ==========================================

window.loadProfile = async function() {
    const role = appState.userRole;
    if (!role) {
        showToast("Devi effettuare il login per visualizzare il profilo.", "danger");
        navigateTo('auth');
        return;
    }
    
    const roleBadge = document.getElementById("profile-role-badge");
    if (roleBadge) {
        if (role === 'volunteer') {
            roleBadge.innerText = `Volontario (${appState.points} pts)`;
            roleBadge.className = "badge badge-success";
        } else {
            roleBadge.innerText = "Richiedente";
            roleBadge.className = "badge badge-primary";
        }
    }

    const volunteerFields = document.getElementById("profile-volunteer-fields");
    const volunteerCoupons = document.getElementById("profile-volunteer-coupons");
    if (volunteerFields) {
        volunteerFields.style.display = (role === 'volunteer') ? 'block' : 'none';
    }
    if (volunteerCoupons) {
        volunteerCoupons.style.display = (role === 'volunteer') ? 'block' : 'none';
    }

    try {
        let profileEndpoint;
        if (role === 'volunteer') {
            profileEndpoint = '/api/volunteer/profile';
        } else if (role === 'requester') {
            profileEndpoint = '/api/requester/profile';
        } else {
            showToast("Ruolo utente non valido. Effettua nuovamente il login.", "danger");
            navigateTo('auth');
            return;
        }

        const response = await authorizedFetch(profileEndpoint);
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const message = errorData?.error || `Errore ${response.status}`;
            throw new Error(message);
        }

        const profile = await response.json();

        document.getElementById("profile-name").value = profile.name || "";
        document.getElementById("profile-surname").value = profile.surname || "";
        document.getElementById("profile-email").value = profile.email || appState.userEmail;
        document.getElementById("profile-phone").value = profile.phone || "";
        document.getElementById("profile-address").value = profile.address || "";

        if (role === 'volunteer') {
            const skills = profile.skills || [];
            await renderDynamicProfileSkills(skills);

            if (document.getElementById("profile-age")) document.getElementById("profile-age").value = profile.age || "";
            if (document.getElementById("profile-license")) document.getElementById("profile-license").value = profile.license || "";
            if (document.getElementById("profile-gender")) document.getElementById("profile-gender").value = profile.gender || "";

            const couponsList = document.getElementById("volunteer-coupons-list");
            if (couponsList) {
                const coupons = profile.coupons || [];
                if (coupons.length === 0) {
                    couponsList.innerHTML = `<p class="text-muted" style="font-size: 0.875rem; grid-column: span 2;">Nessun coupon acquistato.</p>`;
                } else {
                    let html = '';
                    coupons.forEach(c => {
                        const dateStr = c.acquiredAt ? new Date(c.acquiredAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data sconosciuta';
                        html += `
                            <div class="card flex justify-between items-center" style="padding: 1rem;">
                                <div>
                                    <h4 style="margin-bottom: 0.25rem;">${c.name}</h4>
                                    <small class="text-muted" style="display: block; margin-bottom: 0.25rem;">Codice: <span style="font-family: monospace; font-weight: bold;">${c.code}</span></small>
                                    <small class="text-muted"><i class="fa-regular fa-clock"></i> Acquistato il:<br> ${dateStr}</small>
                                </div>
                                <button type="button" class="btn btn-outline btn-sm" onclick="showQRCode('${c.name}', '${c.code}')">Mostra QR</button>
                            </div>
                        `;
                    });
                    couponsList.innerHTML = html;
                }
            }
        }
    } catch (e) {
        console.error("Errore nel caricamento del profilo:", e);
    }
}

window.saveProfile = async function(event) {
    if (event) event.preventDefault();

    const role = appState.userRole;
    if (!role) {
        showToast("Devi effettuare il login per modificare il profilo.", "danger");
        navigateTo('auth');
        return;
    }

    const email = document.getElementById("profile-email").value;
    const name = document.getElementById("profile-name").value;
    const surname = document.getElementById("profile-surname").value;
    const phone = document.getElementById("profile-phone").value;
    const address = document.getElementById("profile-address").value;

    // Validazioni di base
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Inserisci un indirizzo email valido.', 'danger');
        return;
    }
    if (!name || name.length < 2) {
        showToast('Il nome deve avere almeno 2 caratteri.', 'danger');
        return;
    }
    if (!surname || surname.length < 2) {
        showToast('Il cognome deve avere almeno 2 caratteri.', 'danger');
        return;
    }
    if (phone && !/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ''))) {
        showToast('Inserisci un numero di telefono valido (10-15 cifre).', 'danger');
        return;
    }
    if (!address || address.length < 5) {
        showToast('L\'indirizzo deve avere almeno 5 caratteri.', 'danger');
        return;
    }

    const profileData = {
        email,
        name,
        surname,
        phone,
        address
    };

    if (role === 'volunteer') {
        const ageInput = document.getElementById("profile-age");
        const age = ageInput && ageInput.value !== "" ? parseInt(ageInput.value) : null;
        const license = document.getElementById("profile-license") ? document.getElementById("profile-license").value : "";
        const gender = document.getElementById("profile-gender") ? document.getElementById("profile-gender").value : "";

        // L'età deve essere >= 18 (maggiorenne)
        if (age !== null && age < 18) {
            showToast("Un volontario deve essere maggiorenne (Età >= 18)!", "danger");
            return;
        }

        const skills = [];
        const container = document.getElementById('profile-skills-container');
        if (container) {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    skills.push(cb.getAttribute('data-service'));
                }
            });
        }
        
        profileData.skills = skills;
        profileData.age = age;
        profileData.license = license;
        profileData.gender = gender;
    }

    try {
        let profileEndpoint;
        if (role === 'volunteer') {
            profileEndpoint = '/api/volunteer/profile';
        } else if (role === 'requester') {
            profileEndpoint = '/api/requester/profile';
        } else {
            showToast("Ruolo utente non valido. Effettua nuovamente il login.", "danger");
            navigateTo('auth');
            return;
        }

        const response = await authorizedFetch(profileEndpoint, {
            method: "PUT",
            body: JSON.stringify(profileData)
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok) {
            showToast("Profilo aggiornato con successo!", "success");
            if (role === 'volunteer') {
                loadVolunteerDashboard();
            }
        } else {
            showToast(`Errore: ${result.error || `HTTP ${response.status}`}`, "danger");
        }
    } catch (e) {
        console.error("Errore nel salvataggio del profilo:", e);
        showToast("Si è verificato un errore durante l'aggiornamento.", "danger");
    }
}

window.buyCoupon = async function(couponName, costoPunti) {
    if ((appState.points || 0) < costoPunti) {
        showToast(`Punti insufficienti per riscattare "${couponName}" (Costo: ${costoPunti} pts, Tuo saldo: ${appState.points} pts)`, "danger");
        return;
    }

    try {
        const response = await authorizedFetch(`/api/volunteer/coupons/redeem`, {
            method: "POST",
            body: JSON.stringify({ couponName, costoPunti })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Coupon "${couponName}" acquistato con successo! Saldo ricalcolato.`, "success");
            
            appState.points = data.newPoints;
            
            const storePointsEl = document.getElementById("store-points-balance");
            if (storePointsEl) storePointsEl.innerHTML = `${data.newPoints} <span style="font-size: 1.5rem;">pts</span>`;
            
            const roleBadge = document.getElementById("profile-role-badge");
            if (roleBadge) roleBadge.innerText = `Volontario (${data.newPoints} pts)`;

            const volunteerHeaderPoints = document.getElementById("volunteer-header-points");
            if (volunteerHeaderPoints) volunteerHeaderPoints.innerHTML = `${data.newPoints} <span style="font-size: 1rem;">pts</span>`;

            updateNavbar('vol-store');
        } else {
            showToast(`Errore: ${data.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nel riscatto del coupon:", e);
        showToast("Si è verificato un errore durante il riscatto.", "danger");
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Inject Font Awesome per icone
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);
    
    // Inject Google Fonts
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(fonts);

    // Carica dinamicamente i template delle viste HTML nel container
    const viewFiles = ['public.html', 'shared.html', 'requester.html', 'volunteer.html', 'partner.html', 'admin.html'];
    const container = document.getElementById('app-container');
    
    try {
        for (const file of viewFiles) {
            const response = await fetch(`/views/${file}?t=${Date.now()}`);
            if (response.ok) {
                const html = await response.text();
                container.innerHTML += html;
            }
        }

        // Teletrasporta le sovrapposizioni MODAL al body per bypassare restrizioni di stile parent
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            document.body.appendChild(modal);
        });

        // Configura gli handler di submit per login e registrazione (caricati ora nel DOM)
        bindAuthEvents();

    } catch (e) {
        console.error("Errore nel caricamento delle viste o bind degli eventi:", e);
    }

    // Ripristina la sessione utente se è presente un token JWT valido in localStorage
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                appState.userRole = data.role;
                appState.userEmail = data.email;
                appState.userId = data.id;
                appState.userName = data.name;
                appState.points = data.points || 0;
                
                showToast(`Bentornato, ${data.name}!`, 'success');
                if (data.role === 'volunteer') {
                    navigateTo('vol-board');
                } else if (data.role === 'requester') {
                    navigateTo('req-dashboard');
                } else {
                    navigateTo('home');
                }
                return;
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Errore nel ripristino della sessione:', error);
            localStorage.removeItem('token');
        }
    }

    // Se non è loggato, naviga alla home pubblica
    navigateTo('home');
});
