/**
 * GlassGo - Settings Page Module
 * Handles account settings and UI
 */

class AccountSettingsPage {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.activeSection = 'account';
        this.init();
    }

    async init() {
        // Check authentication
        if (!this.checkAuth()) {
            window.location.href = 'login.html';
            return;
        }

        await this.loadCurrentUser();
        this.bindEvents();
        this.updateUI();
    }

    checkAuth() {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;
        return true;
    }

    async loadCurrentUser() {
        try {
            const response = await this.apiRequest('/users/me');
            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUserUI();
            } else if (response.status === 401) {
                this.logout();
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }

    updateUserUI() {
        // Update avatar
        const avatarEl = document.getElementById('settingsAvatar');
        if (avatarEl) {
            if (this.currentUser.avatar) {
                avatarEl.innerHTML = `<img src="${this.currentUser.avatar}" alt="Avatar">`;
            } else {
                avatarEl.textContent = this.getInitials(this.currentUser.fullName);
                avatarEl.style.background = this.getAvatarGradient(this.currentUser.id);
            }
        }

        // Update name
        const nameEl = document.getElementById('settingsFullName');
        if (nameEl) nameEl.textContent = this.currentUser.fullName;

        // Update email
        const emailEl = document.getElementById('settingsEmail');
        if (emailEl) emailEl.textContent = this.currentUser.email;

        // Update nickname
        const nicknameEl = document.getElementById('settingsNickname');
        if (nicknameEl) nicknameEl.textContent = this.currentUser.nickname || this.currentUser.firstName;

        // Update account email
        const accountEmailEl = document.getElementById('accountEmail');
        if (accountEmailEl) accountEmailEl.textContent = this.currentUser.email;

        // Update verification status
        const verificationStatusEl = document.getElementById('emailVerificationStatus');
        if (verificationStatusEl) {
            verificationStatusEl.textContent = this.currentUser.emailVerified ? 'Подтвержден ✓' : 'Не подтвержден';
            verificationStatusEl.style.color = this.currentUser.emailVerified ? 'var(--accent-green)' : 'var(--accent-pink)';
        }
    }

    bindEvents() {
        // Back button
        const backBtn = document.querySelector('.settings-header .btn-icon');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Profile card click
        const profileCard = document.getElementById('settingsProfileCard');
        if (profileCard) {
            profileCard.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }

        // Menu items
        const menuItems = document.querySelectorAll('[data-section]');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                this.switchSection(section);

                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Resend verification button
        const resendBtn = document.getElementById('resendVerificationBtn');
        if (resendBtn) {
            resendBtn.addEventListener('click', () => this.resendVerification());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    updateUI() {
        // Apply any theme or UI updates
        this.updateVerificationStatus();
    }

    updateVerificationStatus() {
        const verificationStatus = document.getElementById('emailVerificationStatus');
        if (verificationStatus && this.currentUser) {
            if (this.currentUser.emailVerified) {
                verificationStatus.textContent = 'Подтвержден';
                verificationStatus.style.color = 'var(--accent-green)';
            } else {
                verificationStatus.textContent = 'Не подтвержден';
                verificationStatus.style.color = 'var(--accent-pink)';
            }
        }
    }

    switchSection(section) {
        this.activeSection = section;

        // Hide all sections
        const sections = ['account'];
        sections.forEach(s => {
            const el = document.getElementById(`${s}Section`);
            if (el) el.classList.add('hidden');
        });

        // Show selected section
        const selectedSection = document.getElementById(`${section}Section`);
        if (selectedSection) selectedSection.classList.remove('hidden');
    }

    async resendVerification() {
        if (!this.currentUser) return;

        try {
            const response = await this.apiRequest('/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email: this.currentUser.email })
            });

            if (response.ok) {
                this.showToast('Письмо с подтверждением отправлено!', 'success');
            } else {
                const data = await response.json();
                this.showToast(data.message || 'Ошибка отправки письма', 'error');
            }
        } catch (error) {
            console.error('Error resending verification:', error);
            this.showToast('Ошибка соединения', 'error');
        }
    }

    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('accessToken');
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...defaultOptions,
            ...options
        });

        if (response.status === 401) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                const newToken = localStorage.getItem('accessToken');
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`
                };
                return fetch(`${this.apiBase}${endpoint}`, {
                    ...defaultOptions,
                    ...options
                });
            } else {
                this.logout();
            }
        }

        return response;
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${this.apiBase}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
        }

        return false;
    }

    async logout() {
        try {
            await this.apiRequest('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        window.location.href = 'login.html';
    }

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    getAvatarGradient(id) {
        const gradients = [
            'linear-gradient(135deg, #7dd3fc 0%, #a78bfa 100%)',
            'linear-gradient(135deg, #6ee7b7 0%, #3b82f6 100%)',
            'linear-gradient(135deg, #f9a8d4 0%, #f97316 100%)',
            'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
            'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)'
        ];
        return gradients[id % gradients.length];
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            const newContainer = document.createElement('div');
            newContainer.id = 'toastContainer';
            newContainer.className = 'toast-container';
            document.body.appendChild(newContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        const toastContainer = document.getElementById('toastContainer');
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.settingsPage = new AccountSettingsPage();
});