// Simple Router
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        window.addEventListener('popstate', () => this.handleRoute());
    }

    register(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        window.history.pushState({}, '', `/${path}`);
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname.substring(1) || 'login';
        this.currentRoute = path;
        
        const handler = this.routes[path] || this.routes['404'];
        if (handler) {
            handler();
        }
    }

    getCurrentRoute() {
        return this.currentRoute;
    }
}

const router = new Router();

// Utility Functions
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; min-width: 300px;';
    
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    alertDiv.innerHTML = `
        <i class="fas fa-${icon}"></i>
        ${message}
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function showModal(title, content, onSubmit = null) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    ${i18n.t('common.cancel')}
                </button>
                ${onSubmit ? `<button class="btn btn-primary" id="modal-submit">${i18n.t('common.submit')}</button>` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    if (onSubmit) {
        document.getElementById('modal-submit').addEventListener('click', () => {
            onSubmit();
            modal.remove();
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.getLanguage() === 'ar' ? 'ar-SA' : 'en-US');
}

function formatCurrency(amount) {
    return `${amount.toFixed(2)} ${i18n.t('common.jod') || 'JOD'}`;
}

// Page Renderers
function renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="login-container">
            <div class="lang-toggle">
                <button class="btn btn-secondary" onclick="toggleLanguage()">
                    <i class="fas fa-language"></i>
                    ${i18n.getLanguage() === 'en' ? 'عربي' : 'English'}
                </button>
            </div>
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo">
                        <i class="fas fa-tooth"></i>
                    </div>
                    <h1 class="login-title">${i18n.t('appName')}</h1>
                    <p class="login-subtitle">${i18n.t('login.subtitle')}</p>
                </div>
                <form id="loginForm">
                    <div class="form-group">
                        <label for="username">${i18n.t('login.username')}</label>
                        <input type="text" id="username" class="input" required autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label for="password">${i18n.t('login.password')}</label>
                        <input type="password" id="password" class="input" required autocomplete="current-password">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        ${i18n.t('login.loginButton')}
                    </button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading"></span> ${i18n.t('common.loading')}`;
    
    try {
        const user = await auth.login(username, password);
        
        if (user.is_first_login) {
            showPasswordChangeModal();
        } else {
            showAlert(i18n.t('common.success'));
            auth.redirectToDashboard();
        }
    } catch (error) {
        showAlert(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = i18n.t('login.loginButton');
    }
}

function showPasswordChangeModal() {
    const content = `
        <form id="passwordChangeForm">
            <div class="form-group">
                <label for="newPassword">${i18n.t('login.newPassword')}</label>
                <input type="password" id="newPassword" class="input" required minlength="6">
            </div>
            <div class="form-group">
                <label for="confirmPassword">${i18n.t('login.confirmPassword')}</label>
                <input type="password" id="confirmPassword" class="input" required minlength="6">
            </div>
        </form>
    `;
    
    showModal(i18n.t('login.changePassword'), content, async () => {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }
        
        try {
            await auth.changePassword(newPassword);
            showAlert('Password changed successfully');
            auth.redirectToDashboard();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });
}

function renderDashboard() {
    if (!auth.requireAuth()) return;
    
    const user = auth.getUser();
    const role = user.role;
    
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="sidebar">
            <div class="sidebar-header">
                <h2 style="color: var(--primary); font-size: 1.25rem;">${i18n.t('appName')}</h2>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${user.full_name}</p>
            </div>
            <ul class="sidebar-nav" id="sidebar-nav"></ul>
            <div style="padding: 1.5rem; border-top: 1px solid var(--border);">
                <button class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;" onclick="toggleLanguage()">
                    <i class="fas fa-language"></i>
                    ${i18n.getLanguage() === 'en' ? 'عربي' : 'English'}
                </button>
                <button class="btn btn-danger" style="width: 100%;" onclick="auth.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    ${i18n.t('nav.logout')}
                </button>
            </div>
        </div>
        <div class="main-content">
            <div class="page-header">
                <h1 class="page-title">${i18n.t('dashboard.welcome')}, ${user.full_name}</h1>
                <p class="page-subtitle">${i18n.t('user.' + role)}</p>
            </div>
            <div id="dashboard-content"></div>
        </div>
    `;
    
    renderNavigation(role);
    loadDashboardContent(role);
}

function renderNavigation(role) {
    const nav = document.getElementById('sidebar-nav');
    const routes = {
        admin: [
            { path: 'admin/dashboard', icon: 'tachometer-alt', label: i18n.t('nav.dashboard') },
            { path: 'admin/patients', icon: 'users', label: i18n.t('nav.patients') },
            { path: 'admin/appointments', icon: 'calendar', label: i18n.t('nav.appointments') },
            { path: 'admin/procedures', icon: 'list', label: i18n.t('nav.procedures') },
            { path: 'admin/users', icon: 'user-cog', label: i18n.t('nav.users') },
            { path: 'admin/payments', icon: 'money-bill', label: i18n.t('nav.payments') }
        ],
        doctor: [
            { path: 'doctor/dashboard', icon: 'tachometer-alt', label: i18n.t('nav.dashboard') },
            { path: 'doctor/patients', icon: 'users', label: i18n.t('nav.patients') },
            { path: 'doctor/calendar', icon: 'calendar', label: i18n.t('nav.calendar') }
        ],
        receptionist: [
            { path: 'receptionist/dashboard', icon: 'tachometer-alt', label: i18n.t('nav.dashboard') },
            { path: 'receptionist/patients', icon: 'users', label: i18n.t('nav.patients') },
            { path: 'receptionist/calendar', icon: 'calendar', label: i18n.t('nav.calendar') },
            { path: 'receptionist/payments', icon: 'money-bill', label: i18n.t('nav.payments') }
        ]
    };
    
    const items = routes[role] || [];
    nav.innerHTML = items.map(item => `
        <li class="sidebar-nav-item">
            <a href="javascript:void(0)" class="sidebar-nav-link" onclick="router.navigate('${item.path}')">
                <i class="fas fa-${item.icon}"></i>
                ${item.label}
            </a>
        </li>
    `).join('');
}

async function loadDashboardContent(role) {
    const content = document.getElementById('dashboard-content');
    content.innerHTML = '<div class="text-center"><span class="loading" style="width: 3rem; height: 3rem;"></span></div>';
    
    try {
        const [patients, appointments] = await Promise.all([
            api.getPatients(),
            api.getAppointments()
        ]);
        
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointments.filter(a => a.appointment_date === today);
        
        content.innerHTML = `
            <div class="grid grid-cols-3">
                <div class="stat-card">
                    <div class="stat-card-title">${i18n.t('dashboard.totalPatients')}</div>
                    <div class="stat-card-value">${patients.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-title">${i18n.t('dashboard.todayAppointments')}</div>
                    <div class="stat-card-value">${todayAppointments.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-title">${i18n.t('dashboard.pendingPayments')}</div>
                    <div class="stat-card-value">${patients.filter(p => p.balance_jod > 0).length}</div>
                </div>
            </div>
            <div class="card mt-4 p-3">
                <h3 class="mb-3">${i18n.t('appointment.today')}</h3>
                ${todayAppointments.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>${i18n.t('appointment.time')}</th>
                                <th>${i18n.t('appointment.patient')}</th>
                                <th>${i18n.t('appointment.doctor')}</th>
                                <th>${i18n.t('appointment.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todayAppointments.map(apt => `
                                <tr>
                                    <td>${apt.appointment_time}</td>
                                    <td>${apt.patient_name}</td>
                                    <td>${apt.doctor_name}</td>
                                    <td><span class="badge badge-${apt.status === 'completed' ? 'success' : 'primary'}">${i18n.t('appointment.' + apt.status)}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `<p class="text-center text-muted">${i18n.t('common.noData')}</p>`}
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

function toggleLanguage() {
    const newLang = i18n.getLanguage() === 'en' ? 'ar' : 'en';
    i18n.setLanguage(newLang);
    router.handleRoute();
}

// Initialize App
async function initApp() {
    await auth.init();
    
    // Register routes
    router.register('login', renderLogin);
    router.register('admin/dashboard', renderDashboard);
    router.register('doctor/dashboard', renderDashboard);
    router.register('receptionist/dashboard', renderDashboard);
    router.register('404', () => {
        document.getElementById('app').innerHTML = '<div class="container text-center mt-4"><h1>404 - Page Not Found</h1></div>';
    });
    
    // Handle initial route
    if (!auth.isAuthenticated()) {
        router.navigate('login');
    } else {
        auth.redirectToDashboard();
    }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
