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

window.adminUsersCache = [];

let currentRoute = 'home';
let previousRoute = 'home';

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

function getRoleLabel(user) {
    if (!user) return 'Utente';
    if (user.role === 'volunteer') {
        if (typeof user.authLvl === 'number') {
            if (user.authLvl === AUTH_LEVELS.ADMIN) return 'Admin';
            if (user.authLvl === AUTH_LEVELS.MODERATOR) return 'Moderatore';
        }
        return 'Volontario';
    }
    if (user.role === 'requester') return 'Richiedente';
    if (user.role === 'partner') return 'Partner';
    return 'Utente';
}

function getUserAuthLevel(user) {
    if (!user) return -1;
    if (user.role === 'volunteer') return typeof user.authLvl === 'number' ? user.authLvl : AUTH_LEVELS.UNAUTHORIZED;
    return AUTH_LEVELS.UNAUTHORIZED;
}

function buildAdminSearchParams() {
    const searchInput = document.getElementById('admin-user-search');
    const roleFilter = document.getElementById('admin-user-role-filter');
    const query = searchInput ? searchInput.value.trim() : '';
    const role = roleFilter ? roleFilter.value : '';

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (role) params.set('role', role);
    return params.toString();
}

function renderAdminUserCard(user) {
    const roleLabel = getRoleLabel(user);
    const authLabel = user.role === 'volunteer' && typeof user.authLvl === 'number'
        ? user.authLvl === AUTH_LEVELS.ADMIN ? 'Admin' : user.authLvl === AUTH_LEVELS.MODERATOR ? 'Moderatore' : 'Non autorizzato'
        : null;
    let fullName = [user.name, user.surname].filter(Boolean).join(' ').trim();
    if (!fullName) {
        fullName = user.role === 'partner' ? 'Account Partner' : 'Utente senza nome';
    }
    const sameUser = appState.userId && user.id === appState.userId;
    const targetAuthLevel = getUserAuthLevel(user);
    const actorAuthLevel = appState.userAuthLvl || AUTH_LEVELS.UNAUTHORIZED;
    const isAdmin = actorAuthLevel === AUTH_LEVELS.ADMIN;
    const canPromote = isAdmin && user.role === 'volunteer' && targetAuthLevel < AUTH_LEVELS.ADMIN;
    const canDelete = isAdmin && targetAuthLevel < actorAuthLevel && !sameUser;
    const canSuspend = targetAuthLevel < actorAuthLevel && !sameUser && !user.isSuspended;
    const canRestore = targetAuthLevel < actorAuthLevel && !sameUser && user.isSuspended;
    const suspensionCount = user.suspensionCount || 0;

    let promoteHtml = '';
    if (canPromote) {
        promoteHtml = `
            <div class="dropdown-wrapper" style="position: relative; display: inline-block;">
                <button type="button" class="btn btn-outline" style="padding: 0.5rem 0.75rem; border-color: var(--primary-color); color: var(--primary-color);" onclick="window.togglePromoteDropdown(event, '${user.id || user._id}')" title="Opzioni di Promozione">
                    Promuovi <i class="fa-solid fa-chevron-down" style="font-size: 0.8em; margin-left: 0.2rem;"></i>
                </button>
                <div id="promote-dropdown-${user.id || user._id}" class="promote-dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 0.5rem; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-md); z-index: 10; min-width: 220px; overflow: hidden; flex-direction: column;">
                    ${targetAuthLevel < AUTH_LEVELS.MODERATOR ? `
                    <button type="button" class="dropdown-item btn-block text-left" style="padding: 0.75rem 1rem; border: none; background: transparent; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: var(--transition); text-align: left;" onmouseover="this.style.backgroundColor='var(--background-light)'" onmouseout="this.style.backgroundColor='transparent'" onclick="promoteAdminUser('${user.id || user._id}', ${AUTH_LEVELS.MODERATOR})">
                        <i class="fa-solid fa-shield-halved text-primary" style="width: 20px; text-align: center;"></i> Promuovi a Moderatore
                    </button>
                    ` : ''}
                    <button type="button" class="dropdown-item btn-block text-left" style="padding: 0.75rem 1rem; border: none; background: transparent; cursor: pointer; transition: var(--transition); text-align: left;" onmouseover="this.style.backgroundColor='var(--background-light)'" onmouseout="this.style.backgroundColor='transparent'" onclick="promoteAdminUser('${user.id || user._id}', ${AUTH_LEVELS.ADMIN})">
                        <i class="fa-solid fa-crown text-secondary" style="width: 20px; text-align: center;"></i> Promuovi ad Admin
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="card" style="padding: 1rem 1.1rem; border-left: 5px solid ${targetAuthLevel === AUTH_LEVELS.ADMIN ? 'var(--accent-color)' : 'var(--primary-color)'}; overflow: visible;">
            <div class="flex justify-between items-start" style="gap: 1rem; align-items: flex-start;">
                <div style="min-width: 0;">
                    <div class="flex gap-1" style="flex-wrap: wrap; margin-bottom: 0.45rem;">
                        <span class="badge badge-primary">${roleLabel}</span>
                        ${authLabel ? `<span class="badge badge-secondary">${authLabel}</span>` : ''}
                        ${sameUser ? `<span class="badge badge-success">Sei tu</span>` : ''}
                    </div>
                    <h4 style="margin-bottom: 0.25rem; word-break: break-word;">${fullName}</h4>
                    <p class="text-muted" style="margin-bottom: 0.25rem; word-break: break-word;">${user.email || 'Email non disponibile'}</p>
                    <small class="text-muted" style="display: block; word-break: break-word;">ID: ${user.id || user._id}</small>
                </div>
                <div class="flex gap-1" style="flex-wrap: wrap; justify-content: flex-end; position: relative;">
                    ${promoteHtml}
                    ${canSuspend ? `<button type="button" class="btn btn-warning" style="padding: 0.5rem 0.75rem; color: #856404; background-color: #FFF3CD; border: 1px solid #ffeeba;" onclick="suspendAdminUser('${user.id || user._id}', ${suspensionCount})">Sospendi</button>` : ''}
                    ${canRestore ? `<button type="button" class="btn btn-success" style="padding: 0.5rem 0.75rem;" onclick="restoreAdminUser('${user.id || user._id}')">Riattiva</button>` : ''}
                    ${canDelete ? `<button type="button" class="btn btn-danger" style="padding: 0.5rem 0.75rem;" onclick="deleteAdminUser('${user.id || user._id}')">Elimina</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

async function loadAdminUsers() {
    const results = document.getElementById('admin-users-results');
    const countBadge = document.getElementById('admin-users-count');
    const summaryBadge = document.getElementById('admin-summary-badge');
    if (!results) return;

    results.innerHTML = `
        <div class="card text-center text-muted" style="padding: 1.5rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.25rem; margin-bottom: 0.5rem;"></i>
            <p style="margin-bottom: 0;">Caricamento utenti...</p>
        </div>
    `;

    try {
        const queryString = buildAdminSearchParams();
        const response = await authorizedFetch(`/api/admin/users${queryString ? `?${queryString}` : ''}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Impossibile caricare gli utenti');
        }

        window.adminUsersCache = Array.isArray(data) ? data : [];

        if (countBadge) {
            countBadge.innerText = `${window.adminUsersCache.length} utenti`;
        }
        if (summaryBadge) {
            const adminCount = window.adminUsersCache.filter(user => user.role === 'volunteer' && user.authLvl === AUTH_LEVELS.ADMIN).length;
            const moderatorCount = window.adminUsersCache.filter(user => user.role === 'volunteer' && user.authLvl === AUTH_LEVELS.MODERATOR).length;
            const volunteerCount = window.adminUsersCache.filter(user => user.role === 'volunteer' && user.authLvl === AUTH_LEVELS.UNAUTHORIZED).length;
            summaryBadge.innerText = `${window.adminUsersCache.length} utenti, ${adminCount} admin, ${moderatorCount} moderatori, ${volunteerCount} volontari`;
        }

        if (window.adminUsersCache.length === 0) {
            results.innerHTML = `
                <div class="card text-center text-muted" style="padding: 1.5rem;">
                    <p style="margin-bottom: 0;">Nessun utente trovato con i filtri attuali.</p>
                </div>
            `;
            return;
        }

        results.innerHTML = window.adminUsersCache.map(renderAdminUserCard).join('');
    } catch (error) {
        console.error('Errore caricamento admin users:', error);
        results.innerHTML = `
            <div class="card text-center text-danger" style="padding: 1.5rem;">
                <p style="margin-bottom: 0;">${error.message}</p>
            </div>
        `;
        if (countBadge) countBadge.innerText = '0 utenti';
    }
}

window.searchAdminUsers = async function() {
    await loadAdminUsers();
};

window.resetAdminSearch = async function() {
    const searchInput = document.getElementById('admin-user-search');
    const roleFilter = document.getElementById('admin-user-role-filter');
    if (searchInput) searchInput.value = '';
    if (roleFilter) roleFilter.value = '';
    await loadAdminUsers();
};

window.promoteAdminUser = async function(userId, targetLevel) {
    if (!userId) return;
    try {
        const payload = targetLevel !== undefined ? { targetLevel } : {};
        const response = await authorizedFetch(`/api/admin/volunteers/${encodeURIComponent(userId)}/admin`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || 'Impossibile promuovere l\'utente.', 'danger');
            return;
        }

        showToast(data.message || 'Utente promosso con successo.', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Errore promozione admin:', error);
        showToast('Si è verificato un errore durante la promozione.', 'danger');
    }
};

window.togglePromoteDropdown = function(event, userId) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.promote-dropdown-menu').forEach(el => {
        if (el.id !== `promote-dropdown-${userId}`) el.style.display = 'none';
    });
    const dd = document.getElementById(`promote-dropdown-${userId}`);
    if (dd) {
        dd.style.display = dd.style.display === 'flex' ? 'none' : 'flex';
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown-wrapper')) {
        document.querySelectorAll('.promote-dropdown-menu').forEach(el => el.style.display = 'none');
    }
});

window.suspendAdminUser = async function(userId, currentCount) {
    if (!userId) return;
    const newCount = currentCount + 1;
    let durationMsg = '';
    if (newCount === 1) durationMsg = '12 ore';
    else if (newCount === 2) durationMsg = '1 giorno';
    else if (newCount === 3) durationMsg = '1 settimana';
    else durationMsg = '1 mese';

    const confirmed = window.confirm(`Vuoi sospendere questo utente?\nQuesta sarà la sua ${newCount}° sospensione, che durerà automaticamente ${durationMsg}. Confermi?`);
    if (!confirmed) return;

    try {
        const response = await authorizedFetch(`/api/admin/users/${encodeURIComponent(userId)}/suspend`, {
            method: 'PUT'
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || "Impossibile sospendere l'utente.", 'danger');
            return;
        }

        showToast(data.message || 'Utente sospeso con successo.', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Errore sospensione admin:', error);
        showToast("Si è verificato un errore durante la sospensione.", 'danger');
    }
};

window.restoreAdminUser = async function(userId) {
    if (!userId) return;
    const confirmed = window.confirm("Vuoi riattivare questo utente? L'accesso sarà sbloccato immediatamente.");
    if (!confirmed) return;

    try {
        const response = await authorizedFetch(`/api/admin/users/${encodeURIComponent(userId)}/restore`, {
            method: 'PUT'
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || "Impossibile riattivare l'utente.", 'danger');
            return;
        }

        showToast(data.message || 'Utente riattivato con successo.', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Errore riattivazione admin:', error);
        showToast("Si è verificato un errore durante la riattivazione.", 'danger');
    }
};

window.deleteAdminUser = async function(userId) {
    if (!userId) return;
    const confirmed = window.confirm('Vuoi eliminare questo utente? L\'operazione è irreversibile.');
    if (!confirmed) return;

    try {
        const response = await authorizedFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || 'Impossibile eliminare l\'utente.', 'danger');
            return;
        }

        showToast(data.message || 'Utente eliminato con successo.', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Errore eliminazione admin:', error);
        showToast('Si è verificato un errore durante l\'eliminazione.', 'danger');
    }
};

async function loadAdminDashboard() {
    const partnerSection = document.getElementById('admin-partner-section');
    const partnerForm = document.getElementById('admin-partner-form');
    const isAdmin = appState.userAuthLvl === AUTH_LEVELS.ADMIN;

    if (partnerSection) {
        partnerSection.style.display = isAdmin ? 'block' : 'none';
        
        const gridContainer = partnerSection.closest('.grid-2');
        if (gridContainer) {
            if (isAdmin) {
                gridContainer.classList.remove('admin-moderator-layout');
            } else {
                gridContainer.classList.add('admin-moderator-layout');
            }
        }
    }

    if (partnerForm && !partnerForm.dataset.bound) {
        partnerForm.dataset.bound = 'true';
        partnerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!isAdmin) {
                showToast('Solo gli amministratori possono creare partner.', 'danger');
                return;
            }

            const payload = {
                email: document.getElementById('admin-partner-email')?.value.trim(),
                password: document.getElementById('admin-partner-password')?.value
            };

            try {
                const response = await authorizedFetch('/api/admin/partner', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (!response.ok) {
                    showToast(data.error || 'Impossibile creare il partner.', 'danger');
                    return;
                }

                showToast('Partner creato con successo.', 'success');
                partnerForm.reset();
                await loadAdminUsers();
            } catch (error) {
                console.error('Errore creazione partner admin:', error);
                showToast('Si è verificato un errore durante la creazione del partner.', 'danger');
            }
        });
    }

    const searchInput = document.getElementById('admin-user-search');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        searchInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await loadAdminUsers();
            }
        });
    }

    const roleFilter = document.getElementById('admin-user-role-filter');
    if (roleFilter && !roleFilter.dataset.bound) {
        roleFilter.dataset.bound = 'true';
        roleFilter.addEventListener('change', async () => {
            await loadAdminUsers();
        });
    }

    await loadAdminUsers();
    await window.loadAdminRequests();
}

window.loadAdminRequests = async function() {
    const container = document.getElementById('admin-requests-results');
    if (!container) return;

    container.innerHTML = `
        <div class="card text-center text-muted" style="padding: 1.5rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.25rem; margin-bottom: 0.5rem;"></i>
            <p style="margin-bottom: 0;">Caricamento richieste...</p>
        </div>
    `;

    try {
        const response = await authorizedFetch('/api/admin/requests');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Impossibile caricare le richieste');
        }

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted" style="padding: 1.5rem;">
                    <p style="margin-bottom: 0;">Nessuna richiesta trovata.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">';
        data.forEach(req => {
            const badgeClass = req.status === 'Completata' ? 'badge-success' : req.status === 'Annullata' ? 'badge-danger' : 'badge-warning';
            html += `
                <div class="card" style="padding: 1rem;">
                    <div class="flex justify-between items-center" style="margin-bottom: 0.5rem;">
                        <span class="badge ${badgeClass}">${req.status}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${req.date || ''} ${req.time || ''}</span>
                    </div>
                    <h4 style="margin: 0 0 0.5rem;">${req.serviceType || 'Servizio'}</h4>
                    <p style="margin: 0 0 0.5rem; font-size: 0.9rem; color: var(--text-muted);">${req.location || ''}</p>
                    <p style="margin: 0 0 1rem; font-size: 0.85rem;">Utente ID: ${req.userId || 'N/A'}</p>
                    <button class="btn btn-danger btn-block" onclick="deleteAdminRequest('${req._id}')">Elimina Richiesta</button>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Errore caricamento richieste admin:', error);
        container.innerHTML = `
            <div class="card text-center text-danger" style="padding: 1.5rem;">
                <p style="margin-bottom: 0;">${error.message}</p>
            </div>
        `;
    }
};

window.deleteAdminRequest = async function(requestId) {
    if (!requestId) return;
    const confirmed = window.confirm("Vuoi davvero eliminare questa richiesta? L'operazione è irreversibile.");
    if (!confirmed) return;

    try {
        const response = await authorizedFetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || 'Impossibile eliminare la richiesta.', 'danger');
            return;
        }

        showToast(data.message || 'Richiesta eliminata con successo.', 'success');
        await window.loadAdminRequests();
    } catch (error) {
        console.error('Errore eliminazione richiesta:', error);
        showToast("Si è verificato un errore durante l'eliminazione.", 'danger');
    }
};

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
    'vol-map': 'view-vol-map',
    'partner-dash': 'view-partner-dash',
    'partner-coupon': 'view-partner-coupon',
    'admin-dash': 'view-admin-dash',
    'privacy': 'view-public-privacy',
    'tos': 'view-public-tos'
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
    // Protect admin route client-side: only allow if logged in as moderator or admin
    if (routeId === 'admin-dash' && appState.userAuthLvl < AUTH_LEVELS.MODERATOR) {
        showToast('Accesso negato: autorizzazione amministratore o moderatore richiesta.', 'danger');
        return;
    }
    
    // Traccia la cronologia della navigazione per consentire il ritorno indietro
    if (currentRoute !== 'privacy' && currentRoute !== 'tos' && currentRoute !== routeId) {
        previousRoute = currentRoute;
    }
    currentRoute = routeId;
    
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
    } else if (routeId === 'admin-dash') {
        loadAdminDashboard();
    } else if (routeId === 'partner-dash') {
        loadPartnerDashboard();
    } else if (routeId === 'profile') {
        loadProfile();
    } else if (routeId === 'vol-store') {
        updateStorePoints();
        loadStoreCoupons();
    } else if (routeId === 'vol-map') {
        initVolunteerMap();
        loadVolunteerMapRequests();
    } else if (routeId === 'auth') {
        toggleRegisterRoleFields();
    }
}

function navigateBack() {
    navigateTo(previousRoute || 'home');
}

function updateNavbar(routeId) {
    const navLinks = document.getElementById('dynamic-nav-links');
    if (!navLinks) return;
    
    let linksHTML = '';
    
    // Mostra i link corretti nel menu in alto a destra in base al ruolo dell'utente
    if (appState.userRole === 'volunteer') {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('vol-board')">Bacheca</a>
            <a href="#" class="nav-link" onclick="navigateTo('vol-map')">Mappa</a>
            <a href="#" class="nav-link" onclick="navigateTo('vol-store')">Store Premi</a>
            <a href="#" class="nav-link" onclick="navigateTo('profile')">Profilo</a>
            ${appState.userAuthLvl >= AUTH_LEVELS.MODERATOR ? `<a href="#" class="nav-link" onclick="navigateTo('admin-dash')">Pannello di Controllo</a>` : ''}
            <a href="#" class="nav-link text-danger" onclick="logout()">Esci</a>
        `;
    } else if (appState.userRole === 'requester') {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('req-dashboard')">Le mie richieste</a>
            <a href="#" class="nav-link" onclick="navigateTo('profile')">Profilo</a>
            <a href="#" class="nav-link text-danger" onclick="logout()">Esci</a>
        `;
    } else if (appState.userRole === 'partner') {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('partner-dash')">Dashboard</a>
            <a href="#" class="nav-link text-danger" onclick="logout()">Esci</a>
        `;
    } else {
        linksHTML = `
            <a href="#" class="nav-link" onclick="openAuth('login')">Accedi</a>
            <a href="#" class="nav-link" onclick="openAuth('register')">Registrati</a>
        `;
    }
    
    navLinks.innerHTML = linksHTML;
}

// Toggle helper for the small user dropdown
window.toggleUserDropdown = function() {
    const dd = document.getElementById('user-dropdown');
    if (!dd) return;
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
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
            let volunteerHtml = '';
            if (req.volunteerName) {
                volunteerHtml = `
                    <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); font-size: 0.875rem; color: var(--primary-color); font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
                        <i class="fa-solid fa-user"></i> Volontario: ${req.volunteerName} ${req.volunteerSurname}
                    </div>
                `;
            }
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
                        ${volunteerHtml}
                    </div>
                    <button class="btn btn-outline btn-block btn-sm" style="margin-top: 1.5rem;" onclick="openRequesterDetail('${req._id}')">Vedi Dettagli</button>
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
    
    const volunteerRow = document.getElementById('req-detail-volunteer-row');
    const volunteerSpan = document.getElementById('req-detail-volunteer');
    if (volunteerRow && volunteerSpan) {
        if (req.volunteerName) {
            volunteerSpan.innerText = `${req.volunteerName} ${req.volunteerSurname}`;
            volunteerRow.style.display = 'block';
        } else {
            volunteerRow.style.display = 'none';
        }
    }

    const cancelBtn = document.getElementById('req-detail-cancel-btn');
    const completeBtn = document.getElementById('req-detail-complete-btn');
    const editBtn = document.getElementById('req-detail-edit-btn');
    const deleteBtn = document.getElementById('req-detail-delete-btn');
    
    if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.dataset.confirmState = 'inactive';
        deleteBtn.style.backgroundColor = '';
        deleteBtn.style.borderColor = '';
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can" style="margin-right: 0.5rem;"></i> Elimina definitivamente';
    }

    const editable = isRequesterRequestEditable(req);
    const canComplete = window.canRequesterComplete(req);
    const canCancel = window.canRequesterCancel(req);

    // Gestione bottoni per richieste completate o annullate
    if (req.status === 'Annullata' || req.status === 'Completata') {
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (completeBtn) completeBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }
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
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    }

    window.renderRequesterRatingSection(req);
    navigateTo('req-detail');
};

window.deleteRequesterRequest = async function(requestId) {
    if (!requestId) return;
    
    const deleteBtn = document.getElementById('req-detail-delete-btn');
    if (!deleteBtn) return;
    
    // Se il pulsante è già in attesa di conferma (secondo click)
    if (deleteBtn.dataset.confirmState === 'active') {
        let success = false;
        try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Eliminazione in corso...';
            
            const response = await authorizedFetch(`/api/requester/requests/${requestId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Errore durante l\'eliminazione della richiesta');
            }
            
            success = true;
        } catch (error) {
            console.error('Errore eliminazione richiesta:', error);
            showToast(error.message, 'danger');
            resetDeleteButton(deleteBtn);
        }

        if (success) {
            // Mostra la notifica in rosso (danger) ed effettua il reindirizzamento alla bacheca
            showToast('Richiesta eliminata definitivamente', 'danger');
            navigateTo('req-dashboard');
        }
    } else {
        // Primo click: entra nello stato di conferma
        deleteBtn.dataset.confirmState = 'active';
        deleteBtn.style.backgroundColor = '#d32f2f'; // Rosso acceso/intenso
        deleteBtn.style.borderColor = '#d32f2f';
        deleteBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="margin-right: 0.5rem;"></i> Premi di nuovo per eliminare definitivamente';
        
        // Timeout di 4 secondi per ripristinare il bottone originale se l'utente desiste
        if (window.deleteBtnTimeout) clearTimeout(window.deleteBtnTimeout);
        window.deleteBtnTimeout = setTimeout(() => {
            resetDeleteButton(deleteBtn);
        }, 4000);
    }
};

// Funzione ausiliaria per resettare il bottone di eliminazione al suo stato originario
function resetDeleteButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.dataset.confirmState = 'inactive';
    btn.style.backgroundColor = '';
    btn.style.borderColor = '';
    btn.innerHTML = '<i class="fa-solid fa-trash-can" style="margin-right: 0.5rem;"></i> Elimina definitivamente';
}

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

window.copyPartnerCredentials = async function() {
    const passEl = document.getElementById('partner-cred-password');
    if (!passEl) return;
    
    try {
        await navigator.clipboard.writeText(passEl.value);
        showToast('Password copiata negli appunti!', 'success');
    } catch (err) {
        passEl.select();
        document.execCommand('copy');
        showToast('Password copiata negli appunti!', 'success');
    }
};

window.closePartnerCredentialsModal = function() {
    window.closeModal('partner-credentials-modal');
};

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
    appState.userAuthLvl = AUTH_LEVELS.UNAUTHORIZED;
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
            const email = document.getElementById('login-email').value.trim();
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
                appState.userAuthLvl = typeof data.user.authLvl === 'number' ? data.user.authLvl : AUTH_LEVELS.UNAUTHORIZED;
                appState.userEmail = data.user.email;
                appState.userId = data.user.id;
                appState.userName = data.user.name;
                appState.points = data.user.points || 0;

                showToast(data.message, 'success');

                // Reindirizzamento basato sul ruolo e livello di autorizzazione
                if (data.user.role === 'volunteer') {
                    navigateTo('vol-board');
                } else if (data.user.role === 'requester') {
                    navigateTo('req-dashboard');
                } else if (data.user.role === 'partner') {
                    navigateTo('partner-dash');
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
            
            const termsChecked = document.getElementById('reg-terms')?.checked;
            if (!termsChecked) {
                showToast('Devi accettare la Privacy Policy e i Termini di Servizio.', 'danger');
                return;
            }

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
                appState.userAuthLvl = typeof data.user.authLvl === 'number' ? data.user.authLvl : AUTH_LEVELS.UNAUTHORIZED;
                appState.userEmail = data.user.email;
                appState.userId = data.user.id;
                appState.points = data.user.points || 0;

                showToast(data.message, 'success');

                if (data.user.role === 'volunteer') {
                    navigateTo('vol-board');
                } else if (data.user.role === 'requester') {
                    navigateTo('req-dashboard');
                } else if (data.user.role === 'partner') {
                    navigateTo('partner-dash');
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

window.volunteerMap = null;
window.volunteerMapMarkers = [];

// Funzione mock per coordinate di Trento
function getMockCoordinates(address) {
    const defaultCoords = [46.0697, 11.1211]; // Centro di Trento
    if (!address) return defaultCoords;
    const lowerAddress = address.toLowerCase();
    
    if (lowerAddress.includes('belenzani')) return [46.0682, 11.1214];
    if (lowerAddress.includes('duomo')) return [46.0674, 11.1215];
    if (lowerAddress.includes('grazioli')) return [46.0694, 11.1293];
    if (lowerAddress.includes('roma')) return [46.0712, 11.1234];
    
    // Jitter casuale per altri indirizzi
    const jitterLat = (Math.random() - 0.5) * 0.02;
    const jitterLng = (Math.random() - 0.5) * 0.02;
    return [defaultCoords[0] + jitterLat, defaultCoords[1] + jitterLng];
}

window.initVolunteerMap = function() {
    if (window.volunteerMap) {
        window.volunteerMap.invalidateSize();
        return;
    }
    
    const container = document.getElementById('volunteer-map-container');
    if (!container) return;

    window.volunteerMap = L.map('volunteer-map-container').setView([46.0697, 11.1211], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(window.volunteerMap);
};

window.loadVolunteerMapRequests = async function() {
    if (!window.volunteerMap) return;
    
    // Clear old markers
    window.volunteerMapMarkers.forEach(m => window.volunteerMap.removeLayer(m));
    window.volunteerMapMarkers = [];

    try {
        // Fetch sia delle richieste attive che di quelle accettate
        const [activeRes, myTasksRes] = await Promise.all([
            authorizedFetch('/api/volunteer/requests'),
            authorizedFetch('/api/volunteer/my-tasks')
        ]);

        const activeRequests = activeRes.ok ? await activeRes.json() : [];
        const myTasks = myTasksRes.ok ? await myTasksRes.json() : [];
        
        window.activeRequestsCache = activeRequests;
        window.myTasksCache = myTasks;

        // Costruiamo icone personalizzate cambiando il colore via CSS filter
        const blueIcon = new L.Icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // Applichiamo un filter per farlo verde
        const greenIcon = new L.Icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
            className: 'marker-green' // Lo stile verrà gestito se necessario, o usiamo un marker verde esterno
        });

        const allRequests = [
            ...activeRequests.map(r => ({ ...r, isMine: false })),
            ...myTasks.map(r => ({ ...r, isMine: true }))
        ];

        allRequests.forEach(req => {
            const coords = getMockCoordinates(req.location || req.address);
            // Usiamo hue-rotate per fare verde l'icona base di leaflet
            const iconHTML = req.isMine 
                ? '<div style="filter: hue-rotate(240deg) saturate(3);"><img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" style="width:25px;height:41px;"></div>' 
                : '<img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" style="width:25px;height:41px;">';
            
            const customIcon = L.divIcon({
                html: iconHTML,
                className: '',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            });

            const marker = L.marker(coords, { icon: customIcon }).addTo(window.volunteerMap);
            
            marker.on('click', () => {
                showRequestDetails(req._id);
            });

            window.volunteerMapMarkers.push(marker);
        });
        
    } catch (e) {
        console.error("Errore nel caricamento dei dati mappa:", e);
    }
};

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
                    <div class="flex gap-1" style="margin-top: auto;">
                        <button class="btn btn-outline btn-sm" style="flex: 1; padding: 0.5rem 0.75rem;" onclick="showRequestDetails('${req._id}')">Dettagli</button>
                        <button class="btn btn-primary btn-sm" style="flex: 1.2; padding: 0.5rem 0.75rem; font-weight: 700;" onclick="acceptRequestImmediately('${req._id}')">
                            <i class="fa-solid fa-check" style="margin-right: 0.25rem;"></i> Accetta
                        </button>
                    </div>
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
    let req = window.activeRequestsCache ? window.activeRequestsCache.find(r => r._id === requestId) : null;
    let isMine = false;
    
    if (!req && window.myTasksCache) {
        req = window.myTasksCache.find(r => r._id === requestId);
        isMine = true;
    }
    
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
    
    if (isMine) {
        acceptBtn.innerText = "Annulla Incarico";
        acceptBtn.className = "btn btn-danger";
        acceptBtn.onclick = async function() {
            await cancelTask(req._id);
            closeModal("vol-req-detail-modal");
        };
    } else {
        acceptBtn.innerText = "Accetta Incarico";
        acceptBtn.className = "btn btn-primary";
        acceptBtn.onclick = async function() {
            await acceptRequest(req._id);
            closeModal("vol-req-detail-modal");
        };
    }

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
            if (currentRoute === 'vol-map') {
                loadVolunteerMapRequests();
            } else {
                loadVolunteerDashboard();
            }
        } else {
            showToast(`Errore: ${data.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nell'accettazione dell'incarico:", e);
        showToast("Si è verificato un errore durante l'operazione di presa in carico.", "danger");
    }
}

window.acceptRequestImmediately = async function(requestId) {
    await acceptRequest(requestId);
};

async function loadMyTasks() {
    const container = document.getElementById("volunteer-my-tasks-container");
    if (!container) return;

    try {
        const response = await authorizedFetch('/api/volunteer/my-tasks');
        if (!response.ok) throw new Error("Errore nel caricamento dei propri compiti");

        const tasks = await response.json();
        window.myTasksCache = tasks;

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
            if (currentRoute === 'vol-map') {
                loadVolunteerMapRequests();
            } else {
                loadVolunteerDashboard();
            }
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

async function loadStoreCoupons() {
    const container = document.getElementById("volunteer-store-container");
    if (!container) return;

    container.innerHTML = `
        <div class="text-center text-muted" style="grid-column: span 3; padding: 2rem;">
            <i class="fa-solid fa-spinner fa-spin"></i> Caricamento coupon...
        </div>
    `;

    try {
        const response = await authorizedFetch('/api/volunteer/coupons');
        if (!response.ok) throw new Error('Errore di rete');
        
        const coupons = await response.json();
        
        if (coupons.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted" style="grid-column: span 3; padding: 2rem;">
                    Nessun coupon disponibile al momento. Torna più tardi!
                </div>
            `;
            return;
        }

        container.innerHTML = coupons.map(c => `
            <div class="card text-center flex flex-col justify-between">
                <div>
                    <div style="background: var(--background-light); padding: 2rem; border-radius: var(--radius-sm); margin-bottom: 1rem;">
                        <i class="fa-solid fa-gift" style="font-size: 3rem; color: var(--text-muted);"></i>
                    </div>
                    <h4>${c.title}</h4>
                    <p class="text-muted" style="font-size: 0.875rem;">${c.description}</p>
                </div>
                <div>
                    <h3 class="text-secondary" style="margin: 1rem 0;">${c.pointsCost} pts</h3>
                    <button class="btn btn-primary btn-block" onclick="buyCoupon('${c._id}', '${c.title.replace(/'/g, "\\'")}', ${c.pointsCost})">Acquista</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div class="text-center text-danger" style="grid-column: span 3; padding: 2rem;">
                Errore nel caricamento dei coupon. Riprova più tardi.
            </div>
        `;
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
    
    const confirmBtn = document.getElementById('confirm-delete-profile-btn');
    if (confirmBtn) {
        resetProfileDeleteButton(confirmBtn);
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

window.buyCoupon = async function(couponId, couponName, costoPunti) {
    if ((appState.points || 0) < costoPunti) {
        showToast(`Punti insufficienti per riscattare "${couponName}" (Costo: ${costoPunti} pts, Tuo saldo: ${appState.points} pts)`, "danger");
        return;
    }

    if (!confirm(`Sei sicuro di voler utilizzare ${costoPunti} punti per "${couponName}"?`)) return;

    try {
        const response = await authorizedFetch(`/api/volunteer/coupons/redeem`, {
            method: "POST",
            body: JSON.stringify({ couponId })
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
    const viewFiles = ['public.html', 'shared.html', 'requester.html', 'volunteer.html', 'partner.html', 'admin.html', 'privacy.html', 'tos.html'];
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
        
        // Carica istantaneamente i servizi del modulo di richiesta dalle costanti di sistema (SST)
        await renderDynamicRequestServices();
        
        // Assicura l'attivazione immediata del calendario/orologio al click/focus (Safari/Chrome)
        bindDatePickerEvents();

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
                appState.userAuthLvl = typeof data.authLvl === 'number' ? data.authLvl : AUTH_LEVELS.UNAUTHORIZED;
                appState.userEmail = data.email;
                appState.userId = data.id;
                appState.userName = data.name;
                appState.points = data.points || 0;
                
                showToast(`Ciao, ${data.name}!`, 'success');
                if (data.role === 'volunteer') {
                    navigateTo('vol-board');
                } else if (data.role === 'requester') {
                    navigateTo('req-dashboard');
                } else if (data.role === 'partner') {
                    navigateTo('partner-dash');
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

window.deleteUserProfile = async function() {
    const confirmBtn = document.getElementById('confirm-delete-profile-btn');
    if (!confirmBtn) return;
    
    // Se il pulsante è già in attesa di conferma (secondo click)
    if (confirmBtn.dataset.confirmState === 'active') {
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Eliminazione in corso...';
            
            const role = appState.userRole; // 'requester' o 'volunteer'
            const endpoint = `/api/${role}/profile`;
            
            const response = await authorizedFetch(endpoint, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Errore durante l\'eliminazione del profilo');
            }
            
            // Chiudi il modal
            closeModal('delete-account-modal');
            
            // Svuota i dati di sessione (logout silente)
            localStorage.removeItem('token');
            appState.userRole = null;
            appState.userEmail = null;
            appState.userId = null;
            appState.points = 0;
            
            // Naviga alla home
            navigateTo('home');
            
            // Mostra la notifica in rosso (danger) di avvenuta eliminazione profilo
            showToast('Il tuo profilo e tutti i tuoi dati sono stati eliminati definitivamente.', 'danger');
        } catch (error) {
            console.error('Errore eliminazione profilo:', error);
            showToast(error.message, 'danger');
            resetProfileDeleteButton(confirmBtn);
        }
    } else {
        // Primo click: entra nello stato di conferma
        confirmBtn.dataset.confirmState = 'active';
        confirmBtn.style.backgroundColor = '#d32f2f';
        confirmBtn.style.borderColor = '#d32f2f';
        confirmBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="margin-right: 0.5rem;"></i> Clicca di nuovo per eliminare il tuo account per sempre';
        
        // Timeout di 4 secondi per ripristinare il bottone originario se desiste
        if (window.profileDeleteBtnTimeout) clearTimeout(window.profileDeleteBtnTimeout);
        window.profileDeleteBtnTimeout = setTimeout(() => {
            resetProfileDeleteButton(confirmBtn);
        }, 4000);
    }
};

function resetProfileDeleteButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.dataset.confirmState = 'inactive';
    btn.style.backgroundColor = '';
    btn.style.borderColor = '';
    btn.innerHTML = 'Conferma Eliminazione';
}

// Assicura l'attivazione immediata del calendario/orologio nativo al click/focus (ottimizzato per Safari)
function bindDatePickerEvents() {
    const dateInput = document.getElementById('req-date');
    const timeInput = document.getElementById('req-time');
    
    if (dateInput) {
        const handler = function(e) {
            try {
                if (typeof dateInput.showPicker === 'function') {
                    dateInput.showPicker();
                }
            } catch (err) {
                console.warn('showPicker bloccato o non supportato:', err);
            }
        };
        dateInput.addEventListener('click', handler);
        dateInput.addEventListener('focus', handler);
    }
    
    if (timeInput) {
        const handler = function(e) {
            try {
                if (typeof timeInput.showPicker === 'function') {
                    timeInput.showPicker();
                }
            } catch (err) {
                console.warn('showPicker bloccato o non supportato:', err);
            }
        };
        timeInput.addEventListener('click', handler);
        timeInput.addEventListener('focus', handler);
    }
}

// ==========================================
// LOGICA PARTNER
// ==========================================

window.loadPartnerDashboard = async function() {
    const listBody = document.getElementById('partner-coupons-list');
    if (!listBody) return;

    // Imposta il nome nel banner
    const welcomeName = document.getElementById("partner-welcome-name");
    if (welcomeName && appState.userName) {
        welcomeName.innerText = appState.userName;
    } else if (welcomeName) {
        // Fallback or fetch from API if necessary
        try {
            const meRes = await authorizedFetch('/api/auth/me');
            if (meRes.ok) {
                const me = await meRes.json();
                if (me.name) {
                    appState.userName = me.name;
                    welcomeName.innerText = me.name;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    const listBodyExpired = document.getElementById('partner-expired-coupons-list');

    if (!listBody) return;

    listBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 2rem;">
                <i class="fa-solid fa-spinner fa-spin"></i> Caricamento...
            </td>
        </tr>
    `;
    if (listBodyExpired) {
        listBodyExpired.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Caricamento...
                </td>
            </tr>
        `;
    }

    try {
        const response = await authorizedFetch('/api/partner/coupons');
        if (!response.ok) throw new Error('Errore nel caricamento dei coupon');
        
        const coupons = await response.json();
        
        if (coupons.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Nessun premio attivo. Clicca su "Crea Nuovo Premio" per iniziare.
                    </td>
                </tr>
            `;
            if (listBodyExpired) {
                listBodyExpired.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            Nessun premio scaduto.
                        </td>
                    </tr>
                `;
            }
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        const activeCoupons = coupons.filter(c => c.expirationDate >= today);
        const expiredCoupons = coupons.filter(c => c.expirationDate < today);

        if (activeCoupons.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Nessun premio attivo.
                    </td>
                </tr>
            `;
        } else {
            listBody.innerHTML = activeCoupons.map(c => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 1rem;">
                        <strong>${c.title}</strong><br>
                        <small class="text-muted">Scade: ${new Date(c.expirationDate).toLocaleDateString('it-IT')}</small>
                    </td>
                    <td style="padding: 1rem;">${c.pointsCost}</td>
                    <td style="padding: 1rem; font-weight: bold; color: var(--secondary-color);">${c.redemptionsCount || 0}</td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick='openPartnerCouponForm(${JSON.stringify(c).replace(/'/g, "&apos;")})'>Modifica</button>
                        <button class="btn btn-danger" style="padding: 0.5rem 1rem;" onclick="deletePartnerCoupon('${c._id}')">Elimina</button>
                    </td>
                </tr>
            `).join('');
        }

        if (listBodyExpired) {
            if (expiredCoupons.length === 0) {
                listBodyExpired.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            Nessun premio scaduto.
                        </td>
                    </tr>
                `;
            } else {
                listBodyExpired.innerHTML = expiredCoupons.map(c => `
                    <tr style="border-bottom: 1px solid var(--border-color); opacity: 0.8;">
                        <td style="padding: 1rem;">
                            <strong>${c.title}</strong><br>
                            <small class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Scaduto il: ${new Date(c.expirationDate).toLocaleDateString('it-IT')}</small>
                        </td>
                        <td style="padding: 1rem;">${c.pointsCost}</td>
                        <td style="padding: 1rem; font-weight: bold; color: var(--secondary-color);">${c.redemptionsCount || 0}</td>
                        <td style="padding: 1rem;">
                            <button class="btn btn-danger" style="padding: 0.5rem 1rem;" onclick="deletePartnerCoupon('${c._id}')">Elimina</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error(error);
        showToast('Impossibile caricare i coupon.', 'danger');
    }
};

window.openPartnerCouponForm = function(coupon = null) {
    const titleEl = document.getElementById('partner-coupon-title');
    const descEl = document.getElementById('partner-coupon-description');
    const pointsEl = document.getElementById('partner-coupon-points');
    const expEl = document.getElementById('partner-coupon-expiration');
    const idEl = document.getElementById('partner-coupon-id');
    const formTitle = document.getElementById('partner-coupon-form-title');

    if (coupon) {
        formTitle.innerText = "Modifica Premio (Coupon)";
        idEl.value = coupon._id;
        titleEl.value = coupon.title;
        descEl.value = coupon.description;
        pointsEl.value = coupon.pointsCost;
        // Format date to YYYY-MM-DD for input type="date"
        let d = new Date(coupon.expirationDate);
        expEl.value = d.toISOString().split('T')[0];
    } else {
        formTitle.innerText = "Nuovo Premio (Coupon)";
        document.getElementById('partner-coupon-form').reset();
        idEl.value = "";
    }

    navigateTo('partner-coupon');
};

window.submitPartnerCoupon = async function(event) {
    event.preventDefault();
    
    const id = document.getElementById('partner-coupon-id').value;
    const title = document.getElementById('partner-coupon-title').value;
    const description = document.getElementById('partner-coupon-description').value;
    const pointsCost = document.getElementById('partner-coupon-points').value;
    const expirationDate = document.getElementById('partner-coupon-expiration').value;

    const payload = { title, description, pointsCost, expirationDate };

    try {
        let response;
        if (id) {
            response = await authorizedFetch('/api/partner/coupons/' + id, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            response = await authorizedFetch('/api/partner/coupons', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        const data = await response.json();
        if (!response.ok) {
            showToast(data.error || 'Errore durante il salvataggio.', 'danger');
            return;
        }

        showToast(id ? 'Premio aggiornato!' : 'Premio pubblicato con successo!', 'success');
        navigateTo('partner-dash');
    } catch (error) {
        console.error(error);
        showToast('Errore di connessione.', 'danger');
    }
};

window.deletePartnerCoupon = async function(id) {
    if (!confirm('Sei sicuro di voler eliminare questo coupon?')) return;
    
    try {
        const response = await authorizedFetch('/api/partner/coupons/' + id, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            showToast('Errore durante leliminazione.', 'danger');
            return;
        }
        
        showToast('Coupon eliminato.', 'success');
        loadPartnerDashboard();
    } catch (error) {
        console.error(error);
        showToast('Errore di connessione.', 'danger');
    }
};

