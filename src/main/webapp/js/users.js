/**
 * GlassGo - Users Page Module
 * Handles user listing, search, and profile viewing
 */
// В самом верху каждого JS файла
const API_BASE = '/GlassGo_war/api';
console.log('API_BASE:', API_BASE);
const contextPath = window.location.pathname.split('/')[1];
this.apiBase = '/' + contextPath + '/api';
class UsersPage {
    constructor() {
        this.apiBase = '/GlassGo_war/api';
        this.currentUser = null;
        this.users = [];
        this.filter = 'all';
        this.searchQuery = '';
        this.selectedUser = null;
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
        await this.loadUsers();
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
            } else if (response.status === 401) {
                this.logout();
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await this.apiRequest('/users');
            if (response.ok) {
                this.users = await response.json();
                // Filter out current user
                this.users = this.users.filter(u => u.id !== this.currentUser?.id);
                this.renderUsers();
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    bindEvents() {
        // Search input
        const searchInput = document.getElementById('usersSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderUsers();
            });
        }

        // Tabs
        const tabs = document.querySelectorAll('[data-filter]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.filter = tab.getAttribute('data-filter');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderUsers();
            });
        });

        // Back button
        const backBtn = document.querySelector('.sidebar-header .btn-icon');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Close profile button
        const closeProfileBtn = document.getElementById('userProfileBack');
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', () => this.closeUserProfile());
        }

        // Start dialog button
        const startDialogBtn = document.getElementById('startDialogBtn');
        if (startDialogBtn) {
            startDialogBtn.addEventListener('click', () => this.startDialog());
        }

        // FAB button
        const fab = document.getElementById('createDialogFab');
        if (fab) {
            fab.addEventListener('click', () => {
                // Scroll to top and focus search
                const searchInput = document.getElementById('usersSearchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            });
        }
    }

    renderUsers() {
        const container = document.getElementById('usersList');
        if (!container) return;

        let filteredUsers = [...this.users];

        // Apply filter
        if (this.filter === 'online') {
            filteredUsers = filteredUsers.filter(u => u.status === 'online');
        }

        // Apply search
        if (this.searchQuery) {
            filteredUsers = filteredUsers.filter(u =>
                u.fullName.toLowerCase().includes(this.searchQuery) ||
                (u.nickname && u.nickname.toLowerCase().includes(this.searchQuery)) ||
                u.email.toLowerCase().includes(this.searchQuery)
            );
        }

        // Sort by name
        filteredUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));

        if (filteredUsers.length === 0) {
            container.innerHTML = `
                <div class="main-empty" style="padding: 40px 20px;">
                    <p>${this.searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}</p>
                </div>
            `;
            return;
        }

        // Group by first letter
        const grouped = {};
        filteredUsers.forEach(user => {
            const letter = user.fullName[0].toUpperCase();
            if (!grouped[letter]) grouped[letter] = [];
            grouped[letter].push(user);
        });

        let html = '';
        for (const [letter, users] of Object.entries(grouped)) {
            html += `<div class="contacts-letter">${letter}</div>`;
            html += users.map(user => this.renderUserItem(user)).join('');
        }

        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = parseInt(item.dataset.id);
                this.openUserProfile(userId);
            });
        });
    }

    renderUserItem(user) {
        const statusText = user.status === 'online' ? 'В сети' :
            (user.lastSeen ? `Был(а) ${this.formatRelativeTime(user.lastSeen)}` : 'Не в сети');
        const statusClass = user.status === 'online' ? 'online' : '';

        return `
            <div class="contact-item" data-id="${user.id}">
                <div class="avatar">
                    ${user.avatar ? `<img src="${user.avatar}" alt="${user.fullName}">` : this.getInitials(user.fullName)}
                    ${user.status === 'online' ? '<span class="online-dot"></span>' : ''}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${this.escapeHtml(user.fullName)}</div>
                    <div class="contact-status ${statusClass}">${statusText}</div>
                </div>
            </div>
        `;
    }

    async openUserProfile(userId) {
        try {
            const response = await this.apiRequest(`/users/${userId}`);
            if (response.ok) {
                this.selectedUser = await response.json();
                this.showUserProfile();
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    showUserProfile() {
        const emptyState = document.getElementById('usersEmptyState');
        const profileContainer = document.getElementById('userProfile');

        if (emptyState) emptyState.classList.add('hidden');
        if (profileContainer) {
            profileContainer.style.display = 'flex';

            // Update profile data
            const nameEl = document.getElementById('userProfileName');
            const statusEl = document.getElementById('userProfileStatus');
            const fullNameEl = document.getElementById('userProfileFullName');
            const onlineEl = document.getElementById('userProfileOnline');
            const emailEl = document.getElementById('userProfileEmail');
            const nicknameEl = document.getElementById('userProfileNickname');
            const avatarEl = document.getElementById('userProfileAvatar');

            if (nameEl) nameEl.textContent = this.selectedUser.fullName;
            if (fullNameEl) fullNameEl.textContent = this.selectedUser.fullName;

            const statusText = this.selectedUser.status === 'online' ? 'В сети' :
                (this.selectedUser.lastSeen ? `Был(а) ${this.formatRelativeTime(this.selectedUser.lastSeen)}` : 'Не в сети');
            if (statusEl) statusEl.textContent = statusText;
            if (onlineEl) onlineEl.textContent = statusText;

            if (emailEl) emailEl.textContent = this.selectedUser.email;
            if (nicknameEl) nicknameEl.textContent = this.selectedUser.nickname || '—';

            if (avatarEl) {
                if (this.selectedUser.avatar) {
                    avatarEl.innerHTML = `<img src="${this.selectedUser.avatar}" alt="${this.selectedUser.fullName}">`;
                } else {
                    avatarEl.textContent = this.getInitials(this.selectedUser.fullName);
                    avatarEl.style.background = this.getAvatarGradient(this.selectedUser.id);
                }
            }
        }

        // On mobile, hide sidebar
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.add('hidden-mobile');
        }
    }

    closeUserProfile() {
        const emptyState = document.getElementById('usersEmptyState');
        const profileContainer = document.getElementById('userProfile');

        if (emptyState) emptyState.classList.remove('hidden');
        if (profileContainer) profileContainer.style.display = 'none';

        this.selectedUser = null;

        // On mobile, show sidebar
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('hidden-mobile');
        }
    }

    async startDialog() {
        if (!this.selectedUser) return;

        try {
            const response = await this.apiRequest('/dialogs', {
                method: 'POST',
                body: JSON.stringify({ participantId: this.selectedUser.id })
            });

            if (response.ok) {
                this.showToast('Диалог создан', 'success');
                window.location.href = 'index.html';
            } else {
                const data = await response.json();
                this.showToast(data.message || 'Ошибка создания диалога', 'error');
            }
        } catch (error) {
            console.error('Error creating dialog:', error);
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

    logout() {
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

    formatRelativeTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин назад`;
        if (hours < 24) return `${hours} ч назад`;
        if (days < 7) return `${days} дн назад`;

        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            // Create toast container if not exists
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
    window.usersPage = new UsersPage();
});