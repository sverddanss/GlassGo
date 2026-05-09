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

@WebServlet("/api/dialogs")
public class DialogsController extends HttpServlet {
    private Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws java.io.IOException {

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();

        int userId = 1; // Для теста

        try (Connection conn = DatabaseConnection.getConnection()) {
            String sql = "SELECT DISTINCT d.id, d.type, d.title, " +
                    "(SELECT text FROM messages WHERE dialog_id = d.id ORDER BY created_at DESC LIMIT 1) as last_message " +
                    "FROM dialogs d " +
                    "JOIN dialog_participants dp ON d.id = dp.dialog_id " +
                    "WHERE dp.user_id = ?";

            PreparedStatement stmt = conn.prepareStatement(sql);
            stmt.setInt(1, userId);
            ResultSet rs = stmt.executeQuery();

            JsonArray dialogs = new JsonArray();
            while (rs.next()) {
                JsonObject dialog = new JsonObject();
                dialog.addProperty("id", rs.getInt("id"));
                dialog.addProperty("type", rs.getString("type"));
                dialog.addProperty("title", rs.getString("title") != null ? rs.getString("title") : "Диалог");
                dialog.addProperty("lastMessage", rs.getString("last_message") != null ? rs.getString("last_message") : "");
                dialogs.add(dialog);
            }

            out.print(gson.toJson(dialogs));
        } catch (SQLException e) {
            e.printStackTrace();
            out.print("[]");
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
}