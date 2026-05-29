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
