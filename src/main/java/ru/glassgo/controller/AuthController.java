package ru.glassgo.controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
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

    }
}
