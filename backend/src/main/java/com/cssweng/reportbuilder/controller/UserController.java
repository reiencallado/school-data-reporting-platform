package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.repository.AppUserRepository;
import com.cssweng.reportbuilder.service.StorageService;
import com.cssweng.reportbuilder.util.AuthUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final AppUserRepository appUserRepository;
    private final StorageService storageService;

    public UserController(AppUserRepository appUserRepository, StorageService storageService) {
        this.appUserRepository = appUserRepository;
        this.storageService = storageService;
    }

    // GET http://localhost:8080/api/users/me
    // Returns the currently authenticated user's own profile, including
    // their per-user branding logo. Note: password is deliberately never
    // included in this response.
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        AppUser user = findCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // HashMap instead of Map.of(...) since school/logoUrl can be null,
        // and Map.of() throws a NullPointerException on any null value.
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        response.put("schoolId", user.getSchool() != null ? user.getSchool().getId() : null);
        response.put("schoolName", user.getSchool() != null ? user.getSchool().getName() : null);
        response.put("logoUrl", user.getLogoUrl());

        return ResponseEntity.ok(response);
    }

    // POST http://localhost:8080/api/users/me/logo
    // Uploads a per-user logo image via StorageService (S3/LocalStack),
    // same pattern as ReportTemplateController's thumbnail upload.
    @PostMapping("/me/logo")
    public ResponseEntity<?> uploadLogo(@RequestParam("file") MultipartFile file) {
        AppUser user = findCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String url = storageService.uploadFileAndGetUrl(file, "logos/");
            user.setLogoUrl(url);
            appUserRepository.save(user);
            return ResponseEntity.ok(Map.of("logoUrl", url));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload logo"));
        }
    }

    private AppUser findCurrentUser() {
        String email = AuthUtil.getCurrentUsername();
        if (email == null) return null;
        Optional<AppUser> userOpt = appUserRepository.findByNameOrEmail(email, email);
        return userOpt.orElse(null);
    }
}