package ru.glassgo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.glassgo.model.User;

import java.util.Optional;

/**
 * Репозиторий для работы с сущностью User.
 * Поддерживает поиск по email и nickname.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Находит пользователя по email.
     */
    Optional<User> findByEmail(String email);

    /**
     * Находит пользователя по nickname.
     */
    Optional<User> findByNickname(String nickname);

    /**
     * Проверяет, существует ли пользователь с указанным email.
     */
    boolean existsByEmail(String email);

    /**
     * Проверяет, существует ли пользователь с указанным nickname.
     */
    boolean existsByNickname(String nickname);
}
