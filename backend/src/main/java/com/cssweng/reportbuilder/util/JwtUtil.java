package com.cssweng.reportbuilder.util;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Jwts;

@Component
public class JwtUtil {

    // Type-safe, non-deprecated key builder for JWT 0.12.x+
    private final SecretKey secretKey = Jwts.SIG.HS256.key().build();
    private final long expirationTime = 1000 * 60 * 60 * 2; // 2 hours

    // getter so authentication filter can access the secure key for verification
    public SecretKey getSecretKey() {
        return this.secretKey;
    }

    public String generateToken(String username, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        
        // ISOLATE TENANT METADATA
        if (role.contains("SCHOOL_ADMIN")) {
            claims.put("tenantId", "school-cluster-alpha");
        } else if (role.contains("ADMIN")) {
            claims.put("tenantId", "global-system-tenant");
        } else {
            claims.put("tenantId", "read-only-sandbox");
        }

        // Modern API chaining style without deprecated methods
        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(secretKey) // Automatically pairs with HS256 algorithm characteristics
                .compact();
    }
}