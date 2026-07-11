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

    /**
     * Overload kept for backward compatibility with any existing callers
     * that don't have a school context (e.g. a global ADMIN with no school).
     */
    public String generateToken(String username, String role) {
        return generateToken(username, role, null);
    }

    /**
     * @param schoolId the AppUser's associated school id, used for
     *                 school-scoped role enforcement (ROLE_K12, ROLE_COLLEGE,
     *                 ROLE_ADMISSIONS). Pass null for roles that aren't
     *                 school-scoped (e.g. ROLE_ADMIN).
     */
    public String generateToken(String username, String role, String schoolId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("schoolId", schoolId);

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