package com.cssweng.reportbuilder.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.repository.AppUserRepository;
import com.cssweng.reportbuilder.util.JwtUtil;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AppUserRepository userRepository; 
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(AppUserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        // 1. Grab 'username' OR 'email' from the incoming Postman JSON
        String identifier = credentials.get("username") != null ? credentials.get("username") : credentials.get("email");
        String password = credentials.get("password");

        if (identifier == null || identifier.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username or email is required."));
        }

        // 2. Query the database checking BOTH fields for that identifier
        Optional<AppUser> userOptional = userRepository.findByNameOrEmail(identifier, identifier);

        // 3. Verify the password if the user was found
        if (userOptional.isPresent() && passwordEncoder.matches(password, userOptional.get().getPassword())) {
            
            AppUser user = userOptional.get();
            // Use their email as the subject string for the token passport
            String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

            return ResponseEntity.ok(Map.of(
                "status", 200,
                "message", "Login successful!",
                "token", token
            ));
        }

        // 4. Return 401 if unauthorized
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
            "status", 401,
            "error", "Unauthorized",
            "message", "Invalid username or password credentials supplied."
        ));
    }
}