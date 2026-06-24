package com.crochet.ai.userservice.dto;

import com.crochet.ai.userservice.entity.MembershipStatus;

public record MembershipUpdateRequest(
    MembershipStatus membershipStatus,
    boolean active
) {
    public MembershipStatus getMembershipStatus() { return membershipStatus; }
    public boolean isActive() { return active; }
}
