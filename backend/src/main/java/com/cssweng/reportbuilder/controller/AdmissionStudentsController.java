package com.cssweng.reportbuilder.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cssweng.reportbuilder.model.AdmissionStudents;
import com.cssweng.reportbuilder.repository.AdmissionStudentsRepository;

import java.util.List;
import java.util.UUID;
/**
 * Handles HTTP requests related to admission student records.
 * Provides endpoints for creating, retrieving, updating, and deleting
 * admission students.
 */
@RestController
@RequestMapping("/api/admission-students")
@CrossOrigin(origins = "*")
public class AdmissionStudentsController {

    private final AdmissionStudentsRepository admissionStudentsRepository;

    public AdmissionStudentsController(AdmissionStudentsRepository admissionStudentsRepository) {
        this.admissionStudentsRepository = admissionStudentsRepository;
    }

    // GET http://localhost:8080/api/admission-students
    /**
     * Retrieves all admission students.
     *
     * @return a list of all admission students
     */
    @GetMapping
    public ResponseEntity<List<AdmissionStudents>> getAllStudents() {
        return ResponseEntity.ok(admissionStudentsRepository.findAll());
    }

    // GET http://localhost:8080/api/admission-students/{id}
    /**
     * Retrieves an admission student by ID.
     *
     * @param id the ID of the admission student
     * @return the admission student if found, or 404 if not found
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdmissionStudents> getStudentById(@PathVariable UUID id) {
        return admissionStudentsRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST http://localhost:8080/api/admission-students
    /**
     * Creates a new admission student.
     *
     * @param admissionStudent the admission student to create
     * @return the saved admission student
     */
    @PostMapping
    public ResponseEntity<AdmissionStudents> createStudent(@RequestBody AdmissionStudents admissionStudent) {
        AdmissionStudents saved = admissionStudentsRepository.save(admissionStudent);
        return ResponseEntity.ok(saved);
    }

    // POST http://localhost:8080/api/admission-students/bulk
    /**
     * Creates multiple admission student records in a single request.
     *
     * This endpoint is primarily intended for testing and quickly seeding data.
     *
     * @param students the list of admission students to create
     * @return the saved admission students
     */
    @PostMapping("/bulk")
    public ResponseEntity<List<AdmissionStudents>> createStudents(@RequestBody List<AdmissionStudents> students) {
        List<AdmissionStudents> saved = admissionStudentsRepository.saveAll(students);
        return ResponseEntity.ok(saved);
    }

    // PUT http://localhost:8080/api/admission-students/{id}
    /**
     * Updates an existing admission student.
     *
     * @param id the ID of the admission student to update
     * @param admissionStudent the updated admission student information
     * @return the updated admission student, or 404 if not found
     */
    @PutMapping("/{id}")
    public ResponseEntity<AdmissionStudents> updateStudent(@PathVariable UUID id, @RequestBody AdmissionStudents admissionStudent) {
        return admissionStudentsRepository.findById(id)
                .map(existing -> {
                    existing.setFirstName(admissionStudent.getFirstName());
                    existing.setLastName(admissionStudent.getLastName());
                    existing.setHighestGradeCompleted(admissionStudent.getHighestGradeCompleted());
                    existing.setGpa(admissionStudent.getGpa());
                    existing.setGradeLevelApplied(admissionStudent.getGradeLevelApplied());
                    existing.setCourseApplied(admissionStudent.getCourseApplied());
                    existing.setStatus(admissionStudent.getStatus());
                    AdmissionStudents updated = admissionStudentsRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DEL http://localhost:8080/api/admission-students/{id}
    /**
     * Deletes an existing admission student.
     *
     * @param id the ID of the admission student to delete
     * @return the deleted admission student, or 404 if not found
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<AdmissionStudents> deleteStudent(@PathVariable UUID id) {
        return admissionStudentsRepository.findById(id)
                .map(existing -> {
                    admissionStudentsRepository.delete(existing);
                    return ResponseEntity.ok(existing);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}