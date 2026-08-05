package com.cssweng.reportbuilder.config;

import com.cssweng.reportbuilder.model.AppUser;
import com.cssweng.reportbuilder.model.School;
import com.cssweng.reportbuilder.repository.AppUserRepository;
import com.cssweng.reportbuilder.repository.SchoolRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class DataInitializer implements CommandLineRunner {

    private final AppUserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(AppUserRepository userRepository, 
                           SchoolRepository schoolRepository, 
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.schoolRepository = schoolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            // 1. Seed or retrieve School 1
            UUID school1Id = UUID.fromString("11111111-1111-1111-1111-111111111111");
            School school1 = schoolRepository.findByCode("K12-ACAD")
                .orElseGet(() -> {
                    School s = new School(school1Id, "EduSuite K-12 Academy", "K12-ACAD");
                    return schoolRepository.save(s);
                });

            // 2. Seed or retrieve School 2
            UUID school2Id = UUID.fromString("22222222-2222-2222-2222-222222222222");
            schoolRepository.findByCode("ESU")
                .orElseGet(() -> {
                    School s = new School(school2Id, "EduSuite State University", "ESU");
                    return schoolRepository.save(s);
                });

            // 3. Seed Default Admin User if missing
            String adminEmail = "seed.admin@edusuite.com";
            if (userRepository.findByNameOrEmail(adminEmail, adminEmail).isEmpty()) {
                AppUser admin = new AppUser();
                admin.setName("Seed Admin");
                admin.setEmail(adminEmail);
                admin.setPassword(passwordEncoder.encode("Admin123!"));
                admin.setRole("ROLE_ADMIN");
                admin.setSchool(school1);

                userRepository.save(admin);
                System.out.println("INITIAL DATA CHECK COMPLETE");
            }
        } catch (Exception e) {
            System.err.println("DATA INITIALIZER WARNING: " + e.getMessage());
            // Log warning without crashing application startup
        }
    }
}