package com.cssweng.reportbuilder.util;

import io.jsonwebtoken.Claims;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Reads role/school context out of the currently authenticated request.
 *
 * JwtAuthenticationFilter attaches the full parsed Claims object via
 * authentication.setDetails(claims) — this class just centralizes reading
 * that back out, so individual controllers don't each duplicate the same
 * casting/parsing logic.
 */
public final class AuthUtil {

    private AuthUtil() {}

    private static Claims getCurrentClaims() {
        Object details = SecurityContextHolder.getContext().getAuthentication().getDetails();
        if (details instanceof Claims claims) {
            return claims;
        }
        return null;
    }

    public static String getCurrentRole() {
        Claims claims = getCurrentClaims();
        return claims != null ? claims.get("role", String.class) : null;
    }

    /**
     * Retrieves the current request's authenticated principal.
     * 
     * Side effects: Reads authentication data from the SecurityContextHolder.
     *
     * @return the email of the authenticated user or null if no user is authenticated
     */
    public static String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    public static boolean isAdmin() {
        String role = getCurrentRole();
        return role != null && role.equals("ROLE_ADMIN");
    }

    /**
     * Retrieves the current user's associated school ID from the JWT claims.
     * 
     * Side effects: Reads authentication data directly from the SecurityContextHolder.
     *
     * @return the current user's school ID, or null if they have none
     */
    public static UUID getCurrentSchoolId() {
        Claims claims = getCurrentClaims();
        if (claims == null) return null;
        String schoolId = claims.get("schoolId", String.class);
        return schoolId != null ? UUID.fromString(schoolId) : null;
    }
}