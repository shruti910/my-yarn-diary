package com.crochet.ai.crochetservice.repository;

import com.crochet.ai.crochetservice.entity.Yarn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface YarnRepository extends JpaRepository<Yarn, Long> {
}
