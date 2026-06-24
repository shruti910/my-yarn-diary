package com.crochet.ai.crochetservice.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ProjectStatus {
    PLANNING("Planning"),
    IN_PROGRESS("In Progress"),
    COMPLETED("Completed"),
    ON_HOLD("On Hold");

    private final String value;

    ProjectStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ProjectStatus fromValue(String value) {
        if (value == null) {
            return IN_PROGRESS;
        }
        return switch (value.toLowerCase().trim()) {
            case "planning" -> PLANNING;
            case "in progress", "in_progress", "inprogress" -> IN_PROGRESS;
            case "completed" -> COMPLETED;
            case "on hold", "on_hold", "onhold" -> ON_HOLD;
            default -> {
                for (ProjectStatus status : ProjectStatus.values()) {
                    if (status.name().equalsIgnoreCase(value)) {
                        yield status;
                    }
                }
                yield IN_PROGRESS;
            }
        };
    }
}
