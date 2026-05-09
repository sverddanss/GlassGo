-- Создаём БД и таблицы
CREATE DATABASE IF NOT EXISTS glassgo;
USE glassgo;

-- Таблица пользователей (только нужное для входа)
CREATE TABLE IF NOT EXISTS users (
                                     id INT PRIMARY KEY AUTO_INCREMENT,
                                     email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    nickname VARCHAR(50),
    avatar_url VARCHAR(500),
    email_verified BOOLEAN DEFAULT TRUE,  -- Для теста сразу TRUE
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Добавляем тестового пользователя (пароль: 123)
-- Хеш для '123' через BCrypt
INSERT INTO users (email, password_hash, first_name, last_name, nickname, status) VALUES
                                                                                      ('ivan@example.com', '$2a$10$rVwZtE2zQwLw5wY5wY5wY5wY5wY5wY5wY5wY5wY5wY5wY5wY5wY', 'Иван', 'Петров', 'ivan_p', 'online'),
                                                                                      ('test@example.com', '$2a$10$rVwZtE2zQwLw5wY5wY5wY5wY5wY5wY5wY5wY5wY5wY5wY5wY5wY', 'Тестовый', 'Пользователь', 'tester', 'online');

-- Таблица диалогов (минимальная)
CREATE TABLE IF NOT EXISTS dialogs (
                                       id INT PRIMARY KEY AUTO_INCREMENT,
                                       type VARCHAR(20) DEFAULT 'personal',
    title VARCHAR(255)
    );

-- Таблица участников диалогов
CREATE TABLE IF NOT EXISTS dialog_participants (
                                                   dialog_id INT,
                                                   user_id INT,
                                                   PRIMARY KEY (dialog_id, user_id)
    );

-- Таблица сообщений (минимальная)
CREATE TABLE IF NOT EXISTS messages (
                                        id INT PRIMARY KEY AUTO_INCREMENT,
                                        dialog_id INT,
                                        sender_id INT,
                                        text TEXT,
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем тестовые данные
INSERT INTO dialogs (id, type, title) VALUES (1, 'personal', NULL), (2, 'personal', NULL);
INSERT INTO dialog_participants VALUES (1, 1), (1, 2), (2, 1), (2, 3);
INSERT INTO messages (dialog_id, sender_id, text) VALUES
                                                      (1, 2, 'Привет! Как дела?'),
                                                      (1, 1, 'Отлично! Спасибо'),
                                                      (2, 3, 'Встреча завтра');