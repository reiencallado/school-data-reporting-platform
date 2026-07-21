package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cssweng.reportbuilder.model.AppUser;

import java.util.UUID;
import java.util.List;
import java.util.Optional; // Added for safe null-handling on login lookup

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    
    List<AppUser> findBySchoolId(UUID schoolId);

    // ADDED: Crucial for backend JWT authentication/login verification
    Optional<AppUser> findByNameOrEmail(String name, String email);

    Optional<AppUser> findByEmail(String username);
}