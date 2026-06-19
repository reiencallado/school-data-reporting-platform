package com.cssweng.reportbuilder.controller;

import io.jsonwebtoken.Claims;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        // Grab the authenticated user from the current session context
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Extract the parsed JWT claims we stored in our filter
        Claims claims = (Claims) authentication.getDetails();
        String tenantId = claims.get("tenantId", String.class);
        String role = claims.get("role", String.class);

        // Return the profile payload with isolated tenant metadata
        return ResponseEntity.ok(Map.of(
            "status", 200,
            "username", authentication.getName(),
            "role", role,
            "tenantMetadata", Map.of(
                "tenantId", tenantId,
                "scope", role.equals("ROLE_ADMIN") ? "Global Access" : "Restricted Cluster"
            )
        ));
    }
}