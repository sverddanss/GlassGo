package ru.glassgo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import ru.glassgo.websocket.ChatWebSocketHandler;

/**
 * Конфигурация WebSocket-соединений.
 * Регистрирует обработчик чата по эндпоинту /ws/chat
 * и разрешает подключения с любых источников (CORS).
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ChatWebSocketHandler chatWebSocketHandler;

    public WebSocketConfig(ChatWebSocketHandler chatWebSocketHandler) {
        this.chatWebSocketHandler = chatWebSocketHandler;
    }

    /**
     * Привязывает обработчик WebSocket-сообщений к URL-пути /ws/chat.
     * setAllowedOrigins("*") — разрешает подключения с любого домена (для разработки).
     */
    @Override
    public void registerWebSocketHandlers(@NonNull WebSocketHandlerRegistry registry) {
        registry.addHandler(chatWebSocketHandler, "/ws/chat")
                .setAllowedOrigins("*");
    }
}