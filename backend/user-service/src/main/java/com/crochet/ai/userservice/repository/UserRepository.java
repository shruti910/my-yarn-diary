package com.crochet.ai.userservice.repository;

import com.crochet.ai.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUserIdAndActiveTrue(UUID userId);

    Optional<User> findByEmailAndActiveTrue(String email);

    Optional<User> findByUserId(UUID userId);

    Optional<User> findByEmail(String email);

    boolean existsByUserIdAndActiveTrue(UUID userId);

    boolean existsByEmailAndActiveTrue(String email);

    boolean existsByUserId(UUID userId);

    boolean existsByEmail(String email);
}
