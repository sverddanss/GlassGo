package ru.glassgo.controller;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import ru.glassgo.util.DatabaseConnection;

import java.io.PrintWriter;
import java.sql.*;

@WebServlet("/api/users/me")
public class UsersController extends HttpServlet {
    private Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws java.io.IOException {

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();

        // Для теста берем первого пользователя
        int userId = 1;

        try (Connection conn = DatabaseConnection.getConnection()) {
            String sql = "SELECT id, email, first_name, last_name, nickname, status FROM users WHERE id = ?";
            PreparedStatement stmt = conn.prepareStatement(sql);
            stmt.setInt(1, userId);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                JsonObject user = new JsonObject();
                user.addProperty("id", rs.getInt("id"));
                user.addProperty("email", rs.getString("email"));
                user.addProperty("firstName", rs.getString("first_name"));
                user.addProperty("lastName", rs.getString("last_name"));
                user.addProperty("fullName", rs.getString("first_name") + " " +
                        (rs.getString("last_name") != null ? rs.getString("last_name") : ""));
                user.addProperty("nickname", rs.getString("nickname"));
                user.addProperty("status", rs.getString("status"));

                out.print(gson.toJson(user));
                resp.setStatus(HttpServletResponse.SC_OK);
            } else {
                out.print("{\"error\": \"User not found\"}");
                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            e.printStackTrace();
            out.print("{\"error\": \"" + e.getMessage() + "\"}");
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
}