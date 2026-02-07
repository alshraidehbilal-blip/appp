class Auth {
    constructor() {
        this.user = null;
        this.initialized = false;
    }

    async init() {
        try {
            this.user = await api.getMe();
            this.initialized = true;
            return true;
        } catch (error) {
            this.user = null;
            this.initialized = true;
            return false;
        }
    }

    isAuthenticated() {
        return this.user !== null;
    }

    getUser() {
        return this.user;
    }

    getUserRole() {
        return this.user?.role;
    }

    async login(username, password) {
        const response = await api.login(username, password);
        this.user = response.user;
        return response.user;
    }

    async logout() {
        await api.logout();
        this.user = null;
        window.location.href = '/';
    }

    async changePassword(newPassword) {
        await api.changePassword(newPassword);
        if (this.user) {
            this.user.is_first_login = false;
        }
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            this.showLogin();
            return false;
        }
        return true;
    }

    requireRole(allowedRoles) {
        if (!this.requireAuth()) return false;
        
        const userRole = this.getUserRole();
        if (!allowedRoles.includes(userRole)) {
            alert(i18n.t('common.error') + ': Insufficient permissions');
            this.redirectToDashboard();
            return false;
        }
        return true;
    }

    showLogin() {
        router.navigate('login');
    }

    redirectToDashboard() {
        const role = this.getUserRole();
        switch (role) {
            case 'admin':
                router.navigate('admin/dashboard');
                break;
            case 'doctor':
                router.navigate('doctor/dashboard');
                break;
            case 'receptionist':
                router.navigate('receptionist/dashboard');
                break;
            default:
                router.navigate('login');
        }
    }
}

const auth = new Auth();
