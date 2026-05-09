// Router semplice per Single Page App e Stato Globale
const appState = {
    userRole: null, // 'requester', 'volunteer', 'partner', 'admin', null
    userEmail: null, // email dell'utente loggato
    points: 1250,
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
    'partner-dash': 'view-partner-dash',
    'partner-coupon': 'view-partner-coupon',
    'admin-dash': 'view-admin-dash'
};

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
    if (routeId === 'vol-board') {
        loadVolunteerDashboard();
    } else if (routeId === 'profile') {
        loadProfile();
    } else if (routeId === 'vol-store') {
        updateStorePoints();
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
    } else {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('home')">Home</a>
            <a href="#" class="nav-link" onclick="navigateTo('auth')">Accedi / Registrati</a>
        `;
    }
    
    navLinks.innerHTML = linksHTML;
}

// Funzioni per i Modal
// Rese globali per far funzionare gli attributi onclick
window.openModal = function(modalId) {
    document.getElementById(modalId).classList.add('active');
}
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

window.showQRCode = function(name, code) {
    document.getElementById("qr-modal-title").innerText = name;
    document.getElementById("qr-modal-code").innerText = code;
    document.getElementById("qr-modal-image").src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
    openModal("qr-code-modal");
}

// Sistema di Notifiche Globali (Toast silenziose, eleganti e non bloccanti)
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

// Helper per il logout
window.logout = function() {
    appState.userRole = null;
    appState.userEmail = null;
    navigateTo('home');
}

// Simula il Login
window.handleLogin = function(e, role) {
    if (e) e.preventDefault();
    appState.userRole = role;
    
    if (role === 'volunteer') {
        appState.userEmail = "mario.rossi@email.it";
        navigateTo('vol-board');
    } else if (role === 'requester') {
        appState.userEmail = "angela.bianchi@email.it";
        navigateTo('req-dashboard');
    } else if (role === 'partner') {
        navigateTo('partner-dash');
    } else if (role === 'admin') {
        navigateTo('admin-dash');
    }
}

// ==========================================
// AZIONI VOLONTARIO E LOGICA BACHECA
// ==========================================

// 1. Get volunteer profile information & populate dashboard header
async function loadVolunteerDashboard() {
    const email = appState.userEmail || "mario.rossi@email.it";
    
    try {
        const response = await fetch(`/api/volunteer/profile?email=${encodeURIComponent(email)}`);
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

// 2. Recupera richieste attive e renderizza
window.loadActiveRequests = async function() {
    const container = document.getElementById("volunteer-requests-container");
    if (!container) return;

    const filterSelect = document.getElementById("request-category-filter");
    const category = filterSelect ? filterSelect.value : "Tutti i servizi";
    const email = appState.userEmail || "mario.rossi@email.it";

    try {
        const url = `/api/volunteer/requests?email=${encodeURIComponent(email)}&category=${encodeURIComponent(category)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore nel caricamento richieste");

        const requests = await response.json();
        
        if (requests.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted" style="padding: 3rem 0; grid-column: span 2;">
                    <i class="fa-solid fa-clipboard-question" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p style="font-weight: 500; margin-bottom: 0;">Nessuna richiesta attiva disponibile al momento.</p>
                    <small>Riprova più tardi o cambia filtro di categoria.</small>
                </div>
            `;
            return;
        }

        // Renderizza le card delle richieste in stile griglia o lista
        let html = '<div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; width: 100%;">';
        
        requests.forEach(req => {
            const badgeClass = getCategoryBadgeClass(req.category);
            const badgeStyle = '';
            
            html += `
                <div class="card flex flex-col justify-between" style="padding: 1.5rem; height: 100%;">
                    <div>
                        <div class="flex justify-between items-center" style="margin-bottom: 0.75rem;">
                            <span class="badge ${badgeClass}" ${badgeStyle}>${req.category}</span>
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
        
        // Salva le richieste in cache per accedervi senza doverle ricaricare
        window.activeRequestsCache = requests;
    } catch (e) {
        console.error("Errore nel caricamento delle richieste:", e);
        container.innerHTML = `
            <div class="card text-center text-danger" style="padding: 2rem;">
                <p>Impossibile caricare le richieste attive. Controlla la connessione al database backend.</p>
            </div>
        `;
    }
}

// 3. Helper per classe CSS in base alla Categoria
function getCategoryBadgeClass(cat) {
    if (cat === "Trasporto") return "badge-primary";
    if (cat === "Accompagnamento") return "badge-success";
    if (cat === "Compagnia") return "badge-warning";
    return "badge-primary"; // fallback
}

// 4. Show request details in a modal
window.showRequestDetails = function(requestId) {
    const req = window.activeRequestsCache.find(r => r._id === requestId);
    if (!req) return;

    const modal = document.getElementById("vol-req-detail-modal");
    if (!modal) return;

    // Imposta i dettagli testuali
    document.getElementById("modal-req-title").innerText = req.title;
    document.getElementById("modal-req-requester").innerHTML = `<i class="fa-solid fa-user"></i> <strong>Richiedente:</strong> ${req.requesterName}`;
    document.getElementById("modal-req-address").innerText = req.address;
    document.getElementById("modal-req-datetime").innerText = req.dateTime;
    document.getElementById("modal-req-points").innerText = `+${req.points} pts`;
    document.getElementById("modal-req-description").innerText = req.description;

    // Dettagli dei badge
    const badge = document.getElementById("modal-req-badge");
    badge.innerText = req.category;
    badge.className = `badge ${getCategoryBadgeClass(req.category)}`;
    badge.style.backgroundColor = "";
    badge.style.color = "";

    // Configurazione pulsante accetta
    const acceptBtn = document.getElementById("modal-accept-btn");
    acceptBtn.onclick = async function() {
        await acceptRequest(req._id);
        closeModal("vol-req-detail-modal");
    };

    openModal("vol-req-detail-modal");
}

// 5. Accetta Richiesta via API
async function acceptRequest(requestId) {
    const email = appState.userEmail || "mario.rossi@email.it";
    
    try {
        const response = await fetch(`/api/volunteer/requests/${requestId}/accept`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast("Richiesta Accettata con successo! L'attività è stata aggiunta ai tuoi incarichi.", "success");
            loadVolunteerDashboard(); // ricarica i dati
        } else {
            showToast(`Errore: ${data.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nell'accettazione dell'incarico:", e);
        showToast("Si è verificato un errore durante l'operazione di presa in carico.", "danger");
    }
}

// 6. Carica incarichi assegnati per il volontario corrente
async function loadMyTasks() {
    const container = document.getElementById("volunteer-my-tasks-container");
    if (!container) return;

    const email = appState.userEmail || "mario.rossi@email.it";

    try {
        const response = await fetch(`/api/volunteer/my-tasks?email=${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error("Errore nel caricamento dei propri compiti");

        const tasks = await response.json();

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted" style="padding: 2rem 1rem; border: 2px dashed var(--border-color); border-radius: var(--radius-lg); background: var(--surface-color);">
                    <i class="fa-solid fa-hands-holding" style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-muted);"></i>
                    <p style="font-size: 0.875rem; margin-bottom: 0;">Nessun incarico in corso. Accetta qualche richiesta per aiutare chi ha bisogno!</p>
                </div>
            `;
            return;
        }

        let html = '';
        tasks.forEach(task => {
            const badgeClass = getCategoryBadgeClass(task.category);
            const badgeStyle = '';
            
            html += `
                <div class="card" style="padding: 1.25rem; border-left: 5px solid var(--secondary-color); margin-bottom: 1rem;">
                    <div class="flex justify-between items-start" style="margin-bottom: 0.5rem;">
                        <span class="badge ${badgeClass}" ${badgeStyle}>${task.category}</span>
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
    const email = appState.userEmail || "mario.rossi@email.it";
    
    try {
        const response = await fetch(`/api/volunteer/requests/${taskId}/cancel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            showToast("Presa in carico annullata. La richiesta è tornata in bacheca!", "success");
            loadVolunteerDashboard(); // ricarica per sincronizzare le liste
        } else {
            showToast(`Errore: ${data.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nell'annullamento dell'incarico:", e);
        showToast("Si è verificato un errore durante l'annullamento.", "danger");
    }
}

// 8. Aggiorna punti visualizzati nello store
function updateStorePoints() {
    const pointsBal = document.getElementById("store-points-balance");
    if (pointsBal) {
        pointsBal.innerHTML = `${appState.points} <span style="font-size: 1.5rem;">pts</span>`;
    }
}

// ==========================================
// CARICAMENTO E SALVATAGGIO PROFILO
// ==========================================

// 1. Recupera profilo dall'API e riempie i campi
window.loadProfile = async function() {
    const email = appState.userEmail || "mario.rossi@email.it";
    const role = appState.userRole || "volunteer";
    
    // Imposta il badge del ruolo nella vista profilo
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

    // Mostra/nasconde la sezione delle competenze specifiche del volontario
    const volunteerFields = document.getElementById("profile-volunteer-fields");
    const volunteerCoupons = document.getElementById("profile-volunteer-coupons");
    if (volunteerFields) {
        volunteerFields.style.display = (role === 'volunteer') ? 'block' : 'none';
    }
    if (volunteerCoupons) {
        volunteerCoupons.style.display = (role === 'volunteer') ? 'block' : 'none';
    }

    try {
        // Recupera i dettagli dall'API backend
        const response = await fetch(`/api/volunteer/profile?email=${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error("Errore nel caricamento dati profilo");

        const profile = await response.json();

        // Compila i campi
        document.getElementById("profile-name").value = profile.name || "";
        document.getElementById("profile-surname").value = profile.surname || "";
        document.getElementById("profile-email").value = profile.email || email;
        document.getElementById("profile-phone").value = profile.phone || "";
        document.getElementById("profile-address").value = profile.address || "";

        // Compila le checkbox delle competenze se è un volontario
        if (role === 'volunteer') {
            const skills = profile.skills || [];
            if (document.getElementById("skill-trasporto")) document.getElementById("skill-trasporto").checked = skills.includes("Trasporto");
            if (document.getElementById("skill-accompagnamento")) document.getElementById("skill-accompagnamento").checked = skills.includes("Accompagnamento");
            if (document.getElementById("skill-compagnia")) document.getElementById("skill-compagnia").checked = skills.includes("Compagnia");

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
        // Dati segnaposto di fallback se la connessione è lenta
        document.getElementById("profile-name").value = role === "volunteer" ? "Mario" : "Angela";
        document.getElementById("profile-surname").value = role === "volunteer" ? "Rossi" : "Bianchi";
        document.getElementById("profile-email").value = email;
        document.getElementById("profile-phone").value = "333 123 4567";
        document.getElementById("profile-address").value = "Via Roma 1, Trento";
    }
}

// 2. Raccoglie input e invia PUT all'API
window.saveProfile = async function(event) {
    if (event) event.preventDefault();

    const role = appState.userRole || "volunteer";
    const email = document.getElementById("profile-email").value;
    const name = document.getElementById("profile-name").value;
    const surname = document.getElementById("profile-surname").value;
    const phone = document.getElementById("profile-phone").value;
    const address = document.getElementById("profile-address").value;

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
            showToast("Vincolo OCL fallito: Un volontario deve essere maggiorenne (Età >= 18)!", "danger");
            return;
        }

        const skills = [];
        if (document.getElementById("skill-trasporto") && document.getElementById("skill-trasporto").checked) skills.push("Trasporto");
        if (document.getElementById("skill-accompagnamento") && document.getElementById("skill-accompagnamento").checked) skills.push("Accompagnamento");
        if (document.getElementById("skill-compagnia") && document.getElementById("skill-compagnia").checked) skills.push("Compagnia");
        
        profileData.skills = skills;
        profileData.age = age;
        profileData.license = license;
        profileData.gender = gender;
    }

    try {
        const response = await fetch(`/api/volunteer/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();

        if (response.ok) {
            showToast("Profilo aggiornato con successo!", "success");
            if (role === 'volunteer') {
                loadVolunteerDashboard(); // aggiorna header volontario e sincronizza i punti
            }
        } else {
            showToast(`Errore: ${result.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nel salvataggio del profilo:", e);
        showToast("Si è verificato un errore durante l'aggiornamento.", "danger");
    }
}

// 3. Funzione reale per acquisto coupon con punti 
window.buyCoupon = async function(couponName, costoPunti) {
    const email = appState.userEmail || "mario.rossi@email.it";
    
    // Controllo locale per mostrare una notifica immediata
    if ((appState.points || 0) < costoPunti) {
        showToast(`Punti insufficienti per riscattare "${couponName}" (Costo: ${costoPunti} pts, Tuo saldo: ${appState.points} pts)`, "danger");
        return;
    }

    try {
        const response = await fetch(`/api/volunteer/coupons/redeem`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, couponName, costoPunti })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Coupon "${couponName}" acquistato con successo! Saldo ricalcolato.`, "success");
            
            // Scala i punti localmente e sincronizza la dashboard
            appState.points = data.newPoints;
            
            // Aggiorna gli elementi dei punti nelle varie viste
            const userPointsEl = document.getElementById("user-points");
            if (userPointsEl) userPointsEl.innerText = `${data.newPoints} pts`;
            
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
    // Inject Font Awesome for icons (if used)
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);
    
    // Inject Google Fonts
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(fonts);

    // Fetch and load all views into the container
    const viewFiles = ['public.html', 'shared.html', 'requester.html', 'volunteer.html', 'partner.html', 'admin.html'];
    const container = document.getElementById('app-container');
    
    try {
        for (const file of viewFiles) {
            // Append a timestamp to completely bypass browser caching during development!
            const response = await fetch(`/views/${file}?t=${Date.now()}`);
            if (response.ok) {
                const html = await response.text();
                container.innerHTML += html;
            }
        }

        // Teleport MODALS directly to the body to bypass layout and transform restrictions!
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            document.body.appendChild(modal);
        });

    } catch (e) {
        console.error("Errore nel caricamento delle viste:", e);
    }

    // Initial navigation
    navigateTo('home');
});
