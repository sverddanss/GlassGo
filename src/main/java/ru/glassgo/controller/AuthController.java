package ru.glassgo.controller;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.glassgo.dto.*;
import ru.glassgo.model.User;
import ru.glassgo.service.JwtService;
import ru.glassgo.service.UserService;
import java.util.HashMap;
import java.util.Map;
@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {
    private final UserService userService;
    private final JwtService jwtService;
    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            User user = userService.register(
                    request.getEmail(),
                    request.getNickname(),
                    request.getFirstName(),
                    request.getLastName(),
                    request.getPassword()
            );
            response.put("message", "Регистрация прошла успешно");
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            response.put("nickname", user.getNickname());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        }
    }
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Map<String, Object> errorResponse = new HashMap<>();
        if (!userService.authenticate(request.getEmail(), request.getPassword())) {
            errorResponse.put("message", "Неверный email или пароль");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        User user = userService.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            errorResponse.put("message", "Пользователь не найден");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        UserDto userDto = UserDto.fromEntity(user);
        return ResponseEntity.ok(new LoginResponse(accessToken, refreshToken, userDto));
    }
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request) {
        Map<String, Object> errorResponse = new HashMap<>();
        String refreshToken = request.getRefreshToken();
        if (!jwtService.validateToken(refreshToken)) {
            errorResponse.put("message", "Недействительный или просроченный refresh token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        Long userId = jwtService.extractUserId(refreshToken);
        User user = userService.findById(userId).orElse(null);
        if (user == null) {
            errorResponse.put("message", "Пользователь не найден");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);
        Map<String, String> response = new HashMap<>();
        response.put("accessToken", newAccessToken);
        response.put("refreshToken", newRefreshToken);
        return ResponseEntity.ok(response);
    }
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Выход выполнен успешно");
        return ResponseEntity.ok(response);
    }
}