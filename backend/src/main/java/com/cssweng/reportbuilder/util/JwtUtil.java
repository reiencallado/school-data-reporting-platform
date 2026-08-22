package com.cssweng.reportbuilder.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    // Minimum 256-bit (32+ character) static secret key for HMAC-SHA256
    private static final String SECRET_STRING = "edusuite_reporting_system_secure_jwt_secret_key_2026_production";
    private final SecretKey secretKey = Keys.hmacShaKeyFor(SECRET_STRING.getBytes(StandardCharsets.UTF_8));
    private final long expirationTime = 1000 * 60 * 60 * 2; // 2 hours

    public SecretKey getSecretKey() {
        return this.secretKey;
    }

    /**
     * Generates a JWT token for a user with basic role context.
     *
     * @param username the authenticated user's identifier
     * @param role     the authority or role assigned to the user
     * @return         the signed JWT string
     */
    public String generateToken(String username, String role) {
        return generateToken(username, role, null, null);
    }

    /**
     * Generates a JWT token for a user including school-specific context.
     *
     * @param username the authenticated user's identifier
     * @param role     the authority or role assigned to the user
     * @param schoolId the associated school ID for scoped role enforcement
     * @return         the signed JWT string
     */
    public String generateToken(String username, String role, String schoolId) {
        return generateToken(username, role, schoolId, null);
    }

    /**
     * Generates a featured JWT token including role, school scope, display name, 
     * and derived tenant metadata.
     * 
     * Side effects: Determines and adds a tenantId claim based on the provided role 
     *               string prior to token generation.
     *
     * @param username the authenticated user's identifier
     * @param role     the authority or role assigned to the user
     * @param schoolId the associated school ID for scoped role enforcement
     * @param name     the display name for frontend convenience
     * @return         the signed JWT string
     */
    public String generateToken(String username, String role, String schoolId, String name) {
        // Guarantee role has 'ROLE_' prefix when stored in claims
        String formattedRole = (role != null && !role.startsWith("ROLE_")) ? "ROLE_" + role : role;

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", formattedRole);
        claims.put("schoolId", schoolId);
        claims.put("name", name);

        if (formattedRole != null && formattedRole.contains("SCHOOL_ADMIN")) {
            claims.put("tenantId", "school-cluster-alpha");
        } else if (formattedRole != null && formattedRole.contains("ADMIN")) {
            claims.put("tenantId", "global-system-tenant");
        } else {
            claims.put("tenantId", "read-only-sandbox");
        }

        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(secretKey)
                .compact();
    }
}