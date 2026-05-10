package ru.glassgo.websocket;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Обработчик WebSocket-соединений чата.
 * Управляет пулом активных сессий: добавляет при подключении,
 * удаляет при отключении. Входящие сообщения рассылаются
 * всем подключённым клиентам (broadcast/эхо-режим).
 *
 * TODO: заменить эхо-режим на маршрутизацию сообщений
 *       по конкретным чатам и пользователям.
 */
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    /** Потокобезопасный список активных WebSocket-сессий. */
    private final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

    /** Регистрирует новую сессию при подключении клиента. */
    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
        sessions.add(session);
        System.out.println("🔌 WebSocket подключен: " + session.getId());
        System.out.println("📊 Всего сессий: " + sessions.size());
    }

    /**
     * Обрабатывает входящее текстовое сообщение.
     * Пересылает его всем открытым сессиям (broadcast).
     */
    @Override
    protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) throws Exception {
        String payload = message.getPayload();
        System.out.println("📨 Получено сообщение: " + payload);

        for (WebSocketSession s : sessions) {
            if (s.isOpen()) {
                s.sendMessage(new TextMessage("Эхо: " + payload));
            }
        }
    }

    /** Удаляет сессию из пула при отключении клиента. */
    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) throws Exception {
        sessions.remove(session);
        System.out.println("🔌 WebSocket отключен: " + session.getId());
        System.out.println("📊 Всего сессий: " + sessions.size());
    }
}
