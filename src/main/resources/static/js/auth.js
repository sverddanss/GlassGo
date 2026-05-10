/**
 * GlassGo — Модуль аутентификации.
 * Управляет формами входа, регистрации, сброса пароля и подтверждения email.
 */

class AuthApp {
    constructor() {
        this.currentSection = 'loginSection';
        this.apiBase = '/api';
        this.init();
    }

    /** Инициализирует приложение: привязывает события и проверяет URL-параметры. */
    init() {
        this.bindEvents();
        this.checkEmailConfirmation();
        this.checkPasswordResetToken();
        this.enableScrollOnAuthPage();
    }

    /** Убирает overflow:hidden с body, чтобы длинная форма регистрации не обрезалась. */
    enableScrollOnAuthPage() {
        if (document.querySelector('.auth-page')) {
            document.body.style.overflow = 'auto';
            document.body.style.height = 'auto';
            document.body.style.minHeight = '100vh';
            document.documentElement.style.overflow = 'auto';
            document.documentElement.style.height = 'auto';
        }
    }

    /** Привязывает обработчики ко всем формам и навигационным ссылкам. */
    bindEvents() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        const registerForm = document.getElementById('registrationForm');
        if (registerForm) registerForm.addEventListener('submit', (e) => this.handleRegister(e));

        const forgotForm = document.getElementById('forgotPasswordForm');
        if (forgotForm) forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));

        const resetForm = document.getElementById('resetPasswordForm');
        if (resetForm) resetForm.addEventListener('submit', (e) => this.handleResetPassword(e));

        document.querySelectorAll('[data-action="show-register"]').forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); this.showSection('registerSection'); });
        });
        document.querySelectorAll('[data-action="show-login"]').forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); this.showSection('loginSection'); });
        });
        document.querySelectorAll('[data-action="show-forgot-password"]').forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); this.showSection('forgotPasswordSection'); });
        });

        const resendBtn = document.getElementById('resendVerificationLink');
        if (resendBtn) resendBtn.addEventListener('click', (e) => this.resendVerification(e));
    }

    /** Переключает видимую секцию на странице (вход / регистрация / сброс пароля и т.д.). */
    showSection(sectionId) {
        const sections = ['loginSection', 'registerSection', 'checkEmailSection',
            'emailConfirmedSection', 'forgotPasswordSection', 'resetPasswordSection'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.add('hidden');
        });
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) selectedSection.classList.remove('hidden');
        this.currentSection = sectionId;
    }

    /** Отправляет POST /api/auth/login; при успехе сохраняет токены и редиректит на главную. */
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        this.clearErrors('loginEmailError', 'loginPasswordError');

        if (!email || !password) { this.showError('loginEmailError', 'Заполните все поля'); return; }
        if (!this.validateEmail(email)) { this.showError('loginEmailError', 'Введите корректный email'); return; }

        this.showLoading(true);
        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                this.showToast('Успешный вход!', 'success');
                setTimeout(() => { window.location.href = '/index.html'; }, 500);
            } else {
                this.showError('loginPasswordError', data.message || 'Неверный email или пароль');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginPasswordError', 'Ошибка соединения. Попробуйте позже.');
        } finally { this.showLoading(false); }
    }

    /** Отправляет POST /api/auth/register; при успехе показывает секцию «проверьте почту». */
    async handleRegister(e) {
        e.preventDefault();
        const firstName = document.getElementById('registerFirstName').value.trim();
        const lastName = document.getElementById('registerLastName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const nickname = document.getElementById('registerNickname').value.trim();
        const password = document.getElementById('registerPassword').value;

        this.clearErrors('registerFirstNameError', 'registerLastNameError',
            'registerEmailError', 'registerNicknameError', 'registerPasswordError');

        if (!firstName) { this.showError('registerFirstNameError', 'Имя обязательно'); return; }
        if (!email || !this.validateEmail(email)) { this.showError('registerEmailError', 'Введите корректный email'); return; }
        if (!password) { this.showError('registerPasswordError', 'Пароль обязателен'); return; }
        if (!this.validatePassword(password)) { this.showError('registerPasswordError', 'Пароль должен содержать латинские буквы и цифры'); return; }
        if (nickname && (nickname.length < 1 || nickname.length > 20)) { this.showError('registerNicknameError', 'Никнейм должен быть от 1 до 20 символов'); return; }

        this.showLoading(true);
        try {
            const response = await fetch(`${this.apiBase}/auth/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, nickname, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('pendingVerificationEmail', email);
                this.showSection('checkEmailSection');
                this.showToast('Письмо с подтверждением отправлено!', 'success');
            } else {
                const errorField = this.getErrorField(data.field);
                if (errorField) { this.showError(`${errorField}Error`, data.message); }
                else { this.showToast(data.message || 'Ошибка регистрации', 'error'); }
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Ошибка соединения. Попробуйте позже.', 'error');
        } finally { this.showLoading(false); }
    }

    /** Отправляет запрос на сброс пароля (POST /api/auth/forgot-password). */
    async handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value.trim();
        if (!email || !this.validateEmail(email)) { this.showError('forgotEmailError', 'Введите корректный email'); return; }

        this.showLoading(true);
        try {
            const response = await fetch(`${this.apiBase}/auth/forgot-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                this.showToast('Ссылка для сброса пароля отправлена на почту!', 'success');
                setTimeout(() => { this.showSection('loginSection'); }, 2000);
            } else {
                this.showError('forgotEmailError', data.message || 'Пользователь не найден');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showToast('Ошибка соединения. Попробуйте позже.', 'error');
        } finally { this.showLoading(false); }
    }

    /** Устанавливает новый пароль по ссылке сброса (POST /api/auth/reset-password). */
    async handleResetPassword(e) {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const hash = document.getElementById('resetHash').value;
        if (!newPassword) { this.showError('newPasswordError', 'Введите пароль'); return; }
        if (!this.validatePassword(newPassword)) { this.showError('newPasswordError', 'Пароль должен содержать латинские буквы и цифры'); return; }

        this.showLoading(true);
        try {
            const response = await fetch(`${this.apiBase}/auth/reset-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hash, password: newPassword })
            });
            const data = await response.json();
            if (response.ok) {
                this.showToast('Пароль успешно изменен!', 'success');
                setTimeout(() => { this.showSection('loginSection'); }, 1500);
            } else {
                this.showError('newPasswordError', data.message || 'Ошибка сброса пароля');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            this.showToast('Ошибка соединения. Попробуйте позже.', 'error');
        } finally { this.showLoading(false); }
    }

    /** Повторно отправляет письмо подтверждения email (адрес берётся из localStorage). */
    async resendVerification(e) {
        const email = localStorage.getItem('pendingVerificationEmail');
        if (!email) { this.showToast('Email не найден. Попробуйте зарегистрироваться снова.', 'error'); return; }

        this.showLoading(true);
        try {
            const response = await fetch(`${this.apiBase}/auth/resend-verification`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (response.ok) { this.showToast('Новое письмо отправлено!', 'success'); }
            else { const data = await response.json(); this.showToast(data.message || 'Ошибка отправки письма', 'error'); }
        } catch (error) {
            console.error('Resend error:', error);
            this.showToast('Ошибка соединения', 'error');
        } finally { this.showLoading(false); }
    }

    /** Проверяет URL-параметр ?confirmed=true и показывает секцию «email подтверждён». */
    checkEmailConfirmation() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('confirmed') === 'true') {
            this.showSection('emailConfirmedSection');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    /** Проверяет URL-параметр ?hash=... и показывает форму нового пароля. */
    checkPasswordResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const resetHash = urlParams.get('hash');
        if (resetHash) {
            const hashInput = document.getElementById('resetHash');
            if (hashInput) hashInput.value = resetHash;
            this.showSection('resetPasswordSection');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    /** Валидирует формат email через регулярное выражение. */
    validateEmail(email) {
        return /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(email);
    }

    /** Проверяет, что пароль содержит хотя бы одну латинскую букву и одну цифру. */
    validatePassword(password) {
        return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/.test(password);
    }

    /** Маппит имя поля из серверного ответа в id HTML-элемента ошибки. */
    getErrorField(field) {
        const fieldMap = { 'email': 'registerEmail', 'firstName': 'registerFirstName', 'lastName': 'registerLastName', 'nickname': 'registerNickname', 'password': 'registerPassword' };
        return fieldMap[field];
    }

    /** Показывает текст ошибки под полем; автоматически скрывается через 5 секунд. */
    showError(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) { el.textContent = message; el.style.display = 'block'; setTimeout(() => { if (el) el.style.display = 'none'; }, 5000); }
    }

    /** Очищает указанные элементы ошибок (скрывает и обнуляет текст). */
    clearErrors(...errorIds) {
        errorIds.forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = ''; el.style.display = 'none'; } });
    }

    /** Переключает состояние загрузки: блокирует кнопки submit и показывает «...». */
    showLoading(isLoading) {
        document.querySelectorAll('button[type="submit"]').forEach(btn => {
            if (isLoading) { btn.disabled = true; btn.classList.add('loading'); btn.setAttribute('data-original-text', btn.textContent); btn.textContent = '...'; }
            else { btn.disabled = false; btn.classList.remove('loading'); const t = btn.getAttribute('data-original-text'); if (t) btn.textContent = t; }
        });
    }

    /** Показывает всплывающее уведомление (toast). Исчезает через 3 секунды. */
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

/** Инициализация модуля авторизации после загрузки DOM. */
document.addEventListener('DOMContentLoaded', () => { window.authApp = new AuthApp(); });