package com.cssweng.reportbuilder.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cssweng.reportbuilder.util.JwtUtil;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        try {
            // 1. Fetch the user details from hardcoded store
            UserDetails user = userDetailsService.loadUserByUsername(username);

            // 2. Verify if the raw password matches hashed password
            if (passwordEncoder.matches(password, user.getPassword())) {
                
                // 3. Extract the primary role string (e.g., ROLE_ADMIN)
                String role = user.getAuthorities().iterator().next().getAuthority();
                
                // 4. Generate signed JWT token
                String token = jwtUtil.generateToken(username, role);

                return ResponseEntity.ok(Map.of(
                    "status", 200,
                    "message", "Login successful!",
                    "token", token
                ));
            }
        } catch (UsernameNotFoundException e) {
            // Fall through to unauthorized block
        }

        // 401 UNAUTHORIZED: Match the acceptance criteria requirements exactly
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
            "status", 401,
            "error", "Unauthorized",
            "message", "Invalid username or password credentials supplied."
        ));
    }
}