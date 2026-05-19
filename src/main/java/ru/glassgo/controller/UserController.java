package ru.glassgo.controller;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.glassgo.dto.UpdateProfileRequest;
import ru.glassgo.dto.UserDto;
import ru.glassgo.model.User;
import ru.glassgo.repository.UserRepository;
import ru.glassgo.service.UserService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;
    @Value("${app.upload-dir}")
    private String uploadDir;
    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(UserDto.fromEntity(user));
    }
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal User user,
                                           @Valid @RequestBody UpdateProfileRequest request) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            User updated = userService.updateProfile(
                    user.getId(),
                    request.getFirstName(),
                    request.getLastName(),
                    request.getNickname()
            );
            return ResponseEntity.ok(UserDto.fromEntity(updated));
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            response.put("field", "nickname");
            return ResponseEntity.status(409).body(response);
        }
    }
    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(@AuthenticationPrincipal User user,
                                          @RequestParam("avatar") MultipartFile file) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        if (file.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Файл пустой");
            return ResponseEntity.badRequest().body(response);
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Разрешены только изображения");
            return ResponseEntity.badRequest().body(response);
        }
        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            String extension = getExtension(file.getOriginalFilename());
            String fileName = UUID.randomUUID() + "." + extension;
            Path targetPath = uploadPath.resolve(fileName);
            file.transferTo(targetPath);
            String avatarUrl = "/avatars/" + fileName;
            User updated = userService.uploadAvatar(user.getId(), avatarUrl);
            Map<String, String> response = new HashMap<>();
            response.put("avatarUrl", avatarUrl);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Ошибка загрузки файла");
            return ResponseEntity.status(500).body(response);
        }
    }
    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<UserDto> users = userRepository.findAll().stream()
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }
    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(@RequestParam String q) {
        List<UserDto> users = userRepository.findAll().stream()
                .filter(u -> matchesQuery(u, q))
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        return userService.findById(id)
                .map(user -> ResponseEntity.ok(UserDto.fromEntity(user)))
                .orElse(ResponseEntity.notFound().build());
    }
    private boolean matchesQuery(User user, String query) {
        String q = query.toLowerCase();
        return (user.getFirstName() != null && user.getFirstName().toLowerCase().contains(q))
                || (user.getLastName() != null && user.getLastName().toLowerCase().contains(q))
                || (user.getNickname() != null && user.getNickname().toLowerCase().contains(q))
                || (user.getEmail() != null && user.getEmail().toLowerCase().contains(q));
    }
    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}