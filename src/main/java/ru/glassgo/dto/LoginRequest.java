package ru.glassgo.dto;
import jakarta.validation.constraints.NotBlank;
public class LoginRequest {
    @NotBlank(message = "Email обязателен")
    private String email;
    @NotBlank(message = "Пароль обязателен")
    private String password;
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}