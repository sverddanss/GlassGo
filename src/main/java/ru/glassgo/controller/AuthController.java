package ru.glassgo.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.glassgo.dto.RegisterRequest;
import ru.glassgo.model.User;
import ru.glassgo.service.UserService;

import java.util.HashMap;
import java.util.Map;

/**
 * REST-контроллер авторизации пользователей.
 * Обрабатывает запросы на /api/auth/login и /api/auth/register.
 */
@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Регистрация нового пользователя.
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        Map<String, Object> response = new HashMap<>();

        try {
            User user = userService.register(
                    request.getEmail(),
                    request.getNickname(),
                    request.getFirstName(),
                    request.getLastName(),
                    request.getPassword()
            );

            response.put("message", "Регистрация прошла успешно");
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            response.put("nickname", user.getNickname());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        }
    }

    /**
     * Вход пользователя.
     * POST /api/auth/login
     *
     * TODO: реализовать полноценную аутентификацию (проверка пароля по BCrypt-хешу,
     *       генерация JWT-токенов, refresh-токен).
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
