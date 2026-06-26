package com.crochet.ai.crochetservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SoftDelete;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_yarns")
@SoftDelete(columnName = "is_deleted")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectYarnEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_pk_id", nullable = false)
    @JsonIgnore
    private ProjectEntity project;

    @Column(name = "brand", length = 255)
    private String brand;

    @Column(name = "line_name", length = 255)
    private String lineName;

    @Column(name = "colorway", length = 30)
    private String colorway;

    @Column(name = "dye_lot", length = 255)
    private String dyeLot;

    @Column(name = "yarn_weight", length = 30)
    private String weight;

    @Column(name = "fiber_content", columnDefinition = "TEXT")
    private String fiberContent;

    @Column(name = "quantity_used")
    private Double quantityUsed;

    @Column(name = "unit", nullable = false, length = 30)
    @Builder.Default
    private String unit = "meters";

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

}
