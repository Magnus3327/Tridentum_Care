// Simple Single Page App Router and Global State
const appState = {
    userRole: null, // 'requester', 'volunteer', 'partner', 'admin', null
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
}

function updateNavbar(routeId) {
    const navLinks = document.getElementById('dynamic-nav-links');
    if (!navLinks) return;
    
    let linksHTML = '';
    
    // Mostra link basati sulla route corrente per simulare i ruoli
    if (routeId.startsWith('req-')) {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('req-dashboard')">Le mie richieste</a>
            <a href="#" class="nav-link" onclick="navigateTo('profile')">Profilo</a>
            <a href="#" class="nav-link text-danger" onclick="navigateTo('home')">Esci</a>
        `;
    } else if (routeId.startsWith('vol-')) {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('vol-board')">Bacheca</a>
            <a href="#" class="nav-link" onclick="navigateTo('vol-store')">Store Premi (${appState.points} pts)</a>
            <a href="#" class="nav-link" onclick="navigateTo('profile')">Profilo</a>
            <a href="#" class="nav-link text-danger" onclick="navigateTo('home')">Esci</a>
        `;
    } else if (routeId.startsWith('partner-')) {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('partner-dash')">Dashboard</a>
            <a href="#" class="nav-link" onclick="navigateTo('partner-coupon')">Crea Coupon</a>
            <a href="#" class="nav-link text-danger" onclick="navigateTo('home')">Esci</a>
        `;
    } else if (routeId.startsWith('admin-')) {
        linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('admin-dash')">Moderazione</a>
            <a href="#" class="nav-link text-danger" onclick="navigateTo('home')">Esci</a>
        `;
    } else if (routeId === 'profile') {
         linksHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('home')">Torna alla Home</a>
            <a href="#" class="nav-link text-danger" onclick="navigateTo('home')">Esci</a>
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
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Simulate Login
function handleLogin(e, role) {
    e.preventDefault();
    appState.userRole = role;
    if (role === 'requester') navigateTo('req-dashboard');
    if (role === 'volunteer') navigateTo('vol-board');
    if (role === 'partner') navigateTo('partner-dash');
    if (role === 'admin') navigateTo('admin-dash');
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
            const response = await fetch(`/views/${file}`);
            if (response.ok) {
                const html = await response.text();
                container.innerHTML += html;
            }
        }
    } catch (e) {
        console.error("Errore nel caricamento delle viste:", e);
    }

    // Initial navigation
    navigateTo('home');
});
