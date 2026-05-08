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