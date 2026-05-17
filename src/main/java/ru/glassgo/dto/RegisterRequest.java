package ru.glassgo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO для запроса регистрации.
 */
public class RegisterRequest {

    @NotBlank(message = "Email обязателен")
    @Email(message = "Некорректный формат email")
    private String email;

    @NotBlank(message = "Никнейм обязателен")
    @Size(min = 2, max = 32, message = "Никнейм должен быть от 2 до 32 символов")
    private String nickname;

    @NotBlank(message = "Имя обязательно")
    @Size(max = 64, message = "Имя не более 64 символов")
    private String firstName;

    @Size(max = 64, message = "Фамилия не более 64 символов")
    private String lastName;

    @NotBlank(message = "Пароль обязателен")
    @Size(min = 6, max = 128, message = "Пароль должен быть от 6 до 128 символов")
    private String password;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
