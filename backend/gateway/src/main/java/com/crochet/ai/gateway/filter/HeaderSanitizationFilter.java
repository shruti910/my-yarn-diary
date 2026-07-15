package com.crochet.ai.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
public class HeaderSanitizationFilter implements GlobalFilter, Ordered {

    private static final List<String> BLACKLISTED_HEADERS = Arrays.asList(
            "x-user-id",
            "x-user-email",
            "x-user-name",
            "x-user-profile-picture",
            "x-firebase-uid",
            "x-forwarded-identity"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        
        // Mutate the request to strip any client-injected blacklisted headers
        ServerHttpRequest mutatedRequest = request.mutate()
                .headers(headers -> {
                    for (String headerName : BLACKLISTED_HEADERS) {
                        if (headers.containsKey(headerName)) {
                            log.warn("Sanitization Alert: Stripping client-supplied header '{}' from request to path '{}'", headerName, request.getPath());
                            headers.remove(headerName);
                        }
                    }
                })
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        // Run at the absolute beginning of the request processing chain
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
