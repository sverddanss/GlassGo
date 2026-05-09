package ru.glassgo.controller;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.sql.*;

@WebServlet("/api/test/db")
public class TestDatabaseController extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws java.io.IOException {

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();

        try {
            // Загружаем драйвер
            Class.forName("org.mariadb.jdbc.Driver");

            // Подключаемся к БД
            String url = "jdbc:mariadb://localhost:3306/glassgo";
            String user = "root";
            String password = "root";

            Connection conn = DriverManager.getConnection(url, user, password);

            // Проверяем подключение
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT COUNT(*) as count FROM users");

            int userCount = 0;
            if (rs.next()) {
                userCount = rs.getInt("count");
            }

            // Формируем JSON ответ
            String json = "{";
            json += "\"status\": \"connected\",";
            json += "\"message\": \"Database connection successful!\",";
            json += "\"usersCount\": " + userCount;
            json += "}";

            out.print(json);
            conn.close();

        } catch (ClassNotFoundException e) {
            out.print("{\"status\": \"error\", \"message\": \"JDBC Driver not found: " + e.getMessage() + "\"}");
        } catch (SQLException e) {
            out.print("{\"status\": \"error\", \"message\": \"Database error: " + e.getMessage() + "\"}");
        } catch (Exception e) {
            out.print("{\"status\": \"error\", \"message\": \"Error: " + e.getMessage() + "\"}");
        }
    }
}