package com.crochet.ai.userservice.repository;

import com.crochet.ai.userservice.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);
    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
}
