package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.repository.AppUserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminController(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/users")
    public ResponseEntity<?> createAdminUser(@RequestBody AppUser user) {
        // 1. Hash the raw password from Postman before it touches the database!
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        // 2. Save the user using the repository you already built
        AppUser savedUser = userRepository.save(user);
        
        // 3. Return a success message
        return ResponseEntity.ok(Map.of(
            "status", 200,
            "message", "Admin user created successfully!",
            "userId", savedUser.getId()
        ));
    }
}