package com.crochet.ai.gateway.filter;

import com.google.api.core.ApiFuture;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.crochet.ai.gateway.util.TokenProvider;
import com.crochet.ai.gateway.util.UuidGenerator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.concurrent.Executor;
import java.util.concurrent.ForkJoinPool;

@Slf4j
@Component
public class FirebaseAuthenticationFilter extends AbstractGatewayFilterFactory<FirebaseAuthenticationFilter.Config> {

    private final TokenProvider tokenProvider;
    private final Executor executor = ForkJoinPool.commonPool();

    public FirebaseAuthenticationFilter(TokenProvider tokenProvider) {
        super(Config.class);
        this.tokenProvider = tokenProvider;
    }

    public static class Config {
        // No custom config parameters needed currently
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("Authentication failure: Authorization header missing or invalid for path: {}", request.getPath());
                return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization challenge failed. Bearer token missing."));
            }

            String token = authHeader.substring(7);

            // Wrap Firebase SDK's asynchronous ApiFuture in a reactive Mono using Mono.create
            return Mono.<FirebaseToken>create(sink -> {
                try {
                    ApiFuture<FirebaseToken> future = FirebaseAuth.getInstance().verifyIdTokenAsync(token);
                    future.addListener(() -> {
                        try {
                            FirebaseToken firebaseToken = future.get();
                            sink.success(firebaseToken);
                        } catch (Exception e) {
                            sink.error(e);
                        }
                    }, executor);
                } catch (Exception ex) {
                    sink.error(ex);
                }
            })
            .flatMap(decodedToken -> {
                String firebaseUid = decodedToken.getUid();
                String email = decodedToken.getEmail();
                String name = decodedToken.getName();
                String picture = decodedToken.getPicture();
                
                // Map Firebase UID to standardized UUID
                String standardizedUserId = UuidGenerator.getUuidFromFirebaseUid(firebaseUid);

                // Generate signed downstream handoff token containing original firebaseUid
                String internalJwt = tokenProvider.createToken(standardizedUserId, email, name, picture, firebaseUid);

                // Inject headers to request
                ServerHttpRequest mutatedRequest = request.mutate()
                        .header("X-User-Id", standardizedUserId)
                        .header("X-User-Email", email != null ? email : "")
                        .header("X-User-Name", name != null ? name : "")
                        .header("X-User-Profile-Picture", picture != null ? picture : "")
                        .header("X-Firebase-Uid", firebaseUid)
                        .header("X-Forwarded-Identity", internalJwt)
                        .build();

                return chain.filter(exchange.mutate().request(mutatedRequest).build());
            })
            .onErrorResume(ex -> {
                log.error("Authentication security block: Firebase token verification failed: {}", ex.getMessage());
                return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication challenge failed. Token is invalid or expired."));
            });
        };
    }
}
