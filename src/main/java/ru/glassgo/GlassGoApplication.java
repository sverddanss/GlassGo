package ru.glassgo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Точка входа в приложение GlassGo.
 * Запускает Spring Boot контекст и поднимает встроенный веб-сервер.
 */
@SpringBootApplication
public class GlassGoApplication {
    public static void main(String[] args) {
        SpringApplication.run(GlassGoApplication.class, args);
        System.out.println("🚀 GlassGo Spring Boot запущен!");
        System.out.println("📱 http://localhost:8080");
    }
}