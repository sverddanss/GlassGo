/**
 * GlassGo — Модуль страницы настроек.
 * Отображает настройки аккаунта, статус подтверждения email
 * и предоставляет выход из системы.
 */

class AccountSettingsPage {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.activeSection = 'account';
        this.init();
    }

    /** Проверяет авторизацию, загружает данные пользователя и привязывает события. */
    async init() {
        if (!this.checkAuth()) { window.location.href = 'login.html'; return; }
        await this.loadCurrentUser();
        this.bindEvents();
        this.updateUI();
    }

    /** Проверяет наличие access-токена в localStorage. */
    checkAuth() {
        return !!localStorage.getItem('accessToken');
    }

    /** Загружает данные текущего пользователя с сервера (GET /users/me). */
    async loadCurrentUser() {
        try {
            const response = await this.apiRequest('/users/me');
            if (response.ok) { this.currentUser = await response.json(); this.updateUserUI(); }
            else if (response.status === 401) { this.logout(); }
        } catch (error) { console.error('Error loading user:', error); }
    }

    /** Обновляет элементы UI (аватар, имя, email, никнейм, статус верификации). */
    updateUserUI() {
        const avatarEl = document.getElementById('settingsAvatar');
        if (avatarEl) {
            if (this.currentUser.avatar) { avatarEl.innerHTML = `<img src="${this.currentUser.avatar}" alt="Avatar">`; }
            else { avatarEl.textContent = this.getInitials(this.currentUser.fullName); avatarEl.style.background = this.getAvatarGradient(this.currentUser.id); }
        }

        const nameEl = document.getElementById('settingsFullName');
        if (nameEl) nameEl.textContent = this.currentUser.fullName;

        const emailEl = document.getElementById('settingsEmail');
        if (emailEl) emailEl.textContent = this.currentUser.email;

        const nicknameEl = document.getElementById('settingsNickname');
        if (nicknameEl) nicknameEl.textContent = this.currentUser.nickname || this.currentUser.firstName;

        const accountEmailEl = document.getElementById('accountEmail');
        if (accountEmailEl) accountEmailEl.textContent = this.currentUser.email;

        const verificationStatusEl = document.getElementById('emailVerificationStatus');
        if (verificationStatusEl) {
            verificationStatusEl.textContent = this.currentUser.emailVerified ? 'Подтвержден ✓' : 'Не подтвержден';
            verificationStatusEl.style.color = this.currentUser.emailVerified ? 'var(--accent-green)' : 'var(--accent-pink)';
        }
    }

    /** Привязывает обработчики к кнопкам навигации, карточке профиля, пунктам меню и logout. */
    bindEvents() {
        const backBtn = document.querySelector('.settings-header .btn-icon');
        if (backBtn) backBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

        const profileCard = document.getElementById('settingsProfileCard');
        if (profileCard) profileCard.addEventListener('click', () => { window.location.href = 'profile.html'; });

        const menuItems = document.querySelectorAll('[data-section]');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                this.switchSection(section);
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        const resendBtn = document.getElementById('resendVerificationBtn');
        if (resendBtn) resendBtn.addEventListener('click', () => this.resendVerification());

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
    }

    /** Обновляет визуальное состояние страницы (статус верификации и т.д.). */
    updateUI() {
        this.updateVerificationStatus();
    }

    /** Обновляет текст и цвет статуса подтверждения email. */
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

    /** Переключает видимую секцию настроек (скрывает все, показывает выбранную). */
    switchSection(section) {
        this.activeSection = section;
        ['account'].forEach(s => {
            const el = document.getElementById(`${s}Section`);
            if (el) el.classList.add('hidden');
        });
        const selectedSection = document.getElementById(`${section}Section`);
        if (selectedSection) selectedSection.classList.remove('hidden');
    }

    /** Повторно отправляет письмо подтверждения email (POST /auth/resend-verification). */
    async resendVerification() {
        if (!this.currentUser) return;
        try {
            const response = await this.apiRequest('/auth/resend-verification', {
                method: 'POST', body: JSON.stringify({ email: this.currentUser.email })
            });
            if (response.ok) { this.showToast('Письмо с подтверждением отправлено!', 'success'); }
            else { const data = await response.json(); this.showToast(data.message || 'Ошибка отправки письма', 'error'); }
        } catch (error) {
            console.error('Error resending verification:', error);
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

    /** Отправляет запрос на logout, очищает токены и перенаправляет на страницу входа. */
    async logout() {
        try { await this.apiRequest('/auth/logout', { method: 'POST' }); } catch (error) { console.error('Logout error:', error); }
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

/** Инициализация страницы настроек после загрузки DOM. */
document.addEventListener('DOMContentLoaded', () => { window.settingsPage = new AccountSettingsPage(); });