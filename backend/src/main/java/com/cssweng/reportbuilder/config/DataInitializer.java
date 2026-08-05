package com.cssweng.reportbuilder.config;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.repository.AppUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        String adminEmail = "seed.admin@edusuite.com";

        // Check if the default admin account already exists in PostgreSQL
        if (appUserRepository.findByNameOrEmail(adminEmail, adminEmail).isEmpty()) {
            AppUser admin = new AppUser();
            admin.setName("Super Admin");
            admin.setEmail(adminEmail);
            // Hash password securely with BCrypt before saving
            admin.setPassword(passwordEncoder.encode("Admin123!"));
            admin.setRole("ROLE_ADMIN");

            appUserRepository.save(admin);
            System.out.println("ADMIN USER SEEDED INTO POSTGRESQL (" + adminEmail + ")");
        } else {
            System.out.println("Admin account already exists in PostgreSQL. Skipping seed.");
        }
    }
}