package ru.glassgo.dto;
import jakarta.validation.constraints.NotBlank;
public class RefreshRequest {
    @NotBlank(message = "Refresh token обязателен")
    private String refreshToken;
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
}