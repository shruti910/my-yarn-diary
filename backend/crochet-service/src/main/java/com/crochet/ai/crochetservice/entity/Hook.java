package com.crochet.ai.crochetservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SoftDelete;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_hooks")
@SoftDelete(columnName = "is_deleted")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_pk_id", nullable = false)
    @JsonIgnore
    private Project project;

    @Column(name = "size_mm")
    private Double sizeMm;

    @Column(name = "size_us", length = 30)
    private String sizeUs;

    @Column(name = "material", length = 255)
    private String material;

    @Column(name = "brand", length = 255)
    private String brand;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
