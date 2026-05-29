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
window.toggleUserDropdown = function() {
    const dd = document.getElementById('user-dropdown');
    if (!dd) return;
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
}

// Funzioni e logica per il requester