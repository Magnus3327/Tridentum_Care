window.logout = function() {
    localStorage.removeItem('token');
    appState.userRole = null;
    appState.userAuthLvl = AUTH_LEVELS.UNAUTHORIZED;
    appState.userEmail = null;
    appState.userId = null;
    appState.points = 0;
    navigateTo('home');
    showToast('Hai disconnesso il profilo correttamente.', 'success');
}

window.togglePasswordVisibility = function(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);
    if (passwordInput && toggleIcon) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            toggleIcon.classList.remove("fa-eye");
            toggleIcon.classList.add("fa-eye-slash");
        } else {
            passwordInput.type = "password";
            toggleIcon.classList.remove("fa-eye-slash");
            toggleIcon.classList.add("fa-eye");
        }
    }
}

// Funzioni per l'autenticazione reale e tabbed login/register
window.openAuth = function(mode) {
    navigateTo('auth');
    setTimeout(() => {
        toggleAuthMode(mode);
    }, 50);
};

window.toggleAuthMode = function(mode) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    
    if (!loginForm || !registerForm || !tabLogin || !tabRegister) return;
    
    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        
        tabLogin.style.borderBottom = '3px solid var(--primary-color)';
        tabLogin.style.color = 'var(--primary-color)';
        
        tabRegister.style.borderBottom = '3px solid transparent';
        tabRegister.style.color = 'var(--text-muted)';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        
        tabLogin.style.borderBottom = '3px solid transparent';
        tabLogin.style.color = 'var(--text-muted)';
        
        tabRegister.style.borderBottom = '3px solid var(--secondary-color, var(--primary-color))';
        tabRegister.style.color = 'var(--secondary-color, var(--primary-color))';
    }
};

window.toggleRegisterRoleFields = function() {
    const roleSelect = document.getElementById('reg-role');
    const volunteerFields = document.getElementById('reg-volunteer-fields');
    if (!roleSelect || !volunteerFields) return;
    
    if (roleSelect.value === 'volunteer') {
        volunteerFields.style.display = 'block';
    } else {
        volunteerFields.style.display = 'none';
    }
};

// Funzione di gestione degli eventi dei form caricati dinamicamente
function bindAuthEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('/api/v1/auth/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (!response.ok) {
                    showToast(data.error || 'Credenziali non valide', 'danger');
                    return;
                }

                // Salva token e ripristina lo stato globale
                localStorage.setItem('token', data.token);
                appState.userRole = data.user.role;
                appState.userAuthLvl = typeof data.user.authLvl === 'number' ? data.user.authLvl : AUTH_LEVELS.UNAUTHORIZED;
                appState.userEmail = data.user.email;
                appState.userId = data.user.id;
                appState.userName = data.user.name;
                appState.points = data.user.points || 0;

                showToast(data.message, 'success');

                // Reindirizzamento basato sul ruolo e livello di autorizzazione
                if (data.user.role === 'volunteer') {
                    if (appState.userAuthLvl >= AUTH_LEVELS.ADMIN) {
                        navigateTo('admin-dash');
                    } else {
                        navigateTo('vol-board');
                    }
                } else if (data.user.role === 'requester') {
                    navigateTo('req-dashboard');
                } else if (data.user.role === 'partner') {
                    navigateTo('partner-dash');
                } else {
                    navigateTo('home');
                }
            } catch (error) {
                console.error('Errore login:', error);
                showToast('Errore durante l\'accesso. Controlla la connessione.', 'danger');
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const termsChecked = document.getElementById('reg-terms')?.checked;
            if (!termsChecked) {
                showToast('Devi accettare la Privacy Policy e i Termini di Servizio.', 'danger');
                return;
            }

            const name = document.getElementById('reg-name').value;
            const surname = document.getElementById('reg-surname').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;

            // controllo complessità password
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!passwordRegex.test(password)) {
                showToast('La password deve contenere almeno 8 caratteri, una lettera maiuscola, un numero e un simbolo.', 'danger');
                return;
            }

            const payload = { name, surname, email, password, role };
            payload.gdprConsent = true;

            if (role === 'volunteer') {
                const ageVal = document.getElementById('reg-age').value;
                if (!ageVal) {
                    showToast('L\'età è obbligatoria per registrarsi come volontario.', 'danger');
                    return;
                }
                const age = parseInt(ageVal);
                if (age < 18) {
                    showToast('Un volontario deve essere maggiorenne (Età >= 18)!', 'danger');
                    return;
                }
                payload.age = age;
                payload.gender = document.getElementById('reg-gender').value;
                payload.license = document.getElementById('reg-license').value;
            }

            try {
                const response = await fetch('/api/v1/auth/registrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (!response.ok) {
                    showToast(data.error || 'Impossibile completare la registrazione.', 'danger');
                    return;
                }

                // Salva token e aggiorna stato
                localStorage.setItem('token', data.token);
                appState.userRole = data.user.role;
                appState.userAuthLvl = typeof data.user.authLvl === 'number' ? data.user.authLvl : AUTH_LEVELS.UNAUTHORIZED;
                appState.userEmail = data.user.email;
                appState.userId = data.user.id;
                appState.points = data.user.points || 0;

                showToast(data.message, 'success');

                if (data.user.role === 'volunteer') {
                    if (appState.userAuthLvl >= AUTH_LEVELS.ADMIN) {
                        navigateTo('admin-dash');
                    } else {
                        navigateTo('vol-board');
                    }
                } else if (data.user.role === 'requester') {
                    navigateTo('req-dashboard');
                } else if (data.user.role === 'partner') {
                    navigateTo('partner-dash');
                } else {
                    navigateTo('home');
                }
            } catch (error) {
                console.error('Errore registrazione:', error);
                showToast('Errore durante la registrazione. Riprova più tardi.', 'danger');
            }
        });
    }
}
