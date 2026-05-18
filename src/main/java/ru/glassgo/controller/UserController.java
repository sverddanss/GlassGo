package ru.glassgo.controller;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.glassgo.dto.UserDto;
import ru.glassgo.model.User;
import ru.glassgo.repository.UserRepository;
import ru.glassgo.service.UserService;
import java.util.List;
import java.util.stream.Collectors;
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;
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
}