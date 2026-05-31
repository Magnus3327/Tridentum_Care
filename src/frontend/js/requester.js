window.resetRequesterForm = function() {
    const form = document.getElementById('requester-form');
    if (form) form.reset();
    window.currentRequesterRequestId = null;
    const title = document.getElementById('req-form-title');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;
    if (title) title.innerText = 'Crea Nuova Richiesta di Aiuto';
    if (submitButton) submitButton.innerText = 'Invia Richiesta';
};

window.openNewRequesterRequest = async function() {
    resetRequesterForm();
    await renderDynamicRequestServices();
    navigateTo('req-form');
};

function getRequesterFormData() {
    return {
        serviceType: document.getElementById('req-serviceType')?.value,
        location: document.getElementById('req-location')?.value,
        date: document.getElementById('req-date')?.value,
        time: document.getElementById('req-time')?.value,
        notes: document.getElementById('req-notes')?.value || ''
    };
}

window.submitRequesterRequest = async function(event) {
    if (event) event.preventDefault();
    if (window.currentRequesterRequestId) {
        return updateRequesterRequest(window.currentRequesterRequestId);
    }
    return createRequesterRequest();
};

window.createRequesterRequest = async function() {
    const payload = getRequesterFormData();
    if (!payload.serviceType || !payload.location || !payload.date || !payload.time) {
        showToast('Compila tutti i campi richiesti prima di inviare la richiesta.', 'danger');
        return;
    }

    // Validazione data futura
    const requestDate = new Date(`${payload.date}T${payload.time}`);
    if (isNaN(requestDate.getTime()) || requestDate <= new Date()) {
        showToast('La data e ora della richiesta devono essere valide e future.', 'danger');
        return;
    }

    try {
        const response = await authorizedFetch('/api/v1/requesters/requests', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Impossibile creare la richiesta.'}`, 'danger');
            return;
        }

        showToast('Richiesta creata con successo.', 'success');
        navigateTo('req-dashboard');
    } catch (error) {
        console.error('Errore nella creazione della richiesta:', error);
        showToast('Si è verificato un errore durante l\'invio della richiesta.', 'danger');
    }
};

window.openRequesterEdit = async function(requestId) {
    const req = (window.requesterRequestsCache || []).find(r => r._id === requestId);
    if (!req) return;
    if (!isRequesterRequestEditable(req)) {
        showToast('Non è possibile modificare questa richiesta.', 'danger');
        return;
    }

    const form = document.getElementById('requester-form');
    if (!form) return;

    await renderDynamicRequestServices();

    document.getElementById('req-serviceType').value = req.serviceType;
    document.getElementById('req-location').value = req.location;
    document.getElementById('req-date').value = req.date;
    document.getElementById('req-time').value = req.time;
    document.getElementById('req-notes').value = req.notes || '';

    window.currentRequesterRequestId = requestId;
    document.getElementById('req-form-title').innerText = 'Modifica Richiesta';
    form.querySelector('button[type="submit"]').innerText = 'Salva Modifiche';
    navigateTo('req-form');
};

window.isRequesterRequestEditable = function(req) {
    if (!req) return false;
    if (req.status !== 'In Attesa di Volontario') return false;
    const now = new Date();
    const requestDate = new Date(`${req.date}T${req.time}`);
    return requestDate > now;
};

window.canRequesterComplete = function(req) {
    return req && req.status === 'In Corso';
};

window.canRequesterCancel = function(req) {
    if (!req) return false;
    if (req.status !== 'In Attesa di Volontario') return false;
    const now = new Date();
    const requestDate = new Date(`${req.date}T${req.time}`);
    return requestDate > now;
};

window.canRequesterRate = function(req) {
    return req && req.status === 'Completata';
};

window.renderRequesterRatingSection = function(req) {
    const ratingSection = document.getElementById('req-detail-rating-section');
    const ratingContent = document.getElementById('req-detail-rating-content');
    if (!ratingSection || !ratingContent) return;

    if (!window.canRequesterRate(req)) {
        ratingSection.style.display = 'none';
        ratingContent.innerHTML = '';
        return;
    }

    ratingSection.style.display = 'block';
    if (typeof req.rating === 'number' && req.rating > 0) {
        ratingContent.innerHTML = `
            <p style="margin: 0;">Hai già valutato questa richiesta con <strong>${req.rating} su 5</strong>.</p>
        `;
        return;
    }

    ratingContent.innerHTML = `
        <div class="form-group">
            <label class="form-label">Valutazione</label>
            <select id="req-rating" class="form-control form-control-lg">
                <option value="">Seleziona una valutazione...</option>
                <option value="5">5 - Ottimo</option>
                <option value="4">4 - Molto Buono</option>
                <option value="3">3 - Buono</option>
                <option value="2">2 - Sufficiente</option>
                <option value="1">1 - Insufficiente</option>
            </select>
        </div>
        <button class="btn btn-secondary btn-large btn-block" onclick="submitRequesterRating(window.currentRequesterRequestId)">Invia Valutazione</button>
    `;
};

window.submitRequesterRating = async function(requestId) {
    if (!requestId) return;

    const ratingValue = parseInt(document.getElementById('req-rating')?.value, 10);

    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
        showToast('Seleziona una valutazione valida da 1 a 5.', 'danger');
        return;
    }

    try {
        const response = await authorizedFetch(`/api/v1/requesters/requests/${encodeURIComponent(requestId)}/ratings`, {
            method: 'PUT',
            body: JSON.stringify({ rating: ratingValue })
        });

        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Impossibile salvare la valutazione.'}`, 'danger');
            return;
        }

        showToast('Valutazione inviata con successo.', 'success');
        navigateTo('req-dashboard');
    } catch (error) {
        console.error('Errore nella valutazione della richiesta:', error);
        showToast('Si è verificato un errore durante l invio della valutazione.', 'danger');
    }
};

window.updateRequesterRequest = async function(requestId) {
    const payload = getRequesterFormData();
    if (!payload.serviceType || !payload.location || !payload.date || !payload.time) {
        showToast('Compila tutti i campi richiesti prima di salvare le modifiche.', 'danger');
        return;
    }

    // Validazione data futura
    const requestDate = new Date(`${payload.date}T${payload.time}`);
    if (isNaN(requestDate.getTime()) || requestDate <= new Date()) {
        showToast('La data e ora della richiesta devono essere valide e future.', 'danger');
        return;
    }

    try {
        const response = await authorizedFetch(`/api/v1/requesters/requests/${encodeURIComponent(requestId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Impossibile aggiornare la richiesta.'}`, 'danger');
            return;
        }

        showToast('Richiesta aggiornata con successo.', 'success');
        navigateTo('req-dashboard');
    } catch (error) {
        console.error('Errore nell\'aggiornamento della richiesta:', error);
        showToast('Si è verificato un errore durante l\'aggiornamento della richiesta.', 'danger');
    }
};

window.loadRequesterDashboard = async function() {
    const container = document.getElementById('requester-requests-container');
    if (!container) return;

    // Mostra istantaneamente il nome salvato in stato locale per evitare sfarfallii
    const welcomeName = document.getElementById("requester-welcome-name");
    if (welcomeName && appState.userName) {
        welcomeName.innerText = appState.userName;
    }

    // Carica/Aggiorna il nome reale del richiedente per il banner di benvenuto
    try {
        const profileRes = await authorizedFetch('/api/v1/requesters/me');
        if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile.name) {
                appState.userName = profile.name;
                if (welcomeName) {
                    welcomeName.innerText = profile.name;
                }
            }
        }
    } catch (e) {
        console.error("Errore nel caricamento del nome richiedente:", e);
    }

    try {
        const response = await authorizedFetch('/api/v1/requesters/requests');
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const message = errorData?.error || 'Impossibile caricare le richieste.';
            throw new Error(message);
        }

        const requests = await response.json();
        if (!Array.isArray(requests) || requests.length === 0) {
            container.innerHTML = `
                <div class="card text-center text-muted" style="padding: 2rem;">
                    <i class="fa-solid fa-clipboard-question" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p style="margin: 0; font-weight: 600;">Non ci sono richieste per il momento.</p>
                    <p style="margin: 0.5rem 0 0;">Crea una nuova richiesta per avere aiuto dai volontari.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="grid-2" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; width: 100%;">';
        requests.forEach(req => {
            const badgeClass = req.status === 'Completata' ? 'badge-success' : req.status === 'Annullata' ? 'badge-danger' : 'badge-warning';
            let volunteerHtml = '';
            if (req.volunteerName) {
                volunteerHtml = `
                    <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); font-size: 0.875rem; color: var(--primary-color); font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
                        <i class="fa-solid fa-user"></i> Volontario: ${req.volunteerName} ${req.volunteerSurname}
                    </div>
                `;
            }
            html += `
                <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; min-height: 260px;">
                    <div>
                        <div class="flex justify-between items-center" style="margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
                            <span class="badge ${badgeClass}">${req.status}</span>
                            <span style="font-size: 0.9rem; color: var(--text-muted);">${req.date} ${req.time}</span>
                        </div>
                        <h3 style="margin: 0 0 0.75rem;">${req.serviceType}</h3>
                        <p style="margin: 0.25rem 0; color: var(--text-muted);">${req.location}</p>
                        <p style="margin: 1rem 0 0; color: var(--text-dark);">${req.notes || 'Nessuna nota aggiuntiva.'}</p>
                        ${volunteerHtml}
                    </div>
                    <button class="btn btn-outline btn-block btn-sm" style="margin-top: 1.5rem;" onclick="openRequesterDetail('${req._id}')">Vedi Dettagli</button>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        window.requesterRequestsCache = requests;
    } catch (error) {
        console.error('Errore nel caricamento delle richieste requester:', error);
        container.innerHTML = `
            <div class="card text-center text-danger" style="padding: 2rem;">
                <p>Impossibile caricare le tue richieste in questo momento. Riprova più tardi.</p>
            </div>
        `;
    }
};

window.openRequesterDetail = function(requestId) {
    const req = (window.requesterRequestsCache || []).find(r => r._id === requestId);
    if (!req) return;

    window.currentRequesterRequestId = requestId;
    document.getElementById('req-detail-status').innerText = req.status;
    document.getElementById('req-detail-title').innerText = req.serviceType;
    document.getElementById('req-detail-date').innerText = req.date;
    document.getElementById('req-detail-time').innerText = req.time;
    document.getElementById('req-detail-location').innerText = req.location;
    document.getElementById('req-detail-notes').innerText = req.notes || 'Nessuna nota aggiuntiva.';
    
    const volunteerRow = document.getElementById('req-detail-volunteer-row');
    const volunteerSpan = document.getElementById('req-detail-volunteer');
    if (volunteerRow && volunteerSpan) {
        if (req.volunteerName) {
            volunteerSpan.innerText = `${req.volunteerName} ${req.volunteerSurname}`;
            volunteerRow.style.display = 'block';
        } else {
            volunteerRow.style.display = 'none';
        }
    }

    const cancelBtn = document.getElementById('req-detail-cancel-btn');
    const completeBtn = document.getElementById('req-detail-complete-btn');
    const editBtn = document.getElementById('req-detail-edit-btn');
    const deleteBtn = document.getElementById('req-detail-delete-btn');
    
    if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.dataset.confirmState = 'inactive';
        deleteBtn.style.backgroundColor = '';
        deleteBtn.style.borderColor = '';
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can" style="margin-right: 0.5rem;"></i> Elimina definitivamente';
    }

    const editable = isRequesterRequestEditable(req);
    const canComplete = window.canRequesterComplete(req);
    const canCancel = window.canRequesterCancel(req);

    // Gestione bottoni per richieste completate o annullate
    if (req.status === 'Annullata' || req.status === 'Completata') {
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (completeBtn) completeBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }
    } else {
        // Mostra i bottoni e gestisci la loro abilitazione
        if (cancelBtn) {
            cancelBtn.style.display = canCancel ? 'inline-block' : 'none';
        }
        if (completeBtn) {
            completeBtn.style.display = canComplete ? 'inline-block' : 'none';
        }
        if (editBtn) {
            editBtn.style.display = editable ? 'inline-block' : 'none';
        }
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    }

    window.renderRequesterRatingSection(req);
    navigateTo('req-detail');
};

window.deleteRequesterRequest = async function(requestId) {
    if (!requestId) return;
    
    const deleteBtn = document.getElementById('req-detail-delete-btn');
    if (!deleteBtn) return;
    
    // Se il pulsante è già in attesa di conferma (secondo click)
    if (deleteBtn.dataset.confirmState === 'active') {
        let success = false;
        try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Eliminazione in corso...';
            
            const response = await authorizedFetch(`/api/v1/requesters/requests/${requestId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Errore durante l\'eliminazione della richiesta');
            }
            
            success = true;
        } catch (error) {
            console.error('Errore eliminazione richiesta:', error);
            showToast(error.message, 'danger');
            resetDeleteButton(deleteBtn);
        }

        if (success) {
            // Mostra la notifica in rosso (danger) ed effettua il reindirizzamento alla bacheca
            showToast('Richiesta eliminata definitivamente', 'danger');
            navigateTo('req-dashboard');
        }
    } else {
        // Primo click: entra nello stato di conferma
        deleteBtn.dataset.confirmState = 'active';
        deleteBtn.style.backgroundColor = '#d32f2f'; // Rosso acceso/intenso
        deleteBtn.style.borderColor = '#d32f2f';
        deleteBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="margin-right: 0.5rem;"></i> Premi di nuovo per eliminare definitivamente';
        
        // Timeout di 4 secondi per ripristinare il bottone originale se l'utente desiste
        if (window.deleteBtnTimeout) clearTimeout(window.deleteBtnTimeout);
        window.deleteBtnTimeout = setTimeout(() => {
            resetDeleteButton(deleteBtn);
        }, 4000);
    }
};

// Funzione ausiliaria per resettare il bottone di eliminazione al suo stato originario
function resetDeleteButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.dataset.confirmState = 'inactive';
    btn.style.backgroundColor = '';
    btn.style.borderColor = '';
    btn.innerHTML = '<i class="fa-solid fa-trash-can" style="margin-right: 0.5rem;"></i> Elimina definitivamente';
}

window.updateRequesterStatus = async function(requestId, status) {
    if (!requestId) return;

    try {
        const response = await authorizedFetch(`/api/v1/requesters/requests/${encodeURIComponent(requestId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Non è stato possibile aggiornare lo stato.'}`, 'danger');
            return;
        }

        showToast('Stato aggiornato con successo.', 'success');
        await loadRequesterDashboard();
        if (window.currentRequesterRequestId === requestId) {
            navigateTo('req-dashboard');
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento dello stato:', error);
        showToast('Si è verificato un errore durante l\'aggiornamento dello stato.', 'danger');
    }
};

window.cancelRequesterRequest = async function(requestId) {
    if (!requestId) return;

    try {
        const response = await authorizedFetch(`/api/v1/requesters/requests/${encodeURIComponent(requestId)}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) {
            showToast(`Errore: ${data.error || 'Non è stato possibile annullare la richiesta.'}`, 'danger');
            return;
        }

        showToast('Richiesta annullata con successo.', 'success');
        navigateTo('req-dashboard');
    } catch (error) {
        console.error('Errore nell\'annullamento della richiesta:', error);
        showToast('Si è verificato un errore durante l\'annullamento della richiesta.', 'danger');
    }
};

// Funzioni per i Modal