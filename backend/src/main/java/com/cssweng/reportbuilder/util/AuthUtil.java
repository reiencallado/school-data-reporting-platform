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
     * Returns the current request's authenticated principal — this is the
     * email string set as the JWT subject (see AuthController.login /
     * JwtAuthenticationFilter), not a separately-stored "username" field.
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
     * @return the current user's school id, or null if they have none
     *         (e.g. a global ROLE_ADMIN account with no school set).
     */
    public static UUID getCurrentSchoolId() {
        Claims claims = getCurrentClaims();
        if (claims == null) return null;
        String schoolId = claims.get("schoolId", String.class);
        return schoolId != null ? UUID.fromString(schoolId) : null;
    }
}