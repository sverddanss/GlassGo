package ru.glassgo.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;
import java.io.InputStream;

public class DatabaseConnection {
    private static String url;
    private static String user;
    private static String password;

    static {
        try {
            Properties props = new Properties();
            try (InputStream input = DatabaseConnection.class.getClassLoader()
                    .getResourceAsStream("db.properties")) {
                if (input == null) {
                    // Fallback для тестирования
                    url = "jdbc:mariadb://localhost:3306/glassgo";
                    user = "root";
                    password = "root";
                } else {
                    props.load(input);
                    url = props.getProperty("db.url");
                    user = props.getProperty("db.user");
                    password = props.getProperty("db.password");
                }
            }
            Class.forName("org.mariadb.jdbc.Driver");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }
}