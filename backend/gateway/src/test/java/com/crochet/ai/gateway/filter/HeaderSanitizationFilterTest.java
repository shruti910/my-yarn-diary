package com.crochet.ai.gateway.filter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HeaderSanitizationFilterTest {

    private final HeaderSanitizationFilter filter = new HeaderSanitizationFilter();

    @Test
    @DisplayName("TC-10.1: HeaderSanitizationFilter strips spoofed X-User-* and internal identity headers")
    void shouldStripSpoofedHeaders() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/projects")
                .header("X-User-Id", "attacker-impersonated-uuid")
                .header("X-User-Email", "admin@myyarndiary.com")
                .header("X-User-Name", "Admin")
                .header("X-Firebase-Uid", "attacker-fb-uid")
                .header("X-Forwarded-Identity", "fake-jwt-token")
                .header("Authorization", "Bearer valid-token")
                .build();

        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);

        when(chain.filter(any(ServerWebExchange.class))).thenAnswer(invocation -> {
            ServerWebExchange mutatedExchange = invocation.getArgument(0);
            var headers = mutatedExchange.getRequest().getHeaders();

            // Assert that all blacklisted identity headers have been stripped
            assertFalse(headers.containsKey("x-user-id"));
            assertFalse(headers.containsKey("x-user-email"));
            assertFalse(headers.containsKey("x-user-name"));
            assertFalse(headers.containsKey("x-firebase-uid"));
            assertFalse(headers.containsKey("x-forwarded-identity"));

            // Legitimate headers should be preserved
            assertTrue(headers.containsKey("authorization"));
            return Mono.empty();
        });

        filter.filter(exchange, chain).block();
    }
}
