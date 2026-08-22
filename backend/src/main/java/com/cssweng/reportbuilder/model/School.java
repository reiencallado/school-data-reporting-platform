// uses uuid generator for uuid still
package com.cssweng.reportbuilder.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator; // Change uuid_generator to what ever fits

/**
 * Represents a school within the report generation system.
 * Stores basic school information used to associate users,
 * students, and report templates.
 */
@Entity
@Table(name = "schools")
public class School {

    @Id
    @GeneratedValue 
    @UuidGenerator 
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "is_active")
    private boolean isActive = true;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Constructors
    public School() {}

    public School(UUID id, String name, String code) {
        this.id = id;
        this.name = name;
        this.code = code;
    }

    public School(String name) {
        this.name = name;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}