const API_BASE = window.location.origin + '/api';

class API {
    async request(endpoint, options = {}) {
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include'
        };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Request failed' }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async changePassword(newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ new_password: newPassword })
        });
    }

    // Patients
    async getPatients() {
        return this.request('/patients');
    }

    async getPatient(id) {
        return this.request(`/patients/${id}`);
    }

    async createPatient(data) {
        return this.request('/patients', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePatient(id, data) {
        return this.request(`/patients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deletePatient(id) {
        return this.request(`/patients/${id}`, { method: 'DELETE' });
    }

    // Appointments
    async getAppointments(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/appointments${query ? '?' + query : ''}`);
    }

    async createAppointment(data) {
        return this.request('/appointments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateAppointment(id, data) {
        return this.request(`/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteAppointment(id) {
        return this.request(`/appointments/${id}`, { method: 'DELETE' });
    }

    // Procedures
    async getProcedures() {
        return this.request('/procedures');
    }

    async createProcedure(data) {
        return this.request('/procedures', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateProcedure(id, data) {
        return this.request(`/procedures/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteProcedure(id) {
        return this.request(`/procedures/${id}`, { method: 'DELETE' });
    }

    // Users
    async getUsers() {
        return this.request('/users');
    }

    async createUser(data) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateUser(id, data) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, { method: 'DELETE' });
    }

    async getDoctors() {
        return this.request('/doctors');
    }

    // Payments
    async getPayments(patientId = null) {
        const query = patientId ? `?patient_id=${patientId}` : '';
        return this.request(`/payments${query}`);
    }

    async createPayment(data) {
        return this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Visits
    async getVisits(patientId = null) {
        const query = patientId ? `?patient_id=${patientId}` : '';
        return this.request(`/visits${query}`);
    }

    async createVisit(data) {
        return this.request('/visits', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateVisit(id, data) {
        return this.request(`/visits/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Images
    async uploadImage(patientId, imageType, description, file) {
        const formData = new FormData();
        formData.append('patient_id', patientId);
        formData.append('image_type', imageType);
        formData.append('description', description || '');
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/images/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail);
        }

        return response.json();
    }

    async getPatientImages(patientId) {
        return this.request(`/images/patient/${patientId}`);
    }

    async deleteImage(id) {
        return this.request(`/images/${id}`, { method: 'DELETE' });
    }

    getImageUrl(imageId) {
        return `${API_BASE}/images/${imageId}`;
    }
}

const api = new API();
