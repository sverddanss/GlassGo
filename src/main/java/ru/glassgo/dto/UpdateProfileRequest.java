package ru.glassgo.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public class UpdateProfileRequest {
    @NotBlank(message = "Имя обязательно")
    @Size(max = 64, message = "Имя не более 64 символов")
    private String firstName;
    @Size(max = 64, message = "Фамилия не более 64 символов")
    private String lastName;
    @Size(min = 1, max = 32, message = "Никнейм от 1 до 32 символов")
    private String nickname;
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
}
