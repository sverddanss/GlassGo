/**
 * GlassGo - Main Application Module
 * Handles dialogs, messages, WebSocket connections, and UI interactions
 */

class MessengerApp {
    constructor() {
        this.apiBase = '/api';
        this.ws = null;
        this.currentUser = null;
        this.currentDialog = null;
        this.dialogs = [];
        this.messages = [];
        this.activeFilter = 'all';
        this.searchQuery = '';
        this.isRightPanelOpen = false;
        this.isDrawerOpen = false;
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
        this.setupWebSocket();
        await this.loadDialogs();
        this.setupMobileHandling();
    }

    checkAuth() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return false;
        }
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
        const avatarElements = document.querySelectorAll('[data-bind="currentUser.avatar"]');
        avatarElements.forEach(el => {
            if (this.currentUser.avatar) {
                el.innerHTML = `<img src="${this.currentUser.avatar}" alt="Avatar">`;
            } else {
                const initials = this.getInitials(this.currentUser.fullName);
                el.textContent = initials;
                el.style.background = this.getAvatarGradient(this.currentUser.id);
            }
        });

        // Update name
        const nameElements = document.querySelectorAll('[data-bind="currentUser.fullName"]');
        nameElements.forEach(el => {
            el.textContent = this.currentUser.fullName;
        });

        // Update email
        const emailElements = document.querySelectorAll('[data-bind="currentUser.email"]');
        emailElements.forEach(el => {
            el.textContent = this.currentUser.email;
        });

        // Update nickname
        const nicknameElements = document.querySelectorAll('[data-bind="currentUser.nickname"]');
        nicknameElements.forEach(el => {
            el.textContent = this.currentUser.nickname || this.currentUser.firstName;
        });
    }

    bindEvents() {
        // Hamburger menu
        const hamburger = document.getElementById('hamburgerBtn');
        if (hamburger) {
            hamburger.addEventListener('click', () => this.toggleDrawer());
        }

        // Drawer overlay
        const overlay = document.getElementById('drawerOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeDrawer());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Create dialog button (FAB)
        const fab = document.getElementById('createDialogFab');
        if (fab) {
            fab.addEventListener('click', () => this.openUserSearchModal());
        }

        // Create dialog from drawer
        const createDialogBtn = document.getElementById('createDialogBtn');
        if (createDialogBtn) {
            createDialogBtn.addEventListener('click', () => this.openUserSearchModal());
        }

        // Create group button
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => this.openGroupDialog());
        }

        // Resend verification
        const resendBtn = document.getElementById('resendVerificationBtn');
        if (resendBtn) {
            resendBtn.addEventListener('click', () => this.resendVerification());
        }

        // Dialog search
        const searchInput = document.getElementById('dialogSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderDialogs();
            });
        }

        // Dialog tabs
        const tabs = document.querySelectorAll('[data-filter]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.activeFilter = tab.getAttribute('data-filter');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderDialogs();
            });
        });

        // Message form
        const messageForm = document.getElementById('messageForm');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => this.sendMessage(e));
        }

        // Chat header click (open info panel)
        const chatHeader = document.getElementById('chatHeaderInfo');
        if (chatHeader) {
            chatHeader.addEventListener('click', () => this.openDialogInfo());
        }

        // Close right panel
        const closePanel = document.getElementById('rightPanelClose');
        if (closePanel) {
            closePanel.addEventListener('click', () => this.closeDialogInfo());
        }

        // Close chat button (mobile)
        const chatBackBtn = document.getElementById('chatBackBtn');
        if (chatBackBtn) {
            chatBackBtn.addEventListener('click', () => this.closeChat());
        }

        // Finish group button
        const finishGroupBtn = document.getElementById('finishGroupBtn');
        if (finishGroupBtn) {
            finishGroupBtn.addEventListener('click', () => this.createGroup());
        }
    }

    setupWebSocket() {
        const token = localStorage.getItem('accessToken');
        const wsUrl = `ws://${window.location.host}/ws?token=${token}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected, reconnecting in 5s...');
            setTimeout(() => this.setupWebSocket(), 5000);
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'new_message':
                this.handleNewMessage(data.message);
                break;
            case 'message_read':
                this.handleMessageRead(data.messageId, data.dialogId);
                break;
            case 'user_status':
                this.handleUserStatus(data.userId, data.status);
                break;
            case 'dialog_updated':
                this.loadDialogs();
                break;
            case 'typing':
                this.handleTypingIndicator(data.dialogId, data.userId);
                break;
        }
    }

    handleNewMessage(message) {
        // Add to messages if current dialog
        if (this.currentDialog && this.currentDialog.id === message.dialogId) {
            this.messages.push(message);
            this.renderMessages();
            this.scrollToBottom();
        }

        // Update dialog list
        this.loadDialogs();

        // Show notification if not active
        if (!this.isDialogActive(message.dialogId)) {
            this.showNotification(message);
        }
    }

    handleMessageRead(messageId, dialogId) {
        if (this.currentDialog && this.currentDialog.id === dialogId) {
            const message = this.messages.find(m => m.id === messageId);
            if (message && message.senderId !== this.currentUser.id) {
                message.read = true;
                this.renderMessages();
            }
        }
    }

    handleUserStatus(userId, status) {
        // Update status in dialog list
        const dialog = this.dialogs.find(d =>
            d.type === 'personal' && d.participants?.includes(userId)
        );
        if (dialog) {
            dialog.participantStatus = status;
            this.renderDialogs();
        }

        // Update current dialog status
        if (this.currentDialog && this.currentDialog.type === 'personal') {
            const otherParticipant = this.currentDialog.participants?.find(p => p !== this.currentUser.id);
            if (otherParticipant === userId) {
                this.updateChatStatus(status);
            }
        }
    }

    handleTypingIndicator(dialogId, userId) {
        if (this.currentDialog && this.currentDialog.id === dialogId && userId !== this.currentUser.id) {
            const statusEl = document.getElementById('chatStatus');
            if (statusEl) {
                statusEl.textContent = 'печатает...';
                setTimeout(() => {
                    if (statusEl.textContent === 'печатает...') {
                        statusEl.textContent = this.getParticipantStatus();
                    }
                }, 2000);
            }
        }
    }

    async loadDialogs() {
        try {
            const response = await this.apiRequest('/dialogs');
            if (response.ok) {
                this.dialogs = await response.json();
                this.renderDialogs();
            }
        } catch (error) {
            console.error('Error loading dialogs:', error);
        }
    }

    renderDialogs() {
        const container = document.getElementById('dialogList');
        if (!container) return;

        let filteredDialogs = this.dialogs;

        // Apply filter
        if (this.activeFilter !== 'all') {
            filteredDialogs = filteredDialogs.filter(d => d.type === this.activeFilter);
        }

        // Apply search
        if (this.searchQuery) {
            filteredDialogs = filteredDialogs.filter(d =>
                d.title.toLowerCase().includes(this.searchQuery) ||
                (d.lastMessage && d.lastMessage.text.toLowerCase().includes(this.searchQuery))
            );
        }

        if (filteredDialogs.length === 0) {
            container.innerHTML = `
                <div class="main-empty" style="padding: 40px 20px;">
                    <p>${this.searchQuery ? 'Ничего не найдено' : 'Нет диалогов'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredDialogs.map(dialog => this.renderDialogItem(dialog)).join('');

        // Add click handlers
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const dialogId = parseInt(item.dataset.id);
                this.openDialog(dialogId);
            });

            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, item.dataset.id);
            });
        });
    }

    renderDialogItem(dialog) {
        const isActive = this.currentDialog && this.currentDialog.id === dialog.id;
        const avatar = dialog.avatar || this.getInitials(dialog.title);
        const time = dialog.lastMessageTime ? this.formatTime(dialog.lastMessageTime) : '';
        const unreadCount = dialog.unreadCount || 0;

        let statusHtml = '';
        if (dialog.type === 'personal' && dialog.participantStatus === 'online') {
            statusHtml = '<span class="online-dot"></span>';
        }

        return `
            <div class="chat-item ${isActive ? 'active' : ''}" data-id="${dialog.id}">
                <div class="avatar">
                    ${dialog.avatar ? `<img src="${dialog.avatar}" alt="${dialog.title}">` : avatar}
                    ${statusHtml}
                </div>
                <div class="chat-info">
                    <div class="chat-top">
                        <span class="chat-name">${this.escapeHtml(dialog.title)}</span>
                        <span class="chat-time">${time}</span>
                    </div>
                    <div class="chat-bottom">
                        <span class="chat-preview">${this.escapeHtml(dialog.lastMessage || 'Нет сообщений')}</span>
                        ${unreadCount > 0 ? `<span class="chat-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async openDialog(dialogId) {
        try {
            const response = await this.apiRequest(`/dialogs/${dialogId}`);
            if (response.ok) {
                this.currentDialog = await response.json();
                await this.loadMessages(dialogId);
                this.showChatWindow();
                this.markMessagesAsRead(dialogId);
            }
        } catch (error) {
            console.error('Error opening dialog:', error);
        }
    }

    async loadMessages(dialogId) {
        try {
            const response = await this.apiRequest(`/dialogs/${dialogId}/messages`);
            if (response.ok) {
                this.messages = await response.json();
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="main-empty" style="padding: 40px 20px;">
                    <p>Нет сообщений. Начните диалог!</p>
                </div>
            `;
            return;
        }

        let lastDate = null;
        let html = '';

        this.messages.forEach(message => {
            const messageDate = new Date(message.createdAt).toLocaleDateString();
            if (messageDate !== lastDate) {
                html += `<div class="message-date">${messageDate}</div>`;
                lastDate = messageDate;
            }

            const isOutgoing = message.senderId === this.currentUser.id;
            html += this.renderMessage(message, isOutgoing);
        });

        container.innerHTML = html;
        this.scrollToBottom();
    }

    renderMessage(message, isOutgoing) {
        const time = this.formatTime(message.createdAt);
        const statusIcon = isOutgoing ? this.getStatusIcon(message.status) : '';

        let senderName = '';
        if (!isOutgoing && this.currentDialog.type === 'group') {
            senderName = `<div class="message-sender">${this.escapeHtml(message.senderName || 'Пользователь')}</div>`;
        }

        let replyHtml = '';
        if (message.replyTo) {
            replyHtml = `
                <div class="message-reply">
                    <div class="message-reply-name">${this.escapeHtml(message.replyTo.senderName)}</div>
                    <div class="message-reply-text">${this.escapeHtml(message.replyTo.text)}</div>
                </div>
            `;
        }

        return `
            <div class="message ${isOutgoing ? 'message-outgoing' : 'message-incoming'}">
                ${senderName}
                ${replyHtml}
                <div class="message-bubble">
                    ${this.escapeHtml(message.text)}
                </div>
                <div class="message-meta">
                    <span class="message-time">${time}</span>
                    ${statusIcon ? `<span class="message-status ${message.status}">${statusIcon}</span>` : ''}
                </div>
            </div>
        `;
    }

    async sendMessage(e) {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        const text = input.value.trim();

        if (!text || !this.currentDialog) return;

        // Clear input
        input.value = '';
        input.style.height = 'auto';

        // Optimistic update
        const tempMessage = {
            id: Date.now(),
            text: text,
            senderId: this.currentUser.id,
            dialogId: this.currentDialog.id,
            status: 'sending',
            createdAt: new Date().toISOString()
        };

        this.messages.push(tempMessage);
        this.renderMessages();

        // Send typing stop
        this.sendTypingStop();

        try {
            const response = await this.apiRequest(`/dialogs/${this.currentDialog.id}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                const sentMessage = await response.json();
                // Replace temp message
                const index = this.messages.findIndex(m => m.id === tempMessage.id);
                if (index !== -1) {
                    this.messages[index] = sentMessage;
                    this.renderMessages();
                }

                // Update dialog list
                this.loadDialogs();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Mark as failed
            const index = this.messages.findIndex(m => m.id === tempMessage.id);
            if (index !== -1) {
                this.messages[index].status = 'failed';
                this.renderMessages();
            }
        }
    }

    sendTyping() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentDialog) {
            this.ws.send(JSON.stringify({
                type: 'typing',
                dialogId: this.currentDialog.id
            }));
        }
    }

    sendTypingStop() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentDialog) {
            this.ws.send(JSON.stringify({
                type: 'typing_stop',
                dialogId: this.currentDialog.id
            }));
        }
    }

    async markMessagesAsRead(dialogId) {
        try {
            await this.apiRequest(`/dialogs/${dialogId}/read`, { method: 'POST' });
            this.loadDialogs(); // Update unread counts
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    showChatWindow() {
        const emptyState = document.getElementById('emptyChatState');
        const activeChat = document.getElementById('activeChat');
        const chatTitle = document.getElementById('chatTitle');
        const chatAvatar = document.getElementById('chatAvatar');

        if (emptyState) emptyState.classList.add('hidden');
        if (activeChat) activeChat.style.display = 'flex';

        if (chatTitle) chatTitle.textContent = this.currentDialog.title;

        if (chatAvatar) {
            if (this.currentDialog.avatar) {
                chatAvatar.innerHTML = `<img src="${this.currentDialog.avatar}" alt="${this.currentDialog.title}">`;
            } else {
                chatAvatar.textContent = this.getInitials(this.currentDialog.title);
                chatAvatar.style.background = this.getAvatarGradient(this.currentDialog.id);
            }
        }

        this.updateChatStatus(this.getParticipantStatus());

        // On mobile, hide sidebar
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.add('hidden-mobile');

            const backBtn = document.getElementById('chatBackBtn');
            if (backBtn) backBtn.classList.remove('hidden');
        }
    }

    closeChat() {
        const emptyState = document.getElementById('emptyChatState');
        const activeChat = document.getElementById('activeChat');

        if (emptyState) emptyState.classList.remove('hidden');
        if (activeChat) activeChat.style.display = 'none';

        this.currentDialog = null;
        this.messages = [];

        // On mobile, show sidebar
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('hidden-mobile');
        }
    }

    updateChatStatus(status) {
        const statusEl = document.getElementById('chatStatus');
        if (statusEl) {
            statusEl.textContent = status;
            if (status === 'online') {
                statusEl.classList.remove('offline');
            } else {
                statusEl.classList.add('offline');
            }
        }
    }

    getParticipantStatus() {
        if (this.currentDialog.type === 'group') {
            return `${this.currentDialog.participantCount || 0} участников`;
        }

        if (this.currentDialog.participantStatus === 'online') {
            return 'online';
        }

        const lastSeen = this.currentDialog.lastSeen;
        if (lastSeen) {
            return `был(а) ${this.formatRelativeTime(lastSeen)}`;
        }

        return 'offline';
    }

    async openDialogInfo() {
        if (!this.currentDialog) return;

        const panel = document.getElementById('rightPanel');
        const content = document.getElementById('dialogInfoContent');

        if (!panel || !content) return;

        // Load dialog info
        try {
            const response = await this.apiRequest(`/dialogs/${this.currentDialog.id}/info`);
            if (response.ok) {
                const info = await response.json();
                content.innerHTML = this.renderDialogInfo(info);
            }
        } catch (error) {
            console.error('Error loading dialog info:', error);
        }

        panel.classList.add('open');
        this.isRightPanelOpen = true;
    }

    closeDialogInfo() {
        const panel = document.getElementById('rightPanel');
        if (panel) {
            panel.classList.remove('open');
            this.isRightPanelOpen = false;
        }
    }

    renderDialogInfo(info) {
        if (info.type === 'group') {
            return `
                <div class="profile-panel-content">
                    <div class="avatar avatar-xl">
                        ${info.avatar ? `<img src="${info.avatar}" alt="${info.title}">` : this.getInitials(info.title)}
                    </div>
                    <h3 class="profile-panel-name">${this.escapeHtml(info.title)}</h3>
                    <span class="profile-panel-status">${info.participantCount} участников</span>
                </div>
                <div class="info-section">
                    <div class="info-section-title">Участники</div>
                    ${info.participants.map(p => `
                        <div class="info-row">
                            <div class="avatar avatar-sm">${p.avatar ? `<img src="${p.avatar}">` : this.getInitials(p.name)}</div>
                            <div class="info-row-content">
                                <span class="info-row-value">${this.escapeHtml(p.name)}</span>
                                <span class="info-row-label">${p.isAdmin ? 'Администратор' : 'Участник'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="profile-panel-content">
                <div class="avatar avatar-xl">
                    ${info.avatar ? `<img src="${info.avatar}" alt="${info.name}">` : this.getInitials(info.name)}
                </div>
                <h3 class="profile-panel-name">${this.escapeHtml(info.name)}</h3>
                <span class="profile-panel-status ${info.status === 'online' ? 'online' : ''}">${info.status === 'online' ? 'В сети' : info.lastSeen ? `Был(а) ${this.formatRelativeTime(info.lastSeen)}` : 'Не в сети'}</span>
            </div>
            <div class="info-section">
                <div class="info-section-title">Информация</div>
                ${info.nickname ? `
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <div class="info-row-content">
                            <span class="info-row-value">${this.escapeHtml(info.nickname)}</span>
                            <span class="info-row-label">Никнейм</span>
                        </div>
                    </div>
                ` : ''}
                <div class="info-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M4 4h16v16H4z"/>
                        <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <div class="info-row-content">
                        <span class="info-row-value">${this.escapeHtml(info.email)}</span>
                        <span class="info-row-label">E-mail</span>
                    </div>
                </div>
            </div>
        `;
    }

    openUserSearchModal() {
        const modal = document.getElementById('userSearchModal');
        if (!modal) return;

        document.getElementById('userSearchTitle').textContent = 'Выбор пользователя';
        document.getElementById('finishGroupBtn').classList.add('hidden');

        modal.classList.add('open');
        this.loadUserSearchResults();

        // Bind search
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = () => this.loadUserSearchResults(searchInput.value);
        }

        // Bind close
        document.querySelectorAll('[data-action="close-user-search"]').forEach(btn => {
            btn.onclick = () => this.closeUserSearchModal();
        });
    }

    openGroupDialog() {
        const modal = document.getElementById('userSearchModal');
        if (!modal) return;

        document.getElementById('userSearchTitle').textContent = 'Выбор участников';
        document.getElementById('finishGroupBtn').classList.remove('hidden');

        modal.classList.add('open');
        this.selectedUsers = [];
        this.loadUserSearchResults();

        // Bind search
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.oninput = () => this.loadUserSearchResults(searchInput.value);
        }

        // Bind close
        document.querySelectorAll('[data-action="close-user-search"]').forEach(btn => {
            btn.onclick = () => this.closeUserSearchModal();
        });
    }

    async loadUserSearchResults(query = '') {
        const container = document.getElementById('userSearchResults');
        if (!container) return;

        try {
            const url = query ? `/users/search?q=${encodeURIComponent(query)}` : '/users';
            const response = await this.apiRequest(url);

            if (response.ok) {
                const users = await response.json();
                container.innerHTML = users.map(user => this.renderUserSearchItem(user)).join('');

                // Add click handlers
                container.querySelectorAll('.contact-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const userId = parseInt(item.dataset.id);
                        this.selectUserForDialog(userId, item);
                    });
                });
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    renderUserSearchItem(user) {
        const isSelected = this.selectedUsers && this.selectedUsers.includes(user.id);

        return `
            <div class="contact-item ${isSelected ? 'selected' : ''}" data-id="${user.id}">
                <div class="avatar">
                    ${user.avatar ? `<img src="${user.avatar}" alt="${user.fullName}">` : this.getInitials(user.fullName)}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${this.escapeHtml(user.fullName)}</div>
                    <div class="contact-status ${user.status === 'online' ? 'online' : ''}">
                        ${user.nickname ? `@${user.nickname}` : user.email}
                    </div>
                </div>
                ${this.selectedUsers ? `
                    <div class="selection-check">
                        ${isSelected ? '✓' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    selectUserForDialog(userId, element) {
        const isGroupCreation = document.getElementById('finishGroupBtn').classList.contains('hidden') === false;

        if (!isGroupCreation) {
            // Single dialog creation
            this.createDialogWithUser(userId);
            this.closeUserSearchModal();
        } else {
            // Group creation - toggle selection
            if (this.selectedUsers.includes(userId)) {
                this.selectedUsers = this.selectedUsers.filter(id => id !== userId);
                element.classList.remove('selected');
            } else {
                this.selectedUsers.push(userId);
                element.classList.add('selected');
            }

            // Update selection check
            const checkSpan = element.querySelector('.selection-check');
            if (checkSpan) {
                checkSpan.textContent = this.selectedUsers.includes(userId) ? '✓' : '';
            }
        }
    }

    async createDialogWithUser(userId) {
        try {
            const response = await this.apiRequest('/dialogs', {
                method: 'POST',
                body: JSON.stringify({ participantId: userId })
            });

            if (response.ok) {
                const dialog = await response.json();
                this.showToast('Диалог создан', 'success');
                this.loadDialogs();
                this.openDialog(dialog.id);
            }
        } catch (error) {
            console.error('Error creating dialog:', error);
            this.showToast('Ошибка создания диалога', 'error');
        }
    }

    async createGroup() {
        if (!this.selectedUsers || this.selectedUsers.length === 0) {
            this.showToast('Выберите хотя бы одного участника', 'error');
            return;
        }

        const groupName = prompt('Введите название беседы:');
        if (!groupName) return;

        try {
            const response = await this.apiRequest('/dialogs/groups', {
                method: 'POST',
                body: JSON.stringify({
                    name: groupName,
                    participantIds: this.selectedUsers
                })
            });

            if (response.ok) {
                const dialog = await response.json();
                this.showToast('Беседа создана', 'success');
                this.closeUserSearchModal();
                this.loadDialogs();
                this.openDialog(dialog.id);
            }
        } catch (error) {
            console.error('Error creating group:', error);
            this.showToast('Ошибка создания беседы', 'error');
        }
    }

    closeUserSearchModal() {
        const modal = document.getElementById('userSearchModal');
        if (modal) {
            modal.classList.remove('open');
        }
        this.selectedUsers = null;
    }

    toggleDrawer() {
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('drawerOverlay');

        if (this.isDrawerOpen) {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
        } else {
            drawer.classList.add('open');
            overlay.classList.add('open');
        }

        this.isDrawerOpen = !this.isDrawerOpen;
    }

    closeDrawer() {
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('drawerOverlay');

        drawer.classList.remove('open');
        overlay.classList.remove('open');
        this.isDrawerOpen = false;
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

        if (this.ws) {
            this.ws.close();
        }

        window.location.href = 'login.html';
    }

    async resendVerification() {
        try {
            const response = await this.apiRequest('/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email: this.currentUser.email })
            });

            if (response.ok) {
                this.showToast('Письмо отправлено!', 'success');
            }
        } catch (error) {
            console.error('Error resending verification:', error);
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
                // Retry with new token
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

    setupMobileHandling() {
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.currentDialog) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.remove('hidden-mobile');
            }
        });
    }

    showContextMenu(e, dialogId) {
        // Implementation for context menu (pin, delete, etc.)
        console.log('Context menu for dialog:', dialogId);
    }

    showNotification(message) {
        if (Notification.permission === 'granted') {
            new Notification(message.senderName || 'Новое сообщение', {
                body: message.text,
                icon: '/favicon.ico'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    isDialogActive(dialogId) {
        return this.currentDialog && this.currentDialog.id === dialogId && document.hasFocus();
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

    getStatusIcon(status) {
        switch (status) {
            case 'sent': return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
            case 'delivered': return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/><polyline points="20 12 9 23 4 18"/></svg>';
            case 'read': return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
            case 'sending': return '<div class="spinner-sm" style="width:14px;height:14px;"></div>';
            case 'failed': return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
            default: return '';
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
        }
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
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.messengerApp = new MessengerApp();
});