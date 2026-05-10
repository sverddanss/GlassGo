package ru.glassgo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Тестовый контроллер для проверки работоспособности сервера.
 * Предоставляет эндпоинты, позволяющие убедиться,
 * что Spring Boot и WebSocket поднялись корректно.
 */
@RestController
public class TestController {

    /** Проверяет, что REST API сервера доступен. */
    @GetMapping("/api/test")
    public Map<String, String> test() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "GlassGo Spring Boot работает!");
        return response;
    }

    /** Проверяет доступность WebSocket-эндпоинта и возвращает его адрес. */
    @GetMapping("/api/ws-test")
    public Map<String, String> wsTest() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "WebSocket доступен по адресу: ws://localhost:8080/ws/chat");
        return response;
    }
}
