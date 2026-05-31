// LOGICA PARTNER
// ==========================================

window.loadPartnerDashboard = async function() {
    const listBody = document.getElementById('partner-coupons-list');
    if (!listBody) return;

    // Imposta il nome nel banner
    const welcomeName = document.getElementById("partner-welcome-name");
    if (welcomeName && appState.userName) {
        welcomeName.innerText = appState.userName;
    } else if (welcomeName) {
        // Fallback or fetch from API if necessary
        try {
            const meRes = await authorizedFetch('/api/v1/auth/me');
            if (meRes.ok) {
                const me = await meRes.json();
                if (me.name) {
                    appState.userName = me.name;
                    welcomeName.innerText = me.name;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    const listBodyExpired = document.getElementById('partner-expired-coupons-list');

    if (!listBody) return;

    listBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 2rem;">
                <i class="fa-solid fa-spinner fa-spin"></i> Caricamento...
            </td>
        </tr>
    `;
    if (listBodyExpired) {
        listBodyExpired.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Caricamento...
                </td>
            </tr>
        `;
    }

    try {
        const response = await authorizedFetch('/api/v1/partners/coupons');
        if (!response.ok) throw new Error('Errore nel caricamento dei coupon');
        
        const coupons = await response.json();
        
        if (coupons.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Nessun premio attivo. Clicca su "Crea Nuovo Premio" per iniziare.
                    </td>
                </tr>
            `;
            if (listBodyExpired) {
                listBodyExpired.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            Nessun premio scaduto.
                        </td>
                    </tr>
                `;
            }
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        const activeCoupons = coupons.filter(c => c.expirationDate >= today);
        const expiredCoupons = coupons.filter(c => c.expirationDate < today);

        if (activeCoupons.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Nessun premio attivo.
                    </td>
                </tr>
            `;
        } else {
            listBody.innerHTML = activeCoupons.map(c => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 1rem;">
                        <strong>${c.title}</strong><br>
                        <small class="text-muted">Scade: ${new Date(c.expirationDate).toLocaleDateString('it-IT')}</small>
                    </td>
                    <td style="padding: 1rem;">${c.pointsCost}</td>
                    <td style="padding: 1rem; font-weight: bold; color: var(--secondary-color);">${c.redemptionsCount || 0}</td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick='openPartnerCouponForm(${JSON.stringify(c).replace(/'/g, "&apos;")})'>Modifica</button>
                        <button class="btn btn-danger" style="padding: 0.5rem 1rem;" onclick="deletePartnerCoupon('${c._id}')">Elimina</button>
                    </td>
                </tr>
            `).join('');
        }

        if (listBodyExpired) {
            if (expiredCoupons.length === 0) {
                listBodyExpired.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            Nessun premio scaduto.
                        </td>
                    </tr>
                `;
            } else {
                listBodyExpired.innerHTML = expiredCoupons.map(c => `
                    <tr style="border-bottom: 1px solid var(--border-color); opacity: 0.8;">
                        <td style="padding: 1rem;">
                            <strong>${c.title}</strong><br>
                            <small class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Scaduto il: ${new Date(c.expirationDate).toLocaleDateString('it-IT')}</small>
                        </td>
                        <td style="padding: 1rem;">${c.pointsCost}</td>
                        <td style="padding: 1rem; font-weight: bold; color: var(--secondary-color);">${c.redemptionsCount || 0}</td>
                        <td style="padding: 1rem;">
                            <button class="btn btn-danger" style="padding: 0.5rem 1rem;" onclick="deletePartnerCoupon('${c._id}')">Elimina</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error(error);
        showToast('Impossibile caricare i coupon.', 'danger');
    }
};

window.openPartnerCouponForm = function(coupon = null) {
    const titleEl = document.getElementById('partner-coupon-title');
    const descEl = document.getElementById('partner-coupon-description');
    const pointsEl = document.getElementById('partner-coupon-points');
    const expEl = document.getElementById('partner-coupon-expiration');
    const idEl = document.getElementById('partner-coupon-id');
    const formTitle = document.getElementById('partner-coupon-form-title');

    if (coupon) {
        formTitle.innerText = "Modifica Premio (Coupon)";
        idEl.value = coupon._id;
        titleEl.value = coupon.title;
        descEl.value = coupon.description;
        pointsEl.value = coupon.pointsCost;
        // Format date to YYYY-MM-DD for input type="date"
        let d = new Date(coupon.expirationDate);
        expEl.value = d.toISOString().split('T')[0];
    } else {
        formTitle.innerText = "Nuovo Premio (Coupon)";
        document.getElementById('partner-coupon-form').reset();
        idEl.value = "";
    }

    navigateTo('partner-coupon');
};

window.submitPartnerCoupon = async function(event) {
    event.preventDefault();
    
    const id = document.getElementById('partner-coupon-id').value;
    const title = document.getElementById('partner-coupon-title').value;
    const description = document.getElementById('partner-coupon-description').value;
    const pointsCost = document.getElementById('partner-coupon-points').value;
    const expirationDate = document.getElementById('partner-coupon-expiration').value;

    const payload = { title, description, pointsCost, expirationDate };

    try {
        let response;
        if (id) {
            response = await authorizedFetch('/api/v1/partners/coupons/' + id, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            response = await authorizedFetch('/api/v1/partners/coupons', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        const data = await response.json();
        if (!response.ok) {
            showToast(data.error || 'Errore durante il salvataggio.', 'danger');
            return;
        }

        showToast(id ? 'Premio aggiornato!' : 'Premio pubblicato con successo!', 'success');
        navigateTo('partner-dash');
    } catch (error) {
        console.error(error);
        showToast('Errore di connessione.', 'danger');
    }
};

window.deletePartnerCoupon = async function(id) {
    if (!confirm('Sei sicuro di voler eliminare questo coupon?')) return;
    
    try {
        const response = await authorizedFetch('/api/v1/partners/coupons/' + id, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            showToast('Errore durante leliminazione.', 'danger');
            return;
        }
        
        showToast('Coupon eliminato.', 'success');
        loadPartnerDashboard();
    } catch (error) {
        console.error(error);
        showToast('Errore di connessione.', 'danger');
    }
};

