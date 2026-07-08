package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.Hook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HookRepository extends JpaRepository<Hook, Long> {
}
