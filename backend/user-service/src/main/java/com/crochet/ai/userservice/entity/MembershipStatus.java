package com.crochet.ai.userservice.entity;

public enum MembershipStatus {
    FREE,
    GOLDEN_HOOK,
    PLATINUM_YARN;

    public static MembershipStatus fromValue(String value) {
        if (value == null) {
            return FREE;
        }
        for (MembershipStatus status : MembershipStatus.values()) {
            if (status.name().equalsIgnoreCase(value) || value.replace(" ", "_").equalsIgnoreCase(status.name())) {
                return status;
            }
        }
        return FREE;
    }
}
