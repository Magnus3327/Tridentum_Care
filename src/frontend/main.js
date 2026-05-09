// Simple Single Page App Router and Global State
const appState = {
    userRole: null, // 'requester', 'volunteer', 'partner', 'admin', null
    userEmail: null, // logged in email
    points: 1250,
};

// Navigation mapping
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
    
    // Hide all views
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show target view
    const targetView = document.getElementById(routes[routeId]);
    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo(0, 0);
    }
    
    updateNavbar(routeId);

    // Dynamic hook loading based on view routing
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
    
    // Mostra link basati sulla route corrente per simulare i ruoli
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

// Modal functions
// Make them global so onclick attributes work correctly
window.openModal = function(modalId) {
    document.getElementById(modalId).classList.add('active');
}
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Global Toast System (silent, elegant, non-blocking notifications)
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

    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 50);

    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-15px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Logout helper
window.logout = function() {
    appState.userRole = null;
    appState.userEmail = null;
    navigateTo('home');
}

// Simulate Login
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
// VOLUNTEER ACTIONS & BOARD CODES
// ==========================================

// 1. Get volunteer profile information & populate dashboard header
async function loadVolunteerDashboard() {
    const email = appState.userEmail || "mario.rossi@email.it";
    
    try {
        const response = await fetch(`/api/volunteer/profile?email=${encodeURIComponent(email)}`);
        if (response.ok) {
            const profile = await response.json();
            appState.points = profile.points || 0;
            
            // Set values on dashboard
            const welcomeName = document.getElementById("volunteer-welcome-name");
            const headerPoints = document.getElementById("volunteer-header-points");
            if (welcomeName) welcomeName.innerText = profile.name || "Volontario";
            if (headerPoints) headerPoints.innerHTML = `${profile.points} <span style="font-size: 1rem;">pts</span>`;
            
            // Sync with navbar points preview
            updateNavbar('vol-board');
        }
    } catch (e) {
        console.error("Errore nel caricamento del profilo volontario:", e);
    }
    
    // Load lists
    loadActiveRequests();
    loadMyTasks();
}

// 2. Fetch active requests from database and render
window.loadActiveRequests = async function() {
    const container = document.getElementById("volunteer-requests-container");
    if (!container) return;

    const filterSelect = document.getElementById("request-category-filter");
    const category = filterSelect ? filterSelect.value : "Tutti i servizi";

    try {
        const url = `/api/volunteer/requests?category=${encodeURIComponent(category)}`;
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

        // Render request cards in a beautiful grid or list style
        let html = '<div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; width: 100%;">';
        
        requests.forEach(req => {
            const badgeClass = getCategoryBadgeClass(req.category);
            const badgeStyle = req.category === "Tecnologia" ? 'style="background-color: #E2D9F3; color: #5F25B4;"' : '';
            
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
        
        // Cache requests globally on window to access detail views without refetching
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

// 3. Helper to determine CSS class based on Category
function getCategoryBadgeClass(cat) {
    if (cat === "Spesa") return "badge-primary";
    if (cat === "Farmaci") return "badge-success";
    if (cat === "Compagnia") return "badge-warning";
    return "badge-primary"; // fallback
}

// 4. Show request details in a modal
window.showRequestDetails = function(requestId) {
    const req = window.activeRequestsCache.find(r => r._id === requestId);
    if (!req) return;

    const modal = document.getElementById("vol-req-detail-modal");
    if (!modal) return;

    // Set textual details
    document.getElementById("modal-req-title").innerText = req.title;
    document.getElementById("modal-req-requester").innerHTML = `<i class="fa-solid fa-user"></i> <strong>Richiedente:</strong> ${req.requesterName}`;
    document.getElementById("modal-req-address").innerText = req.address;
    document.getElementById("modal-req-datetime").innerText = req.dateTime;
    document.getElementById("modal-req-points").innerText = `+${req.points} pts`;
    document.getElementById("modal-req-description").innerText = req.description;

    // Badges details
    const badge = document.getElementById("modal-req-badge");
    badge.innerText = req.category;
    badge.className = `badge ${getCategoryBadgeClass(req.category)}`;
    if (req.category === "Tecnologia") {
        badge.style.backgroundColor = "#E2D9F3";
        badge.style.color = "#5F25B4";
    } else {
        badge.style.backgroundColor = "";
        badge.style.color = "";
    }

    // Accept button setup
    const acceptBtn = document.getElementById("modal-accept-btn");
    acceptBtn.onclick = async function() {
        await acceptRequest(req._id);
        closeModal("vol-req-detail-modal");
    };

    openModal("vol-req-detail-modal");
}

// 5. Accept Request via API
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
            loadVolunteerDashboard(); // reload data
        } else {
            showToast(`Errore: ${data.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nell'accettazione dell'incarico:", e);
        showToast("Si è verificato un errore durante l'operazione di presa in carico.", "danger");
    }
}

// 6. Load assigned tasks for the current volunteer
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
            const badgeStyle = task.category === "Tecnologia" ? 'style="background-color: #E2D9F3; color: #5F25B4;"' : '';
            
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
            loadVolunteerDashboard(); // reload to sync lists
        } else {
            showToast(`Errore: ${data.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nell'annullamento dell'incarico:", e);
        showToast("Si è verificato un errore durante l'annullamento.", "danger");
    }
}

// 8. Update points display on store page
function updateStorePoints() {
    const pointsBal = document.getElementById("store-points-balance");
    if (pointsBal) {
        pointsBal.innerHTML = `${appState.points} <span style="font-size: 1.5rem;">pts</span>`;
    }
}

// ==========================================
// PROFILE LOADING AND SAVING
// ==========================================

// 1. Fetch user profile from API and fill inputs
window.loadProfile = async function() {
    const email = appState.userEmail || "mario.rossi@email.it";
    const role = appState.userRole || "volunteer";
    
    // Set role badge on profile view
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

    // Toggle volunteer-specific skills form section
    const volunteerFields = document.getElementById("profile-volunteer-fields");
    if (volunteerFields) {
        volunteerFields.style.display = (role === 'volunteer') ? 'block' : 'none';
    }

    try {
        // Fetch details from backend API
        const response = await fetch(`/api/volunteer/profile?email=${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error("Errore nel caricamento dati profilo");

        const profile = await response.json();

        // Populate fields
        document.getElementById("profile-name").value = profile.name || "";
        document.getElementById("profile-surname").value = profile.surname || "";
        document.getElementById("profile-email").value = profile.email || email;
        document.getElementById("profile-phone").value = profile.phone || "";
        document.getElementById("profile-address").value = profile.address || "";

        // Populate skills checkbox if volunteer
        if (role === 'volunteer') {
            const skills = profile.skills || [];
            document.getElementById("skill-spesa").checked = skills.includes("Spesa");
            document.getElementById("skill-farmaci").checked = skills.includes("Farmaci");
            document.getElementById("skill-compagnia").checked = skills.includes("Compagnia");
            document.getElementById("skill-tecnologia").checked = skills.includes("Tecnologia");

            if (document.getElementById("profile-age")) document.getElementById("profile-age").value = profile.age || "";
            if (document.getElementById("profile-license")) document.getElementById("profile-license").value = profile.license || "";
            if (document.getElementById("profile-gender")) document.getElementById("profile-gender").value = profile.gender || "";
        }
    } catch (e) {
        console.error("Errore nel caricamento del profilo:", e);
        // Fallback placeholder data if connection is slow
        document.getElementById("profile-name").value = role === "volunteer" ? "Mario" : "Angela";
        document.getElementById("profile-surname").value = role === "volunteer" ? "Rossi" : "Bianchi";
        document.getElementById("profile-email").value = email;
        document.getElementById("profile-phone").value = "333 123 4567";
        document.getElementById("profile-address").value = "Via Roma 1, Trento";
    }
}

// 2. Collect inputs and send PUT request to API
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

        // OCL Invariant: Age must be >= 18 (maggorenne)
        if (age !== null && age < 18) {
            showToast("Vincolo OCL fallito: Un volontario deve essere maggiorenne (Età >= 18)!", "danger");
            return;
        }

        const skills = [];
        if (document.getElementById("skill-spesa").checked) skills.push("Spesa");
        if (document.getElementById("skill-farmaci").checked) skills.push("Farmaci");
        if (document.getElementById("skill-compagnia").checked) skills.push("Compagnia");
        if (document.getElementById("skill-tecnologia").checked) skills.push("Tecnologia");
        
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
                loadVolunteerDashboard(); // refresh volunteer header and sync points
            }
        } else {
            showToast(`Errore: ${result.error}`, "danger");
        }
    } catch (e) {
        console.error("Errore nel salvataggio del profilo:", e);
        showToast("Si è verificato un errore durante l'aggiornamento.", "danger");
    }
}

// 3. Real Points-Deducting Coupon Purchasing Function 
window.buyCoupon = async function(couponName, costoPunti) {
    const email = appState.userEmail || "mario.rossi@email.it";
    
    // Check locally first to give instant elegant toast
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
            
            // Deduct locally and sync dashboards
            appState.points = data.newPoints;
            
            // Refresh points elements across views
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
