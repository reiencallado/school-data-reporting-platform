package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.model.School;
import com.cssweng.reportbuilder.repository.AppUserRepository;
import com.cssweng.reportbuilder.repository.SchoolRepository;
import com.cssweng.reportbuilder.util.AuthUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final AppUserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminController(AppUserRepository userRepository, SchoolRepository schoolRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.schoolRepository = schoolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // GET http://localhost:8080/api/admin/users
    // Lists every user so the Users page can actually populate its table.
    // Passwords are never included in the response.
    @GetMapping("/users")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        List<Map<String, Object>> response = userRepository.findAll().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // POST http://localhost:8080/api/admin/users
    @PostMapping("/users")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> createAdminUser(@RequestBody AppUser user) {
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
        }

        // Hash the raw password before it touches the database
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // The frontend only sends { id: schoolId } - resolve the real School
        // entity so the relationship (and school name on read) is correct.
        if (user.getSchool() != null && user.getSchool().getId() != null) {
            School school = schoolRepository.findById(user.getSchool().getId()).orElse(null);
            user.setSchool(school);
        }

        AppUser savedUser = userRepository.save(user);
        return ResponseEntity.ok(toUserResponse(savedUser));
    }

    // PUT http://localhost:8080/api/admin/users/{id}
    // Edits an existing user. Password is optional - only updated if a new
    // non-blank value is sent, so editing a user doesn't force a password reset.
    @PutMapping("/users/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> updateAdminUser(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        Optional<AppUser> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        AppUser user = userOpt.get();

        if (updates.get("name") instanceof String name && !name.isBlank()) {
            user.setName(name);
        }
        if (updates.get("email") instanceof String email && !email.isBlank()) {
            user.setEmail(email);
        }
        if (updates.get("role") instanceof String role && !role.isBlank()) {
            user.setRole(role);
        }
        if (updates.get("schoolId") instanceof String schoolIdStr && !schoolIdStr.isBlank()) {
            School school = schoolRepository.findById(UUID.fromString(schoolIdStr)).orElse(null);
            user.setSchool(school);
        }
        if (updates.get("password") instanceof String password && !password.isBlank()) {
            user.setPassword(passwordEncoder.encode(password));
        }

        AppUser savedUser = userRepository.save(user);
        return ResponseEntity.ok(toUserResponse(savedUser));
    }

    // DELETE http://localhost:8080/api/admin/users/{id}
    // Blocks an admin from deleting their own account server-side.
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> deleteAdminUser(@PathVariable UUID id) {
        Optional<AppUser> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        AppUser user = userOpt.get();

        String currentEmail = AuthUtil.getCurrentUsername();
        if (currentEmail != null && currentEmail.equalsIgnoreCase(user.getEmail())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You can't delete your own account"));
        }

        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Shared response shape - never leaks the password hash.
    private Map<String, Object> toUserResponse(AppUser user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole());
        map.put("schoolId", user.getSchool() != null ? user.getSchool().getId() : null);
        map.put("schoolName", user.getSchool() != null ? user.getSchool().getName() : null);
        return map;
    }
}