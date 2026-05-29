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