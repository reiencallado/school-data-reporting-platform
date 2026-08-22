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

    /**
     * Retrieves a complete list of all users registered in the system.
     * 
     * Side effects: Queries the database for all user records and maps them to a secure 
     *               response format that excludes sensitive data like passwords.
     *
     * @return a JSON response containing the list of all users.
     */
    @GetMapping("/users")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        List<Map<String, Object>> response = userRepository.findAll().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Creates a new administrative user in the system.
     * 
     * Side effects: Hashes the provided raw password for security and 
     *               persists the new user record to the database.
     *
     * @param user the AppUser object containing the new admin's details
     * @return a structured JSON response
     */
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

    /**
     * Updates the details of an existing user based on a payload.
     * 
     * Side effects: Queries the database, optionally hashes a new password, resolves 
     *               any updated school associations, and persists the modified user record 
     *               to the database.
     *
     * @param id      the UUID of the user to update
     * @param updates a map containing the fields to be updated
     * @return a JSON response containing the updated user details or a 404 Not Found if the user does not exist.
     */
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

    /**
     * Deletes a user record from the system, enforcing a safeguard that prevents the 
     * currently authenticated admin from deleting their own account.
     * 
     * Side effects: Queries the database, evaluates the current security context to check 
     *               the safeguard, and permanently removes the user record from the database.
     *
     * @param id yhe UUID of the user to delete
     * @return a 204 No Content response on successful deletion, a 404 if the user is missing, 
     *         or a 403 Forbidden if the admin attempts to delete themselves.
     */
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