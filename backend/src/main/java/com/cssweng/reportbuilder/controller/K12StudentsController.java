package com.cssweng.reportbuilder.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.cssweng.reportbuilder.model.K12Students;
import com.cssweng.reportbuilder.repository.K12StudentsRepository;
import com.cssweng.reportbuilder.util.AuthUtil;

import java.util.List;
import java.util.UUID;

/**
 * Handles HTTP requests related to K-12 student records.
 * Provides endpoints for creating, retrieving, updating, deleting,
 * and managing students while enforcing school-level access control.
 * 
 * Only ROLE_K12 and ROLE_ADMIN may touch K12 data at all. Within that,
 * ROLE_K12 users are further restricted to their own school below -
 * this annotation only gates the data *type*, not the school boundary.
 */
@RestController
@RequestMapping("/api/k12-students")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('K12') or hasRole('ADMIN')")
public class K12StudentsController {

    private final K12StudentsRepository k12StudentsRepository;

    public K12StudentsController(K12StudentsRepository k12StudentsRepository) {
        this.k12StudentsRepository = k12StudentsRepository;
    }

    // GET http://localhost:8080/api/k12-students
    /**
     * Retrieves all K-12 students.
     * ROLE_ADMIN sees all schools; ROLE_K12 only sees their own school's students.
     *
     * @return a list of accessible K-12 students, or 403 if the user's school
     *         cannot be determined
     */
    @GetMapping
    public ResponseEntity<List<K12Students>> getAllStudents() {
        if (AuthUtil.isAdmin()) {
            return ResponseEntity.ok(k12StudentsRepository.findAll());
        }
        UUID schoolId = AuthUtil.getCurrentSchoolId();
        if (schoolId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(k12StudentsRepository.findBySchoolId(schoolId));
    }

    // GET http://localhost:8080/api/k12-students/{id}
    /**
     * Retrieves a K-12 student by ID.
     * ROLE_ADMIN sees all schools; ROLE_K12 only sees their own school's students.
     *
     * @param id the ID of the student
     * @return the student if found and authorized, 403 if unauthorized,
     *         or 404 if not found
     */
    @GetMapping("/{id}")
    public ResponseEntity<K12Students> getStudentById(@PathVariable UUID id) {
        return k12StudentsRepository.findById(id)
                .map(student -> {
                    if (!isAuthorizedForSchool(student.getSchool().getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<K12Students>build();
                    }
                    return ResponseEntity.ok(student);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // GET http://localhost:8080/api/k12-students/school/{schoolId}
    /**
     * Retrieves all K-12 students belonging to a specific school.
     * ROLE_ADMIN sees all schools; ROLE_K12 only sees their own school's students.
     *
     * @param schoolId the ID of the school
     * @return a list of students belonging to the school, or 403 if unauthorized
     */
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<List<K12Students>> getStudentsBySchool(@PathVariable UUID schoolId) {
        if (!isAuthorizedForSchool(schoolId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(k12StudentsRepository.findBySchoolId(schoolId));
    }

    // POST http://localhost:8080/api/k12-students
    /**
     * Creates a new K-12 student.
     * 
     * Non-admins can only ever create students under their own school -
     * whatever school is passed in the request body is ignored/overridden
     * for them, so a ROLE_K12 user can't write into another school's data
     * just by changing the payload.
     *
     * @param k12Student the K-12 student to create
     * @return the saved K-12 student, or 403 if the user's school cannot be determined
     */
    @PostMapping
    public ResponseEntity<K12Students> createStudent(@RequestBody K12Students k12Student) {
        if (!AuthUtil.isAdmin()) {
            UUID schoolId = AuthUtil.getCurrentSchoolId();
            if (schoolId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            com.cssweng.reportbuilder.model.School ownSchool = new com.cssweng.reportbuilder.model.School();
            ownSchool.setId(schoolId);
            k12Student.setSchool(ownSchool);
        }
        K12Students saved = k12StudentsRepository.save(k12Student);
        return ResponseEntity.ok(saved);
    }

    // POST http://localhost:8080/api/k12-students/bulk
    /**
     * Creates multiple K-12 students in a single request.
     * 
     * Non-admins can only ever create students under their own school -
     * whatever school is passed in the request body is ignored/overridden
     * for them, so a ROLE_K12 user can't write into another school's data
     * just by changing the payload.
     *
     * This endpoint is primarily intended for testing and quickly seeding data.
     *
     * @param students the list of K-12 students to create
     * @return the saved K-12 students, or 403 if the user's school cannot be determined
     */
    @PostMapping("/bulk")
    public ResponseEntity<List<K12Students>> createStudents(@RequestBody List<K12Students> students) {
        if (!AuthUtil.isAdmin()) {
            UUID schoolId = AuthUtil.getCurrentSchoolId();
            if (schoolId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            for (K12Students s : students) {
                com.cssweng.reportbuilder.model.School ownSchool = new com.cssweng.reportbuilder.model.School();
                ownSchool.setId(schoolId);
                s.setSchool(ownSchool);
            }
        }
        List<K12Students> saved = k12StudentsRepository.saveAll(students);
        return ResponseEntity.ok(saved);
    }

    // PUT http://localhost:8080/api/k12-students/{id}
    /**
     * Updates an existing K-12 student.
     * 
     * ROLE_ADMIN users can update students from any school and change their
     * school assignment. ROLE_K12 users can only update students from their
     * own school and cannot change the student's school assignment.
     *
     * @param id the ID of the student to update
     * @param k12Student the updated student information
     * @return the updated student, 403 if unauthorized, or 404 if not found
     */
    @PutMapping("/{id}")
    public ResponseEntity<K12Students> updateStudent(@PathVariable UUID id, @RequestBody K12Students k12Student) {
        return k12StudentsRepository.findById(id)
                .map(existing -> {
                    if (!isAuthorizedForSchool(existing.getSchool().getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<K12Students>build();
                    }

                    existing.setStudentId(k12Student.getStudentId());

                    // Non-admins cannot move a student to a different school —
                    // only ROLE_ADMIN may change the school assignment.
                    if (k12Student.getSchool() != null && AuthUtil.isAdmin()) {
                        existing.setSchool(k12Student.getSchool());
                    }

                    existing.setFirstName(k12Student.getFirstName());
                    existing.setLastName(k12Student.getLastName());
                    existing.setGrade(k12Student.getGrade());
                    existing.setStrand(k12Student.getStrand());
                    existing.setSection(k12Student.getSection());
                    existing.setStatus(k12Student.getStatus());
                    K12Students updated = k12StudentsRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DEL http://localhost:8080/api/k12-students/{id}
    /**
     * Deletes an existing K-12 student.
     * 
     * ROLE_ADMIN users can delete students from any school, while ROLE_K12
     * users can only delete students belonging to their own school.
     *
     * @param id the ID of the student to delete
     * @return the deleted student, 403 if unauthorized, or 404 if not found
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<K12Students> deleteStudent(@PathVariable UUID id) {
        return k12StudentsRepository.findById(id)
                .map(existing -> {
                    if (!isAuthorizedForSchool(existing.getSchool().getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<K12Students>build();
                    }
                    k12StudentsRepository.delete(existing);
                    return ResponseEntity.ok(existing);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * ROLE_ADMIN is authorized for any school. Everyone else is only
     * authorized for their own school, per the JWT's schoolId claim.
     * 
     * @param targetSchoolId the ID of the school being accessed
     * @return true if the current user is authorized for the school, otherwise false
     */
    private boolean isAuthorizedForSchool(UUID targetSchoolId) {
        if (AuthUtil.isAdmin()) return true;
        UUID currentSchoolId = AuthUtil.getCurrentSchoolId();
        return currentSchoolId != null && currentSchoolId.equals(targetSchoolId);
    }
}