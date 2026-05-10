-- GlassGo: схема базы данных (MariaDB)
-- Содержит таблицы пользователей, чатов, сообщений и вспомогательные

-- Инициализация базы данных
CREATE DATABASE IF NOT EXISTS glassgo;
USE glassgo;

-- Пользователи: учётные данные, статус онлайн, подтверждение email
CREATE TABLE IF NOT EXISTS users (
                                     id INT PRIMARY KEY AUTO_INCREMENT,
                                     first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(20) UNIQUE,
    is_email_confirmed BOOLEAN DEFAULT FALSE,
    email_confirmation_hash VARCHAR(64),
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_nickname (nickname)
    );

-- Токены сброса пароля (хеш + срок действия)
CREATE TABLE IF NOT EXISTS password_resets (
                                               id INT PRIMARY KEY AUTO_INCREMENT,
                                               user_id INT NOT NULL,
                                               reset_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reset_hash (reset_hash),
    INDEX idx_expires (expires_at)
    );

-- Чаты: личные (private) и групповые (group)
CREATE TABLE IF NOT EXISTS chats (
                                     id INT PRIMARY KEY AUTO_INCREMENT,
                                     chat_type ENUM('private', 'group') NOT NULL DEFAULT 'private',
    title VARCHAR(100),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_chat_type (chat_type)
    );

-- Связь M:N между чатами и пользователями
CREATE TABLE IF NOT EXISTS chat_members (
                                            chat_id INT NOT NULL,
                                            user_id INT NOT NULL,
                                            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                            PRIMARY KEY (chat_id, user_id),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Сообщения чатов с отметкой о прочтении
CREATE TABLE IF NOT EXISTS messages (
                                        id INT PRIMARY KEY AUTO_INCREMENT,
                                        chat_id INT NOT NULL,
                                        sender_id INT NOT NULL,
                                        content TEXT NOT NULL,
                                        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                        is_read BOOLEAN DEFAULT FALSE,
                                        read_at TIMESTAMP NULL,
                                        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_chat_id (chat_id),
    INDEX idx_sent_at (sent_at)
    );

-- Связь M:N для отслеживания непрочитанных сообщений каждого пользователя
CREATE TABLE IF NOT EXISTS unread_messages (
                                               message_id INT NOT NULL,
                                               user_id INT NOT NULL,
                                               PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- ============================================
-- ТЕСТОВЫЕ ДАННЫЕ
-- ============================================

-- Тестовые пользователи (пароли — заглушки, заменить на реальные BCrypt-хеши)
INSERT INTO users (first_name, last_name, email, password_hash, nickname, is_email_confirmed, status) VALUES
                                                                                                          ('Иван', 'Петров', 'ivan@example.com', '$2a$10$dummyHashForNow1234567890', 'ivan_p', TRUE, 'online'),
                                                                                                          ('Мария', 'Сидорова', 'maria@example.com', '$2a$10$dummyHashForNow1234567890', 'maria_s', TRUE, 'online'),
                                                                                                          ('Алексей', 'Иванов', 'alex@example.com', '$2a$10$dummyHashForNow1234567890', 'alex_i', TRUE, 'offline');

-- Создаем тестовые чаты
INSERT INTO chats (chat_type, title, created_by) VALUES
                                                     ('private', NULL, 1),
                                                     ('private', NULL, 1),
                                                     ('group', 'Команда GlassGo', 1);

-- Добавляем участников
INSERT INTO chat_members (chat_id, user_id) VALUES
                                                (1, 1), (1, 2),  -- Иван и Мария
                                                (2, 1), (2, 3),  -- Иван и Алексей
                                                (3, 1), (3, 2), (3, 3);  -- Групповой чат

-- Добавляем тестовые сообщения
INSERT INTO messages (chat_id, sender_id, content, sent_at, is_read) VALUES
                                                                         (1, 2, 'Привет! Как дела?', DATE_SUB(NOW(), INTERVAL 2 HOUR), TRUE),
                                                                         (1, 1, 'Отлично! Спасибо', DATE_SUB(NOW(), INTERVAL 1 HOUR), TRUE),
                                                                         (1, 2, 'Отличные новости!', DATE_SUB(NOW(), INTERVAL 30 MINUTE), FALSE),
                                                                         (2, 3, 'Встреча завтра в 15:00', DATE_SUB(NOW(), INTERVAL 3 HOUR), TRUE),
                                                                         (2, 1, 'Буду', DATE_SUB(NOW(), INTERVAL 2 HOUR), FALSE),
                                                                         (3, 1, 'Добро пожаловать в команду!', DATE_SUB(NOW(), INTERVAL 1 DAY), TRUE),
                                                                         (3, 2, 'Спасибо! Рада быть здесь', DATE_SUB(NOW(), INTERVAL 23 HOUR), TRUE);