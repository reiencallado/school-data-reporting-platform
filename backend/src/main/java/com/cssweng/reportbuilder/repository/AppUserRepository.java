package com.cssweng.reportbuilder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cssweng.reportbuilder.model.AppUser;

import java.util.UUID;
import java.util.List;
import java.util.Optional; 

/**
 * Provides database access operations for AppUser entities.
 */
@Repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    /**
     * Retrieves all users belonging to a specific school.
     *
     * @param schoolId the unique identifier of the school
     * @return a list of users associated with the school
     */
    List<AppUser> findBySchoolId(UUID schoolId);

    /**
     * Retrieves all users with a matching name or email.
     * 
     * Crucial for backend JWT authentication and login verification.
     *
     * @param name the user's username
     * @param email the user's email address
     * @return the matching user, if found
     */
    Optional<AppUser> findByNameOrEmail(String name, String email);

    /**
     * Retrieves a user by their email address.
     *
     * @param username the user's email address
     * @return the matching user, if found
     */
    Optional<AppUser> findByEmail(String username);
}