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
            authorizedFetch('/api/v1/requests'),
            authorizedFetch('/api/v1/volunteers/me/tasks')
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
        const response = await authorizedFetch('/api/v1/volunteers/me');
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
                let optionsHtml = '';
                
                if (appState.skills.length !== 1) {
                    optionsHtml += '<option value="Tutti i servizi">Tutti i servizi</option>';
                }
                
                appState.skills.forEach(skill => {
                    optionsHtml += `<option value="${skill}">${skill}</option>`;
                });
                
                const currentVal = filterSelect.value;
                filterSelect.innerHTML = optionsHtml;
                
                if (appState.skills.length === 1) {
                    filterSelect.value = appState.skills[0];
                } else if (appState.skills.includes(currentVal) || currentVal === "Tutti i servizi") {
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
        const url = `/api/v1/requests?category=${encodeURIComponent(category)}`;
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
        const response = await authorizedFetch(`/api/v1/requests/${requestId}/assignments`, {
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
        const response = await authorizedFetch('/api/v1/volunteers/me/tasks');
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
        const response = await authorizedFetch(`/api/v1/requests/${taskId}/assignments`, {
            method: "DELETE"
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
        const response = await authorizedFetch('/api/v1/volunteers/coupons');
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
