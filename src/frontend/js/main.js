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