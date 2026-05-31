window.adminUsersCache = [];
async function fetchConstants() {
    if (appState.constants) return appState.constants;
    try {
        const response = await fetch('/api/v1/constants');
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
