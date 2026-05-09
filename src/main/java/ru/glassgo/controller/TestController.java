package ru.glassgo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class TestController {

    @GetMapping("/api/test")
    public Map<String, String> test() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "GlassGo Spring Boot работает!");
        return response;
    }

    @GetMapping("/api/ws-test")
    public Map<String, String> wsTest() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "WebSocket доступен по адресу: ws://localhost:8080/ws/chat");
        return response;
    }
}
