function buildAdminSearchParams() {
    const searchInput = document.getElementById('admin-user-search');
    const roleFilter = document.getElementById('admin-user-role-filter');
    const query = searchInput ? searchInput.value.trim() : '';
    const role = roleFilter ? roleFilter.value : '';

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (role) params.set('role', role);
    return params.toString();
}

function renderAdminUserCard(user) {
    const roleLabel = getRoleLabel(user);
    const authLabel = user.role === 'volunteer' && typeof user.authLvl === 'number' && user.authLvl > AUTH_LEVELS.UNAUTHORIZED
        ? user.authLvl === AUTH_LEVELS.ADMIN ? 'Admin' : 'Moderatore'
        : null;
    let fullName = [user.name, user.surname].filter(Boolean).join(' ').trim();
    if (!fullName) {
        fullName = user.role === 'partner' ? 'Account Partner' : 'Utente senza nome';
    }
    const sameUser = appState.userId && user.id === appState.userId;
    const targetAuthLevel = getUserAuthLevel(user);
    const actorAuthLevel = appState.userAuthLvl || AUTH_LEVELS.UNAUTHORIZED;
    const isAdmin = actorAuthLevel === AUTH_LEVELS.ADMIN;
    const canPromote = isAdmin && user.role === 'volunteer' && targetAuthLevel < AUTH_LEVELS.ADMIN;
    const canDelete = isAdmin && targetAuthLevel < actorAuthLevel && !sameUser;
    const canSuspend = targetAuthLevel < actorAuthLevel && !sameUser && !user.isSuspended;
    const canRestore = targetAuthLevel < actorAuthLevel && !sameUser && user.isSuspended;
    const suspensionCount = user.suspensionCount || 0;

    let promoteHtml = '';
    if (canPromote) {
        promoteHtml = `
            <div class="dropdown-wrapper" style="position: relative; display: inline-block;">
                <button type="button" class="btn btn-outline" style="padding: 0.5rem 0.75rem; border-color: var(--primary-color); color: var(--primary-color);" onclick="window.togglePromoteDropdown(event, '${user.id || user._id}')" title="Gestisci Permessi">
                    Permessi <i class="fa-solid fa-chevron-down" style="font-size: 0.8em; margin-left: 0.2rem;"></i>
                </button>
                <div id="promote-dropdown-${user.id || user._id}" class="promote-dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 0.5rem; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-md); z-index: 10; min-width: 230px; overflow: hidden; flex-direction: column;">
                    ${targetAuthLevel < AUTH_LEVELS.MODERATOR ? `
                    <button type="button" class="dropdown-item btn-block text-left" style="padding: 0.75rem 1rem; border: none; background: transparent; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: var(--transition); text-align: left;" onmouseover="this.style.backgroundColor='var(--background-light)'" onmouseout="this.style.backgroundColor='transparent'" onclick="promoteAdminUser('${user.id || user._id}', ${AUTH_LEVELS.MODERATOR})">
                        <i class="fa-solid fa-shield-halved text-primary" style="width: 20px; text-align: center;"></i> Promuovi a Moderatore
                    </button>
                    ` : ''}
                    ${targetAuthLevel > AUTH_LEVELS.UNAUTHORIZED ? `
                    <button type="button" class="dropdown-item btn-block text-left" style="padding: 0.75rem 1rem; border: none; background: transparent; cursor: pointer; border-top: 1px solid var(--border-color); transition: var(--transition); text-align: left; color: var(--danger-color);" onmouseover="this.style.backgroundColor='var(--background-light)'" onmouseout="this.style.backgroundColor='transparent'" onclick="promoteAdminUser('${user.id || user._id}', ${AUTH_LEVELS.UNAUTHORIZED})">
                        <i class="fa-solid fa-user-minus" style="width: 20px; text-align: center;"></i> Rimuovi Permessi
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    let suspensionBadge = '';
    if (user.isSuspended) {
        let totalDuration = '';
        if (user.suspensionCount === 1) totalDuration = '12 ore';
        else if (user.suspensionCount === 2) totalDuration = '1 giorno';
        else if (user.suspensionCount === 3) totalDuration = '1 settimana';
        else if (user.suspensionCount >= 4) totalDuration = '1 mese';

        if (user.suspendedUntil) {
            const diffMs = new Date(user.suspendedUntil) - new Date();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            let remainingText = '';
            if (diffDays > 0) remainingText = `${diffDays}g rimanenti`;
            else remainingText = `${Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)))}h rimanenti`;
            
            suspensionBadge = `<span class="badge badge-danger" style="background-color: var(--danger-color); color: white;">Sospeso ${totalDuration ? 'per ' + totalDuration : ''} (${remainingText})</span>`;
        } else {
            suspensionBadge = `<span class="badge badge-danger" style="background-color: var(--danger-color); color: white;">Sospeso ${totalDuration ? 'per ' + totalDuration : ''}</span>`;
        }
    }

    return `
        <div class="card" style="padding: 1rem 1.1rem; border-left: 5px solid ${targetAuthLevel === AUTH_LEVELS.ADMIN ? 'var(--accent-color)' : 'var(--primary-color)'}; overflow: visible; opacity: ${user.isSuspended ? '0.75' : '1'};">
            <div class="flex justify-between items-start" style="gap: 1rem; align-items: flex-start;">
                <div style="min-width: 0;">
                    <div class="flex gap-1" style="flex-wrap: wrap; margin-bottom: 0.45rem;">
                        <span class="badge badge-primary">${roleLabel}</span>
                        ${authLabel ? `<span class="badge badge-secondary">${authLabel}</span>` : ''}
                        ${sameUser ? `<span class="badge badge-success">Sei tu</span>` : ''}
                        ${suspensionBadge}
                    </div>
                    <h4 style="margin-bottom: 0.25rem; word-break: break-word;">${fullName}</h4>

                </div>
                <div class="flex gap-1" style="flex-wrap: wrap; justify-content: flex-end; position: relative;">
                    ${promoteHtml}
                    <button type="button" class="btn btn-info" style="padding: 0.5rem 0.75rem; color: #0c5460; background-color: #d1ecf1; border: 1px solid #bee5eb;" onclick="window.showUserDetailsModal('${user.id || user._id}')">Dettagli</button>
                    ${canSuspend ? `<button type="button" class="btn btn-warning" style="padding: 0.5rem 0.75rem; color: #856404; background-color: #FFF3CD; border: 1px solid #ffeeba;" onclick="suspendAdminUser('${user.id || user._id}', ${suspensionCount})">Sospendi</button>` : ''}
                    ${canRestore ? `<button type="button" class="btn btn-success" style="padding: 0.5rem 0.75rem;" onclick="restoreAdminUser('${user.id || user._id}')">Riattiva</button>` : ''}
                    ${canDelete ? `<button type="button" class="btn btn-danger" style="padding: 0.5rem 0.75rem;" onclick="deleteAdminUser('${user.id || user._id}')">Elimina</button>` : ''}
                </div>
            </div>
            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
                <p class="text-muted" style="margin-bottom: 0; font-size: 0.9rem; word-break: break-word;"><i class="fa-regular fa-envelope"></i> ${user.email || 'Email non disponibile'}</p>
            </div>
        </div>
    `;
}

window.selectedPartnerId = null;

window.showUserDetailsModal = function(userId) {
    const user = window.adminUsersCache?.find(u => String(u.id || u._id) === String(userId));
    if (!user) {
        alert("Errore: Utente non trovato nella cache locale. Ricarica la pagina.");
        return;
    }
    
    const content = document.getElementById('user-details-content');
    const partnerSection = document.getElementById('partner-password-section');
    
    let html = `
        <div><strong>Nome / Azienda:</strong> ${user.name || ''} ${user.surname || ''} ${user.companyName || ''}</div>
        <div><strong>Email:</strong> ${user.email || 'N/A'}</div>
        <div><strong>Ruolo:</strong> ${getRoleLabel(user)}</div>
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>ID:</strong> <span style="font-family: monospace;">${user.id || user._id}</span></div>
    `;
    if (user.phone) html += `<div><strong>Telefono:</strong> ${user.phone}</div>`;
    if (user.address || user.location) html += `<div><strong>Indirizzo/Sede:</strong> ${user.address || user.location}</div>`;
    if (user.legalForm) html += `<div><strong>Forma Giuridica:</strong> ${user.legalForm}</div>`;
    if (user.skills && user.skills.length > 0) html += `<div><strong>Competenze:</strong> ${user.skills.join(', ')}</div>`;
    if (user.availability) html += `<div><strong>Disponibilità:</strong> ${user.availability}</div>`;
    if (user.isSuspended) html += `<div><strong>Stato Account:</strong> Sospeso (Sospensioni totali: ${user.suspensionCount})</div>`;
    
    if (!content || !partnerSection) {
        alert("Errore visivo: il tuo browser ha memorizzato la vecchia grafica. Premi Cmd + Shift + R per forzare l'aggiornamento!");
        return;
    }

    content.innerHTML = html;
    
    if (user.role === 'partner') {
        window.selectedPartnerId = userId;
        partnerSection.style.display = 'block';
    } else {
        window.selectedPartnerId = null;
        partnerSection.style.display = 'none';
    }
    
    window.openModal('user-details-modal');
};

window.closeUserDetailsModal = function() {
    window.closeModal('user-details-modal');
    window.selectedPartnerId = null;
};

window.resetPartnerPassword = async function() {
    if (!window.selectedPartnerId) return;
    const userId = window.selectedPartnerId;
    
    try {
        const response = await authorizedFetch('/api/admin/users/' + userId + '/reset-password', {
            method: 'PUT'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Errore durante il reset della password');
        
        await navigator.clipboard.writeText(data.newPassword);
        showToast('Password generata e copiata negli appunti!', 'success');
        
        const user = window.adminUsersCache?.find(u => String(u.id || u._id) === String(userId));
        if (user) {
            document.getElementById('partner-cred-email').innerText = user.email;
            document.getElementById('partner-cred-password').value = data.newPassword;
            window.openModal('partner-credentials-modal');
            window.closeUserDetailsModal();
        }
    } catch (error) {
        window.showToast(error.message, 'error');
    }
};

async function loadAdminUsers() {
    const results = document.getElementById('admin-users-results');
    const countBadge = document.getElementById('admin-users-count');
    const summaryBadge = document.getElementById('admin-summary-badge');
    if (!results) return;

    results.innerHTML = `
        <div class="card text-center text-muted" style="padding: 1.5rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.25rem; margin-bottom: 0.5rem;"></i>
            <p style="margin-bottom: 0;">Caricamento utenti...</p>
        </div>
    `;

    try {
        const queryString = buildAdminSearchParams();
        const response = await authorizedFetch(`/api/admin/users${queryString ? `?${queryString}` : ''}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Impossibile caricare gli utenti');
        }

        window.adminUsersCache = Array.isArray(data) ? data : [];

        if (countBadge) {
            countBadge.innerText = `${window.adminUsersCache.length} utenti`;
        }
        if (summaryBadge) {
            const adminCount = window.adminUsersCache.filter(user => user.role === 'volunteer' && user.authLvl === AUTH_LEVELS.ADMIN).length;
            const moderatorCount = window.adminUsersCache.filter(user => user.role === 'volunteer' && user.authLvl === AUTH_LEVELS.MODERATOR).length;
            const volunteerCount = window.adminUsersCache.filter(user => user.role === 'volunteer' && user.authLvl === AUTH_LEVELS.UNAUTHORIZED).length;
            summaryBadge.innerText = `${window.adminUsersCache.length} utenti, ${adminCount} admin, ${moderatorCount} moderatori, ${volunteerCount} volontari`;
        }

        if (window.adminUsersCache.length === 0) {
            results.innerHTML = `
                <div class="card text-center text-muted" style="padding: 1.5rem;">
                    <p style="margin-bottom: 0;">Nessun utente trovato con i filtri attuali.</p>
                </div>
            `;
            return;
        }

        results.innerHTML = window.adminUsersCache.map(renderAdminUserCard).join('');
    } catch (error) {
        console.error('Errore caricamento admin users:', error);
        results.innerHTML = `
            <div class="card text-center text-danger" style="padding: 1.5rem;">
                <p style="margin-bottom: 0;">${error.message}</p>
            </div>
        `;
        if (countBadge) countBadge.innerText = '0 utenti';
    }
}

window.searchAdminUsers = async function() {
    await loadAdminUsers();
};

window.resetAdminSearch = async function() {
    const searchInput = document.getElementById('admin-user-search');
    const roleFilter = document.getElementById('admin-user-role-filter');
    if (searchInput) searchInput.value = '';
    if (roleFilter) roleFilter.value = '';
    await loadAdminUsers();
};

window.promoteAdminUser = async function(userId, targetLevel) {
    if (!userId) return;
    try {
        const payload = targetLevel !== undefined ? { targetLevel } : {};
        const response = await authorizedFetch(`/api/admin/volunteers/${encodeURIComponent(userId)}/admin`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || 'Impossibile promuovere l\'utente.', 'danger');
            return;
        }

        showToast(data.message || 'Utente promosso con successo.', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Errore promozione admin:', error);
        showToast('Si è verificato un errore durante la promozione.', 'danger');
    }
};

window.togglePromoteDropdown = function(event, userId) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.promote-dropdown-menu').forEach(el => {
        if (el.id !== `promote-dropdown-${userId}`) el.style.display = 'none';
    });
    const dd = document.getElementById(`promote-dropdown-${userId}`);
    if (dd) {
        dd.style.display = dd.style.display === 'flex' ? 'none' : 'flex';
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown-wrapper')) {
        document.querySelectorAll('.promote-dropdown-menu').forEach(el => el.style.display = 'none');
    }
});

window.suspendAdminUser = async function(userId, currentCount) {
    if (!userId) return;
    const newCount = currentCount + 1;
    let durationMsg = '';
    if (newCount === 1) durationMsg = '12 ore';
    else if (newCount === 2) durationMsg = '1 giorno';
    else if (newCount === 3) durationMsg = '1 settimana';
    else durationMsg = '1 mese';

    const confirmed = window.confirm(`Vuoi sospendere questo utente?\nQuesta sarà la sua ${newCount}° sospensione, che durerà automaticamente ${durationMsg}. Confermi?`);
    if (!confirmed) return;

    try {
        const response = await authorizedFetch(`/api/admin/users/${encodeURIComponent(userId)}/suspend`, {
            method: 'PUT'
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || "Impossibile sospendere l'utente.", 'danger');
            return;
        }

        showToast(data.message || 'Utente sospeso con successo.', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Errore sospensione admin:', error);
        showToast("Si è verificato un errore durante la sospensione.", 'danger');
    }
};

window.restoreAdminUser = async function(userId) {
    if (!userId) return;
    const confirmed = window.confirm("Vuoi riattivare questo utente? L'accesso sarà sbloccato immediatamente.");
    if (!confirmed) return;

    try {
        const response = await authorizedFetch(`/api/admin/users/${encodeURIComponent(userId)}/restore`, {
            method: 'PUT'
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || "Impossibile riattivare l'utente.", 'danger');
            return;
        }

        showToast(data.message || 'Utente riattivato con successo.', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Errore riattivazione admin:', error);
        showToast("Si è verificato un errore durante la riattivazione.", 'danger');
    }
};

window.deleteAdminUser = async function(userId) {
    if (!userId) return;
    const confirmed = window.confirm('Vuoi eliminare questo utente? L\'operazione è irreversibile.');
    if (!confirmed) return;

    try {
        const response = await authorizedFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || 'Impossibile eliminare l\'utente.', 'danger');
            return;
        }

        showToast(data.message || 'Utente eliminato con successo.', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Errore eliminazione admin:', error);
        showToast('Si è verificato un errore durante l\'eliminazione.', 'danger');
    }
};

async function loadAdminDashboard() {
    const partnerSection = document.getElementById('admin-partner-section');
    const partnerForm = document.getElementById('admin-partner-form');
    const isAdmin = appState.userAuthLvl === AUTH_LEVELS.ADMIN;

    if (partnerSection) {
        partnerSection.style.display = isAdmin ? 'block' : 'none';
        
        const gridContainer = partnerSection.closest('.grid-2');
        if (gridContainer) {
            if (isAdmin) {
                gridContainer.classList.remove('admin-moderator-layout');
            } else {
                gridContainer.classList.add('admin-moderator-layout');
            }
        }
    }

    if (partnerForm && !partnerForm.dataset.bound) {
        partnerForm.dataset.bound = 'true';
        partnerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!isAdmin) {
                showToast('Solo gli amministratori possono creare partner.', 'danger');
                return;
            }

            const payload = {
                email: document.getElementById('admin-partner-email')?.value.trim(),
                password: document.getElementById('admin-partner-password')?.value
            };

            try {
                const response = await authorizedFetch('/api/admin/partner', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (!response.ok) {
                    showToast(data.error || 'Impossibile creare il partner.', 'danger');
                    return;
                }

                showToast('Partner creato con successo.', 'success');
                partnerForm.reset();
                await loadAdminUsers();
            } catch (error) {
                console.error('Errore creazione partner admin:', error);
                showToast('Si è verificato un errore durante la creazione del partner.', 'danger');
            }
        });
    }

    const searchInput = document.getElementById('admin-user-search');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        searchInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await loadAdminUsers();
            }
        });
    }

    const roleFilter = document.getElementById('admin-user-role-filter');
    if (roleFilter && !roleFilter.dataset.bound) {
        roleFilter.dataset.bound = 'true';
        roleFilter.addEventListener('change', async () => {
            await loadAdminUsers();
        });
    }

    await loadAdminUsers();
    await window.loadAdminRequests();
}

window.loadAdminRequests = async function() {
    const container = document.getElementById('admin-requests-results');
    if (!container) return;

    container.innerHTML = `
        <div class="card text-center text-muted" style="padding: 1.5rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.25rem; margin-bottom: 0.5rem;"></i>
            <p style="margin-bottom: 0;">Caricamento richieste...</p>
        </div>
    `;

    try {
        const response = await authorizedFetch('/api/admin/requests');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Impossibile caricare le richieste');
        }

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted" style="padding: 1.5rem;">
                    <p style="margin-bottom: 0;">Nessuna richiesta trovata.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">';
        data.forEach(req => {
            const badgeClass = req.status === 'Completata' ? 'badge-success' : req.status === 'Annullata' ? 'badge-danger' : 'badge-warning';
            html += `
                <div class="card" style="padding: 1rem;">
                    <div class="flex justify-between items-center" style="margin-bottom: 0.5rem;">
                        <span class="badge ${badgeClass}">${req.status}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${req.date || ''} ${req.time || ''}</span>
                    </div>
                    <h4 style="margin: 0 0 0.5rem;">${req.serviceType || 'Servizio'}</h4>
                    <p style="margin: 0 0 0.5rem; font-size: 0.9rem; color: var(--text-muted);">${req.location || ''}</p>
                    <p style="margin: 0 0 1rem; font-size: 0.85rem;">Utente ID: ${req.userId || 'N/A'}</p>
                    <button class="btn btn-danger btn-block" onclick="deleteAdminRequest('${req._id}')">Elimina Richiesta</button>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Errore caricamento richieste admin:', error);
        container.innerHTML = `
            <div class="card text-center text-danger" style="padding: 1.5rem;">
                <p style="margin-bottom: 0;">${error.message}</p>
            </div>
        `;
    }
};

window.deleteAdminRequest = async function(requestId) {
    if (!requestId) return;
    const confirmed = window.confirm("Vuoi davvero eliminare questa richiesta? L'operazione è irreversibile.");
    if (!confirmed) return;

    try {
        const response = await authorizedFetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || 'Impossibile eliminare la richiesta.', 'danger');
            return;
        }

        showToast(data.message || 'Richiesta eliminata con successo.', 'success');
        await window.loadAdminRequests();
    } catch (error) {
        console.error('Errore eliminazione richiesta:', error);
        showToast("Si è verificato un errore durante l'eliminazione.", 'danger');
    }
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
    'vol-map': 'view-vol-map',
    'partner-dash': 'view-partner-dash',
    'partner-coupon': 'view-partner-coupon',
    'admin-dash': 'view-admin-dash',
    'privacy': 'view-public-privacy',
    'tos': 'view-public-tos'
};

// Helper per fetch autenticate con JWT