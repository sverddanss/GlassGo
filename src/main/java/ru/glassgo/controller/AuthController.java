package ru.glassgo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST-контроллер авторизации пользователей.
 * Обрабатывает запросы на /api/auth/login.
 *
 * TODO: реализовать полноценную аутентификацию (проверка пароля по BCrypt-хешу,
 *       генерация JWT-токенов, refresh-токен, регистрация, подтверждение email).
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /**
     * Принимает JSON с полями email и password.
     * Пока возвращает заглушку — реальная аутентификация не реализована.
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        Map<String, Object> response = new HashMap<>();

        if (email == null || password == null) {
            response.put("message", "Email и пароль обязательны");
            return ResponseEntity.badRequest().body(response);
        }

        // TODO: найти пользователя в БД по email, проверить пароль через BCrypt,
        //       сгенерировать JWT access/refresh токены и вернуть их клиенту.
        response.put("message", "Авторизация пока не реализована");
        return ResponseEntity.status(501).body(response);
    }
}