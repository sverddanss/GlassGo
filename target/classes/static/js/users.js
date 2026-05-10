/**
 * GlassGo — Модуль страницы пользователей.
 * Отображает список пользователей с поиском и фильтрацией,
 * позволяет просматривать профили и начинать диалоги.
 */

class UsersPage {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.users = [];
        this.filter = 'all';
        this.searchQuery = '';
        this.selectedUser = null;
        this.init();
    }

    /** Проверяет авторизацию, загружает текущего пользователя и список всех пользователей. */
    async init() {
        if (!this.checkAuth()) { window.location.href = 'login.html'; return; }
        await this.loadCurrentUser();
        this.bindEvents();
        await this.loadUsers();
    }

    /** Проверяет наличие access-токена в localStorage. */
    checkAuth() {
        return !!localStorage.getItem('accessToken');
    }

    /** Загружает данные текущего пользователя с сервера (GET /users/me). */
    async loadCurrentUser() {
        try {
            const response = await this.apiRequest('/users/me');
            if (response.ok) { this.currentUser = await response.json(); }
            else if (response.status === 401) { this.logout(); }
        } catch (error) { console.error('Error loading user:', error); }
    }

    /** Загружает список всех пользователей (GET /users), исключая текущего. */
    async loadUsers() {
        try {
            const response = await this.apiRequest('/users');
            if (response.ok) {
                this.users = await response.json();
                this.users = this.users.filter(u => u.id !== this.currentUser?.id);
                this.renderUsers();
            }
        } catch (error) { console.error('Error loading users:', error); }
    }

    /** Привязывает обработчики к поиску, табам фильтрации, кнопкам навигации и действий. */
    bindEvents() {
        const searchInput = document.getElementById('usersSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => { this.searchQuery = e.target.value.toLowerCase(); this.renderUsers(); });
        }

        document.querySelectorAll('[data-filter]').forEach(tab => {
            tab.addEventListener('click', () => {
                this.filter = tab.getAttribute('data-filter');
                document.querySelectorAll('[data-filter]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderUsers();
            });
        });

        const backBtn = document.querySelector('.sidebar-header .btn-icon');
        if (backBtn) backBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

        const closeProfileBtn = document.getElementById('userProfileBack');
        if (closeProfileBtn) closeProfileBtn.addEventListener('click', () => this.closeUserProfile());

        const startDialogBtn = document.getElementById('startDialogBtn');
        if (startDialogBtn) startDialogBtn.addEventListener('click', () => this.startDialog());

        const fab = document.getElementById('createDialogFab');
        if (fab) fab.addEventListener('click', () => {
            const si = document.getElementById('usersSearchInput');
            if (si) si.focus();
        });
    }

    /**
     * Отрисовывает список пользователей с учётом фильтра и поиска.
     * Группирует пользователей по первой букве имени.
     */
    renderUsers() {
        const container = document.getElementById('usersList');
        if (!container) return;

        let filteredUsers = [...this.users];
        if (this.filter === 'online') { filteredUsers = filteredUsers.filter(u => u.status === 'online'); }
        if (this.searchQuery) {
            filteredUsers = filteredUsers.filter(u =>
                u.fullName.toLowerCase().includes(this.searchQuery) ||
                (u.nickname && u.nickname.toLowerCase().includes(this.searchQuery)) ||
                u.email.toLowerCase().includes(this.searchQuery)
            );
        }
        filteredUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));

        if (filteredUsers.length === 0) {
            container.innerHTML = `<div class="main-empty" style="padding: 40px 20px;"><p>${this.searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}</p></div>`;
            return;
        }

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

        container.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => { this.openUserProfile(parseInt(item.dataset.id)); });
        });
    }

    /** Генерирует HTML-разметку карточки пользователя в списке. */
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

    /** Загружает данные выбранного пользователя и отображает его профиль. */
    async openUserProfile(userId) {
        try {
            const response = await this.apiRequest(`/users/${userId}`);
            if (response.ok) { this.selectedUser = await response.json(); this.showUserProfile(); }
        } catch (error) { console.error('Error loading user profile:', error); }
    }

    /** Отображает панель профиля выбранного пользователя; на мобильных скрывает сайдбар. */
    showUserProfile() {
        const emptyState = document.getElementById('usersEmptyState');
        const profileContainer = document.getElementById('userProfile');
        if (emptyState) emptyState.classList.add('hidden');
        if (profileContainer) {
            profileContainer.style.display = 'flex';
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
                if (this.selectedUser.avatar) { avatarEl.innerHTML = `<img src="${this.selectedUser.avatar}" alt="${this.selectedUser.fullName}">`; }
                else { avatarEl.textContent = this.getInitials(this.selectedUser.fullName); avatarEl.style.background = this.getAvatarGradient(this.selectedUser.id); }
            }
        }
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.add('hidden-mobile');
        }
    }

    /** Скрывает панель профиля и возвращает пустое состояние. */
    closeUserProfile() {
        const emptyState = document.getElementById('usersEmptyState');
        const profileContainer = document.getElementById('userProfile');
        if (emptyState) emptyState.classList.remove('hidden');
        if (profileContainer) profileContainer.style.display = 'none';
        this.selectedUser = null;
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('hidden-mobile');
        }
    }

    /** Создаёт личный диалог с выбранным пользователем (POST /dialogs). */
    async startDialog() {
        if (!this.selectedUser) return;
        try {
            const response = await this.apiRequest('/dialogs', { method: 'POST', body: JSON.stringify({ participantId: this.selectedUser.id }) });
            if (response.ok) { this.showToast('Диалог создан', 'success'); window.location.href = 'index.html'; }
            else { const data = await response.json(); this.showToast(data.message || 'Ошибка создания диалога', 'error'); }
        } catch (error) {
            console.error('Error creating dialog:', error);
            this.showToast('Ошибка соединения', 'error');
        }
    }

    /** Выполняет fetch-запрос к API с авторизацией; при 401 пробует обновить токен. */
    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('accessToken');
        const defaultOptions = { headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) } };
        const response = await fetch(`${this.apiBase}${endpoint}`, { ...defaultOptions, ...options });
        if (response.status === 401) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                const newToken = localStorage.getItem('accessToken');
                options.headers = { ...options.headers, 'Authorization': `Bearer ${newToken}` };
                return fetch(`${this.apiBase}${endpoint}`, { ...defaultOptions, ...options });
            } else { this.logout(); }
        }
        return response;
    }

    /** Обновляет access-токен через refresh-токен (POST /auth/refresh). */
    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;
        try {
            const response = await fetch(`${this.apiBase}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
            if (response.ok) { const data = await response.json(); localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken); return true; }
        } catch (error) { console.error('Token refresh error:', error); }
        return false;
    }

    /** Очищает токены и перенаправляет на страницу входа. */
    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    /** Возвращает инициалы из полного имени (макс. 2 символа). */
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    /** Возвращает CSS-градиент для аватара на основе id пользователя. */
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

    /** Форматирует timestamp в относительное время («5 мин назад», «2 ч назад» и т.д.). */
    formatRelativeTime(timestamp) {
        const date = new Date(timestamp);
        const diff = new Date() - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин назад`;
        if (hours < 24) return `${hours} ч назад`;
        if (days < 7) return `${days} дн назад`;
        return date.toLocaleDateString();
    }

    /** Экранирует HTML-спецсимволы для безопасной вставки текста в DOM. */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /** Показывает всплывающее уведомление (toast); исчезает через 3 секунды. */
    showToast(message, type = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3000);
    }
}

/** Инициализация страницы пользователей после загрузки DOM. */
document.addEventListener('DOMContentLoaded', () => { window.usersPage = new UsersPage(); });