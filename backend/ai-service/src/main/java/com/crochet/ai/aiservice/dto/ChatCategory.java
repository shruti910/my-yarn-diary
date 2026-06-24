package com.crochet.ai.aiservice.dto;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ChatCategory {
    CROCHET_BUDDY("crochet-buddy"),
    PATTERN_DECODER("pattern-decoder"),
    REVERSE_ENGINEER("reverse-engineer"),
    IMAGE_GENERATOR("image-generator"),
    CROCHET_TUTOR("crochet-tutor");

    private final String value;

    ChatCategory(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static ChatCategory fromString(String text) {
        for (ChatCategory c : ChatCategory.values()) {
            if (c.value.equalsIgnoreCase(text)) {
                return c;
            }
        }
        throw new IllegalArgumentException("Unknown category: " + text);
    }
}
