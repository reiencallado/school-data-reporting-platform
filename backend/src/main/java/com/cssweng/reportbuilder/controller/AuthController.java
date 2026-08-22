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

    /**
     * Authenticates a user based on their provided username and password, 
     * issuing a JWT token upon success.
     * 
     * Side effects: Queries the database for user credentials and generates 
     *               a JWT token.
     *
     * @param credentials a Map containing the login payload
     * @return a JSON response containing the HTTP status and JWT token on 
     *         success, or an error message on failure.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        // Grab username or email from the incoming Postman JSON
        String identifier = credentials.get("username") != null ? credentials.get("username") : credentials.get("email");
        String password = credentials.get("password");

        if (identifier == null || identifier.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username or email is required."));
        }

        // Query the database checking both fields for that identifier
        Optional<AppUser> userOptional = userRepository.findByNameOrEmail(identifier, identifier);

        // Verify the password if the user was found
        if (userOptional.isPresent() && passwordEncoder.matches(password, userOptional.get().getPassword())) {
            
            AppUser user = userOptional.get();

            // School id is null for roles that aren't school-scoped (e.g. ROLE_ADMIN
            // users may not have a school set); JwtUtil handles a null schoolId fine.
            String schoolId = user.getSchool() != null ? user.getSchool().getId().toString() : null;

            // Use their email as the subject string for the token passport
            String token = jwtUtil.generateToken(user.getEmail(), user.getRole(), schoolId, user.getName());

            return ResponseEntity.ok(Map.of(
                "status", 200,
                "message", "Login successful!",
                "token", token
            ));
        }

        // Return 401 if unauthorized
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
            "status", 401,
            "error", "Unauthorized",
            "message", "Invalid username or password credentials supplied."
        ));
    }
}