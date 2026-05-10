/**
 * GlassGo — Модуль страницы профиля.
 * Отвечает за отображение и редактирование данных пользователя,
 * а также загрузку аватара на сервер.
 */

class ProfilePage {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
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
            if (response.ok) { this.currentUser = await response.json(); this.updateUI(); }
            else if (response.status === 401) { this.logout(); }
        } catch (error) { console.error('Error loading user:', error); }
    }

    /** Обновляет все элементы UI данными текущего пользователя. */
    updateUI() {
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) {
            if (this.currentUser.avatar) { avatarEl.innerHTML = `<img src="${this.currentUser.avatar}" alt="Avatar">`; }
            else { avatarEl.textContent = this.getInitials(this.currentUser.fullName); avatarEl.style.background = this.getAvatarGradient(this.currentUser.id); }
        }

        const sidebarAvatarEl = document.getElementById('profileSummaryAvatar');
        if (sidebarAvatarEl) {
            if (this.currentUser.avatar) { sidebarAvatarEl.innerHTML = `<img src="${this.currentUser.avatar}" alt="Avatar">`; }
            else { sidebarAvatarEl.textContent = this.getInitials(this.currentUser.fullName); sidebarAvatarEl.style.background = this.getAvatarGradient(this.currentUser.id); }
        }

        const displayNameEl = document.getElementById('profileDisplayName');
        if (displayNameEl) displayNameEl.textContent = this.currentUser.fullName;

        const displayStatusEl = document.getElementById('profileDisplayStatus');
        if (displayStatusEl) displayStatusEl.textContent = this.currentUser.status === 'online' ? 'В сети' : 'Не в сети';

        const sidebarNameEl = document.getElementById('profileSummaryName');
        if (sidebarNameEl) sidebarNameEl.textContent = this.currentUser.fullName;

        const sidebarEmailEl = document.getElementById('profileSummaryEmail');
        if (sidebarEmailEl) sidebarEmailEl.textContent = this.currentUser.email;

        const sidebarNicknameEl = document.getElementById('profileSummaryNickname');
        if (sidebarNicknameEl) sidebarNicknameEl.textContent = this.currentUser.nickname || this.currentUser.firstName;

        const firstNameInput = document.getElementById('editFirstName');
        if (firstNameInput) firstNameInput.value = this.currentUser.firstName || '';

        const lastNameInput = document.getElementById('editLastName');
        if (lastNameInput) lastNameInput.value = this.currentUser.lastName || '';

        const nicknameInput = document.getElementById('editNickname');
        if (nicknameInput) nicknameInput.value = this.currentUser.nickname || '';

        const emailInput = document.getElementById('editEmail');
        if (emailInput) emailInput.value = this.currentUser.email || '';
    }

    /** Привязывает обработчики к кнопкам навигации, загрузки аватара и форме профиля. */
    bindEvents() {
        const backBtn = document.querySelector('.settings-header .btn-icon');
        if (backBtn) backBtn.addEventListener('click', () => { window.location.href = 'settings.html'; });

        const avatarUploadBtn = document.getElementById('avatarUploadBtn');
        if (avatarUploadBtn) avatarUploadBtn.addEventListener('click', () => this.uploadAvatar());

        const profileForm = document.getElementById('profileForm');
        if (profileForm) profileForm.addEventListener('submit', (e) => this.updateProfile(e));

        const menuItem = document.querySelector('[data-section="edit"]');
        if (menuItem) menuItem.addEventListener('click', () => {});
    }

    /**
     * Открывает диалог выбора файла и загружает аватар на сервер.
     * Валидирует размер (макс. 5МБ) и тип файла (только изображения).
     */
    uploadAvatar() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/jpeg,image/png,image/gif,image/webp';

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) { this.showToast('Файл слишком большой. Максимум 5MB', 'error'); return; }
            if (!file.type.startsWith('image/')) { this.showToast('Пожалуйста, выберите изображение', 'error'); return; }

            this.showToast('Загрузка...', 'info');

            try {
                const formData = new FormData();
                formData.append('avatar', file);
                const token = localStorage.getItem('accessToken');
                const response = await fetch(`${this.apiBase}/users/me/avatar`, {
                    method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    this.currentUser.avatar = data.avatarUrl;
                    this.updateUI();
                    this.showToast('Фото профиля обновлено!', 'success');
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    storedUser.avatar = data.avatarUrl;
                    localStorage.setItem('user', JSON.stringify(storedUser));
                } else {
                    const error = await response.json();
                    this.showToast(error.message || 'Ошибка загрузки', 'error');
                }
            } catch (error) {
                console.error('Avatar upload error:', error);
                this.showToast('Ошибка соединения', 'error');
            }
        };
        fileInput.click();
    }

    /** Отправляет обновлённые данные профиля на сервер (PUT /users/me). */
    async updateProfile(e) {
        e.preventDefault();
        const firstName = document.getElementById('editFirstName').value.trim();
        const lastName = document.getElementById('editLastName').value.trim();
        const nickname = document.getElementById('editNickname').value.trim();

        this.clearErrors();
        if (!firstName) { this.showError('editFirstNameError', 'Имя обязательно'); return; }
        if (nickname && (nickname.length < 1 || nickname.length > 20)) { this.showError('editNicknameError', 'Никнейм должен быть от 1 до 20 символов'); return; }

        const submitBtn = document.querySelector('#profileForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;

        try {
            const response = await this.apiRequest('/users/me', { method: 'PUT', body: JSON.stringify({ firstName, lastName, nickname }) });
            if (response.ok) {
                const updatedUser = await response.json();
                this.currentUser = updatedUser;
                this.updateUI();
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                Object.assign(storedUser, updatedUser);
                localStorage.setItem('user', JSON.stringify(storedUser));
                this.showToast('Профиль обновлен!', 'success');
            } else {
                const error = await response.json();
                const errorField = this.getErrorField(error.field);
                if (errorField) { this.showError(`${errorField}Error`, error.message); }
                else { this.showToast(error.message || 'Ошибка обновления', 'error'); }
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showToast('Ошибка соединения', 'error');
        } finally { submitBtn.textContent = originalText; submitBtn.disabled = false; }
    }

    /** Маппит имя поля из серверного ответа в id HTML-элемента ошибки. */
    getErrorField(field) {
        return { 'firstName': 'editFirstName', 'lastName': 'editLastName', 'nickname': 'editNickname' }[field];
    }

    /** Показывает текст ошибки под полем; скрывается через 5 секунд. */
    showError(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) { el.textContent = message; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 5000); }
    }

    /** Очищает все элементы ошибок формы профиля. */
    clearErrors() {
        ['editFirstNameError', 'editLastNameError', 'editNicknameError'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = ''; el.style.display = 'none'; }
        });
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

/** Инициализация страницы профиля после загрузки DOM. */
document.addEventListener('DOMContentLoaded', () => { window.profilePage = new ProfilePage(); });