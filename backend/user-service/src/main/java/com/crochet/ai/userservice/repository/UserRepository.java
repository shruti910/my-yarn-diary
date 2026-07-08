package com.crochet.ai.userservice.repository;

import com.crochet.ai.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @Query(value = "SELECT EXISTS(SELECT 1 FROM users WHERE user_id = :userId)", nativeQuery = true)
    boolean existsByUserIdIncludeDeactivated(@Param("userId") UUID userId);

    @Query(value = "SELECT EXISTS(SELECT 1 FROM users WHERE email = :email)", nativeQuery = true)
    boolean existsByEmailIncludeDeactivated(@Param("email") String email);

    @Modifying
    @Query(value = "UPDATE users SET is_active = true WHERE user_id = :userId", nativeQuery = true)
    void reactivateUser(@Param("userId") UUID userId);

    @Modifying
    @Query(value = "UPDATE users SET is_active = true WHERE email = :email", nativeQuery = true)
    void reactivateUserByEmail(@Param("email") String email);
}
