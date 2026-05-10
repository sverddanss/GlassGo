package ru.glassgo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Тестовый контроллер для проверки подключения к базе данных.
 * Выполняет простой SQL-запрос (COUNT по таблице users)
 * и возвращает результат или сообщение об ошибке.
 */
@RestController
@RequestMapping("/api/test")
public class TestDatabaseController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Проверяет соединение с БД, выполняя SELECT COUNT(*) FROM users.
     * @return JSON со статусом подключения и количеством пользователей.
     */
    @GetMapping("/db")
    public Map<String, Object> testDatabase() {
        Map<String, Object> response = new HashMap<>();
        try {
            Integer userCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM users", Integer.class);

            response.put("status", "connected");
            response.put("message", "Database connection successful!");
            response.put("usersCount", userCount);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
        }
        return response;
    }
}