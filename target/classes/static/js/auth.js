/**
 * GlassGo - Authentication Module
 * Handles login, registration, email verification, and password reset
 */

class AuthApp {
    constructor() {
        this.currentSection = 'loginSection';
        // Автоматически определяем правильный API путь
        const contextPath = window.location.pathname.split('/')[1];
        this.apiBase = '/' + contextPath + '/api';
        console.log('API Base URL:', this.apiBase);
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkEmailConfirmation();
        this.checkPasswordResetToken();
        this.enableScrollOnAuthPage();
    }

    enableScrollOnAuthPage() {
        // Убираем overflow: hidden с body на странице авторизации
        if (document.querySelector('.auth-page')) {
            document.body.style.overflow = 'auto';
            document.body.style.height = 'auto';
            document.body.style.minHeight = '100vh';
            document.documentElement.style.overflow = 'auto';
            document.documentElement.style.height = 'auto';
        }
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Registration form
        const registerForm = document.getElementById('registrationForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgotPasswordForm');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        // Reset password form
        const resetForm = document.getElementById('resetPasswordForm');
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // Navigation links
        document.querySelectorAll('[data-action="show-register"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('registerSection');
            });
        });

        document.querySelectorAll('[data-action="show-login"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('loginSection');
            });
        });

        document.querySelectorAll('[data-action="show-forgot-password"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('forgotPasswordSection');
            });
        });

        // Resend verification
        const resendBtn = document.getElementById('resendVerificationLink');
        if (resendBtn) {
            resendBtn.addEventListener('click', (e) => this.resendVerification(e));
        }
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = ['loginSection', 'registerSection', 'checkEmailSection',
            'emailConfirmedSection', 'forgotPasswordSection', 'resetPasswordSection'];

        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
            }
        });

        // Show selected section
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.remove('hidden');
        }

        this.currentSection = sectionId;
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Clear previous errors
        this.clearErrors('loginEmailError', 'loginPasswordError');

        if (!email || !password) {
            this.showError('loginEmailError', 'Заполните все поля');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('loginEmailError', 'Введите корректный email');
            return;
        }

        this.showLoading(true);

        try {
            const url = `${this.apiBase}/auth/login`;
            console.log('Login URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store tokens
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('user', JSON.stringify(data.user));

                this.showToast('Успешный вход!', 'success');

                // Redirect to main app
                setTimeout(() => {
                    window.location.href = '/' + window.location.pathname.split('/')[1] + '/index.html';
                }, 500);
            } else {
                this.showError('loginPasswordError', data.message || 'Неверный email или пароль');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginPasswordError', 'Ошибка соединения. Попробуйте позже.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const firstName = document.getElementById('registerFirstName').value.trim();
        const lastName = document.getElementById('registerLastName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const nickname = document.getElementById('registerNickname').value.trim();
        const password = document.getElementById('registerPassword').value;

        // Clear previous errors
        this.clearErrors('registerFirstNameError', 'registerLastNameError',
            'registerEmailError', 'registerNicknameError', 'registerPasswordError');

        // Validation
        if (!firstName) {
            this.showError('registerFirstNameError', 'Имя обязательно');
            return;
        }

        if (!email || !this.validateEmail(email)) {
            this.showError('registerEmailError', 'Введите корректный email');
            return;
        }

        if (!password) {
            this.showError('registerPasswordError', 'Пароль обязателен');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showError('registerPasswordError', 'Пароль должен содержать латинские буквы и цифры');
            return;
        }

        if (nickname && (nickname.length < 1 || nickname.length > 20)) {
            this.showError('registerNicknameError', 'Никнейм должен быть от 1 до 20 символов');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBase}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, nickname, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store email for resend functionality
                localStorage.setItem('pendingVerificationEmail', email);
                this.showSection('checkEmailSection');
                this.showToast('Письмо с подтверждением отправлено!', 'success');
            } else {
                const errorField = this.getErrorField(data.field);
                if (errorField) {
                    this.showError(`${errorField}Error`, data.message);
                } else {
                    this.showToast(data.message || 'Ошибка регистрации', 'error');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Ошибка соединения. Попробуйте позже.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value.trim();

        if (!email || !this.validateEmail(email)) {
            this.showError('forgotEmailError', 'Введите корректный email');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBase}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Ссылка для сброса пароля отправлена на почту!', 'success');
                setTimeout(() => {
                    this.showSection('loginSection');
                }, 2000);
            } else {
                this.showError('forgotEmailError', data.message || 'Пользователь не найден');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showToast('Ошибка соединения. Попробуйте позже.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleResetPassword(e) {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const hash = document.getElementById('resetHash').value;

        if (!newPassword) {
            this.showError('newPasswordError', 'Введите пароль');
            return;
        }

        if (!this.validatePassword(newPassword)) {
            this.showError('newPasswordError', 'Пароль должен содержать латинские буквы и цифры');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBase}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hash, password: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Пароль успешно изменен!', 'success');
                setTimeout(() => {
                    this.showSection('loginSection');
                }, 1500);
            } else {
                this.showError('newPasswordError', data.message || 'Ошибка сброса пароля');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            this.showToast('Ошибка соединения. Попробуйте позже.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async resendVerification(e) {
        const email = localStorage.getItem('pendingVerificationEmail');

        if (!email) {
            this.showToast('Email не найден. Попробуйте зарегистрироваться снова.', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBase}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                this.showToast('Новое письмо отправлено!', 'success');
            } else {
                const data = await response.json();
                this.showToast(data.message || 'Ошибка отправки письма', 'error');
            }
        } catch (error) {
            console.error('Resend error:', error);
            this.showToast('Ошибка соединения', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    checkEmailConfirmation() {
        const urlParams = new URLSearchParams(window.location.search);
        const confirmed = urlParams.get('confirmed');

        if (confirmed === 'true') {
            this.showSection('emailConfirmedSection');
            // Clear URL parameter
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    checkPasswordResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const resetHash = urlParams.get('hash');

        if (resetHash) {
            const hashInput = document.getElementById('resetHash');
            if (hashInput) {
                hashInput.value = resetHash;
            }
            this.showSection('resetPasswordSection');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return re.test(email);
    }

    validatePassword(password) {
        // Latin letters and digits only
        const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;
        return re.test(password);
    }

    getErrorField(field) {
        const fieldMap = {
            'email': 'registerEmail',
            'firstName': 'registerFirstName',
            'lastName': 'registerLastName',
            'nickname': 'registerNickname',
            'password': 'registerPassword'
        };
        return fieldMap[field];
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';

            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (errorElement) {
                    errorElement.style.display = 'none';
                }
            }, 5000);
        }
    }

    clearErrors(...errorIds) {
        errorIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '';
                element.style.display = 'none';
            }
        });
    }

    showLoading(isLoading) {
        const buttons = document.querySelectorAll('button[type="submit"]');
        buttons.forEach(btn => {
            if (isLoading) {
                btn.disabled = true;
                btn.classList.add('loading');
                const originalText = btn.textContent;
                btn.setAttribute('data-original-text', originalText);
                btn.textContent = '...';
            } else {
                btn.disabled = false;
                btn.classList.remove('loading');
                const originalText = btn.getAttribute('data-original-text');
                if (originalText) {
                    btn.textContent = originalText;
                }
            }
        });
    }

    showToast(message, type = 'info') {
        // Create container if not exists
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize auth app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authApp = new AuthApp();
});