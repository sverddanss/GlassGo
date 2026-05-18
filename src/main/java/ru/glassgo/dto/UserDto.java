package ru.glassgo.dto;
import ru.glassgo.model.User;
public class UserDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String nickname;
    private String fullName;
    private String status;
    private boolean emailVerified;
    public UserDto() {}
    public static UserDto fromEntity(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setEmail(user.getEmail());
        dto.setNickname(user.getNickname());
        dto.setFullName(buildFullName(user));
        dto.setStatus(user.getStatus());
        dto.setEmailVerified(user.isEmailConfirmed());
        return dto;
    }
    private static String buildFullName(User user) {
        String full = (user.getFirstName() + " " + (user.getLastName() != null ? user.getLastName() : "")).trim();
        return full.isEmpty() ? user.getNickname() : full;
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
}