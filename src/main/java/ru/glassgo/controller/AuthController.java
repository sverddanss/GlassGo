package ru.glassgo.controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

import ru.glassgo.util.DatabaseConnection;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.sql.*;

@WebServlet("/api/auth/login")
public class AuthController extends HttpServlet {
    private Gson gson = new Gson();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, java.io.IOException {

        // Читаем JSON из запроса
        BufferedReader reader = req.getReader();
        JsonObject json = gson.fromJson(reader, JsonObject.class);
        String email = json.get("email").getAsString();
        String password = json.get("password").getAsString(); // Временно не проверяем пароль

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();

        try (Connection conn = DatabaseConnection.getConnection()) {
            // Ищем пользователя
            String sql = "SELECT id, email, first_name, last_name, nickname, status FROM users WHERE email = ?";
            PreparedStatement stmt = conn.prepareStatement(sql);
            stmt.setString(1, email);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                // Создаём сессию
                HttpSession session = req.getSession();
                session.setAttribute("userId", rs.getInt("id"));

                // Формируем ответ
                JsonObject user = new JsonObject();
                user.addProperty("id", rs.getInt("id"));
                user.addProperty("email", rs.getString("email"));
                user.addProperty("firstName", rs.getString("first_name"));
                user.addProperty("lastName", rs.getString("last_name"));
                user.addProperty("fullName", rs.getString("first_name") + " " + (rs.getString("last_name") != null ? rs.getString("last_name") : ""));
                user.addProperty("nickname", rs.getString("nickname"));
                user.addProperty("status", rs.getString("status"));
                user.addProperty("emailVerified", true);

                JsonObject response = new JsonObject();
                response.addProperty("accessToken", "mock-token-" + System.currentTimeMillis());
                response.addProperty("refreshToken", "mock-refresh-token");
                response.add("user", user);

                out.print(gson.toJson(response));
                resp.setStatus(HttpServletResponse.SC_OK);
            } else {
                JsonObject error = new JsonObject();
                error.addProperty("message", "Неверный email или пароль");
                out.print(gson.toJson(error));
                resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            }

        } catch (SQLException e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
}