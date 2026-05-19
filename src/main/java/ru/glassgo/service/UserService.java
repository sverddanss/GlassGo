package ru.glassgo.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.glassgo.model.User;
import ru.glassgo.repository.UserRepository;

import java.util.Optional;

/**
 * Сервис для управления пользователями: регистрация, поиск.
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Регистрирует нового пользователя.
     *
     * @param email      email пользователя
     * @param nickname   никнейм пользователя
     * @param firstName  имя пользователя
     * @param lastName   фамилия пользователя (опционально)
     * @param rawPassword пароль в открытом виде
     * @return сохранённый пользователь
     * @throws IllegalArgumentException если email или nickname уже заняты
     */
    @Transactional
    public User register(String email, String nickname, String firstName, String lastName, String rawPassword) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Пользователь с таким email уже существует");
        }
        if (nickname != null && userRepository.existsByNickname(nickname)) {
            throw new IllegalArgumentException("Пользователь с таким никнеймом уже существует");
        }

        User user = new User();
        user.setEmail(email);
        user.setNickname(nickname);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setEmailConfirmed(false);

        return userRepository.save(user);
    }

    /**
     * Находит пользователя по email.
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Находит пользователя по ID.
     */
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public boolean authenticate(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .map(user -> passwordEncoder.matches(rawPassword, user.getPasswordHash()))
                .orElse(false);
    }

    @Transactional
    public User updateProfile(Long userId, String firstName, String lastName, String nickname) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        if (nickname != null && !nickname.equals(user.getNickname())) {
            if (userRepository.existsByNickname(nickname)) {
                throw new IllegalArgumentException("Никнейм уже занят");
            }
        }
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setNickname(nickname);
        return userRepository.save(user);
    }
    @Transactional
    public User uploadAvatar(Long userId, String avatarPath) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        user.setAvatar(avatarPath);
        return userRepository.save(user);
    }
}
