# GlassGo — План дальнейшей работы

## Текущее состояние проекта

Проект представляет собой мессенджер на Spring Boot 3.3.5 (Java 21) + MariaDB.
Фронтенд — статические HTML/CSS/JS страницы (login, index, profile, settings, contacts).
Реализована базовая структура: модели, тестовые контроллеры, WebSocket (эхо-режим),
фронтенд-каркас с UI для чатов, списка пользователей, профиля, настроек.

---

## Фаза 1: Бэкенд — Аутентификация и безопасность

### 1.1 Реализация регистрации
- [ ] Создать `UserRepository` (Spring Data JPA)
- [ ] Создать `UserService` с методами: register, findByEmail, findById
- [ ] Подключить BCrypt для хеширования паролей (добавить `spring-boot-starter-security` или `BCryptPasswordEncoder` вручную)
- [ ] Эндпоинт `POST /api/auth/register` — валидация полей, проверка уникальности email/nickname, сохранение в БД

### 1.2 Реализация входа
- [ ] Эндпоинт `POST /api/auth/login` — поиск пользователя, проверка пароля, генерация токенов
- [ ] Подключить JWT (добавить зависимость `jjwt` или `nimbus-jose-jwt`)
- [ ] Генерация access-токена (15 мин) и refresh-токена (30 дней)
- [ ] Эндпоинт `POST /api/auth/refresh` — обновление access-токена

### 1.3 Подтверждение email
- [ ] Генерация уникального хеша подтверждения при регистрации
- [ ] Подключить отправку email (JavaMailSender / spring-boot-starter-mail)
- [ ] Эндпоинт `GET /api/auth/confirm?hash=...` — подтверждение email
- [ ] Эндпоинт `POST /api/auth/resend-verification` — повторная отправка

### 1.4 Сброс пароля
- [ ] Эндпоинт `POST /api/auth/forgot-password` — генерация токена сброса
- [ ] Эндпоинт `POST /api/auth/reset-password` — установка нового пароля
- [ ] Очистка просроченных токенов (scheduled task)

### 1.5 Фильтр авторизации
- [ ] Создать `JwtAuthFilter` — проверка токена в заголовке Authorization
- [ ] Настроить `SecurityFilterChain` (или ручной фильтр)
- [ ] Исключить из фильтра: /api/auth/*, /login.html, /css/*, /js/*, /api/test*

---

## Фаза 2: Бэкенд — API пользователей

### 2.1 REST API пользователей
- [ ] `GET /api/users/me` — текущий пользователь (из JWT)
- [ ] `PUT /api/users/me` — обновление профиля (имя, фамилия, никнейм)
- [ ] `POST /api/users/me/avatar` — загрузка аватара (сохранение файла + путь в БД)
- [ ] `GET /api/users` — список всех пользователей
- [ ] `GET /api/users/{id}` — профиль конкретного пользователя
- [ ] `GET /api/users/search?q=...` — поиск по имени/никнейму/email

### 2.2 Модели и репозитории
- [ ] Проверить и дополнить JPA-сущность `User` (fullName — вычисляемое поле?)
- [ ] Добавить `@Transient` поле `fullName` или DTO для ответа клиенту
- [ ] Создать `UserDTO` (без passwordHash, confirmationHash и пр.)

---

## Фаза 3: Бэкенд — Чаты и сообщения

### 3.1 JPA-сущности
- [ ] Создать `Chat` (id, chatType, title, createdBy, createdAt)
- [ ] Создать `ChatMember` (chatId, userId, joinedAt)
- [ ] Создать `Message` (id, chatId, senderId, content, sentAt, isRead, readAt)
- [ ] Создать соответствующие Repository-интерфейсы

### 3.2 REST API диалогов
- [ ] `GET /api/dialogs` — список диалогов текущего пользователя (с последним сообщением, кол-вом непрочитанных)
- [ ] `POST /api/dialogs` — создание личного диалога (по participantId)
- [ ] `POST /api/dialogs/groups` — создание группового чата
- [ ] `GET /api/dialogs/{id}` — данные конкретного диалога
- [ ] `GET /api/dialogs/{id}/info` — расширенная информация (участники, количество)
- [ ] `GET /api/dialogs/{id}/messages` — история сообщений (с пагинацией)
- [ ] `POST /api/dialogs/{id}/messages` — отправка сообщения
- [ ] `POST /api/dialogs/{id}/read` — пометить как прочитанное

---

## Фаза 4: WebSocket — Реальный чат

### 4.1 Замена эхо-режима
- [ ] Авторизация WebSocket-подключений (передача JWT через query-параметр)
- [ ] Маршрутизация сообщений по чатам (отправлять только участникам)
- [ ] Обработка событий: `new_message`, `typing`, `typing_stop`, `user_status`, `message_read`
- [ ] Хранение маппинга userId → WebSocketSession для адресной доставки

### 4.2 Статус пользователей
- [ ] Обновление статуса на "online" при подключении WebSocket
- [ ] Обновление на "offline" + last_seen при отключении
- [ ] Рассылка события `user_status` всем, кто в общих чатах



## Приоритет выполнения

1. **Фаза 1** (аутентификация) — без неё ничего не работает
2. **Фаза 2** (API пользователей) — нужен для отображения профилей
3. **Фаза 3** (чаты и сообщения) — основная функциональность
4. **Фаза 4** (WebSocket) — real-time доставка

