package ru.glassgo.controller;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import ru.glassgo.util.DatabaseConnection;

import java.io.PrintWriter;
import java.sql.*;

@WebServlet("/api/dialogs/*/messages")
public class MessagesController extends HttpServlet {
    private Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws java.io.IOException {

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();

        // Получаем dialogId из URL
        String pathInfo = req.getPathInfo();
        String[] parts = pathInfo.split("/");
        int dialogId = Integer.parseInt(parts[1]);

        try (Connection conn = DatabaseConnection.getConnection()) {
            String sql = "SELECT m.id, m.sender_id, m.text, m.created_at, u.first_name, u.last_name " +
                    "FROM messages m " +
                    "JOIN users u ON m.sender_id = u.id " +
                    "WHERE m.dialog_id = ? " +
                    "ORDER BY m.created_at ASC";

            PreparedStatement stmt = conn.prepareStatement(sql);
            stmt.setInt(1, dialogId);
            ResultSet rs = stmt.executeQuery();

            JsonArray messages = new JsonArray();
            while (rs.next()) {
                JsonObject msg = new JsonObject();
                msg.addProperty("id", rs.getInt("id"));
                msg.addProperty("senderId", rs.getInt("sender_id"));
                msg.addProperty("text", rs.getString("text"));
                msg.addProperty("createdAt", rs.getString("created_at"));
                msg.addProperty("senderName", rs.getString("first_name") + " " + rs.getString("last_name"));
                messages.add(msg);
            }

            out.print(gson.toJson(messages));
        } catch (SQLException e) {
            e.printStackTrace();
            out.print("[]");
        }
    }
}