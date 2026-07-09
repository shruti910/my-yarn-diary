package com.crochet.ai.crochetservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Slf4j
@Component
@Order(1)
public class GatewayTrustFilter implements Filter {

    private final SecretKey secretKey;

    public GatewayTrustFilter(@Value("${internal.jwt.secret}") String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize GatewayTrustFilter key material", e);
        }
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        if ("/actuator/health".equals(path) || "/health".equals(path) || path.startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        String forwardedIdentity = httpRequest.getHeader("X-Forwarded-Identity");
        if (forwardedIdentity == null || forwardedIdentity.isBlank()) {
            log.error("Access Forbidden: Missing critical X-Forwarded-Identity header for request to: {}", path);
            httpResponse.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Forbidden: Request must originate from API Gateway.");
            return;
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(forwardedIdentity)
                    .getPayload();

            String userId = claims.getSubject();
            String email = claims.get("email", String.class);
            String name = claims.get("name", String.class);
            String picture = claims.get("picture", String.class);

            chain.doFilter(new HttpServletRequestWrapper(httpRequest, userId, email, name, picture), response);

        } catch (Exception ex) {
            log.error("Access Forbidden: Failed to verify X-Forwarded-Identity header signature: {}", ex.getMessage());
            httpResponse.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Forbidden: Cryptographic signature mismatch or token expired.");
        }
    }

    private static class HttpServletRequestWrapper extends jakarta.servlet.http.HttpServletRequestWrapper {
        private final String userId;
        private final String email;
        private final String name;
        private final String picture;

        public HttpServletRequestWrapper(HttpServletRequest request, String userId, String email, String name, String picture) {
            super(request);
            this.userId = userId;
            this.email = email;
            this.name = name;
            this.picture = picture;
        }

        @Override
        public String getHeader(String nameHeader) {
            if ("x-user-id".equalsIgnoreCase(nameHeader)) {
                return userId;
            }
            if ("x-user-email".equalsIgnoreCase(nameHeader)) {
                return email;
            }
            if ("x-user-name".equalsIgnoreCase(nameHeader)) {
                return name;
            }
            if ("x-user-profile-picture".equalsIgnoreCase(nameHeader)) {
                return picture;
            }
            return super.getHeader(nameHeader);
        }
    }
}
