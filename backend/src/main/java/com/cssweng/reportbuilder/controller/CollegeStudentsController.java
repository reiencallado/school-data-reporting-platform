package com.cssweng.reportbuilder.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.cssweng.reportbuilder.model.CollegeStudents;
import com.cssweng.reportbuilder.repository.CollegeStudentsRepository;
import com.cssweng.reportbuilder.util.AuthUtil;

import java.util.List;
import java.util.UUID;

/**
 * Handles HTTP requests related to college student records.
 * Provides endpoints for creating, retrieving, updating, and deleting
 * students while enforcing role-based and school-level access control.
 * 
 * Only ROLE_COLLEGE and ROLE_ADMIN may touch college data at all. Within
 * that, ROLE_COLLEGE users are further restricted to their own school
 * below - this annotation only gates the data *type*, not the school boundary
 */
@RestController
@RequestMapping("/api/college-students")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('COLLEGE') or hasRole('ADMIN')")
public class CollegeStudentsController {

    private final CollegeStudentsRepository collegeStudentsRepository;

    public CollegeStudentsController(CollegeStudentsRepository collegeStudentsRepository) {
        this.collegeStudentsRepository = collegeStudentsRepository;
    }

    /**
     * Retrieves all college students. ROLE_ADMIN sees all schools; ROLE_COLLEGE only sees 
     * their own school's students.
     *
     * Side effects: Queries the database and evaluates the SecurityContextHolder to enforce 
     *               tenant isolation.
     * 
     * @return a list of accessible college students, or 403 if the user's school
     *         cannot be determined
     */
    @GetMapping
    public ResponseEntity<List<CollegeStudents>> getAllStudents() {
        if (AuthUtil.isAdmin()) {
            return ResponseEntity.ok(collegeStudentsRepository.findAll());
        }
        UUID schoolId = AuthUtil.getCurrentSchoolId();
        if (schoolId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(collegeStudentsRepository.findBySchoolId(schoolId));
    }

    /**
     * Retrieves a college student by ID. ROLE_ADMIN users can access students from any 
     * school, while ROLE_COLLEGE users can only access students belonging to their own school.
     *
     * Side effects: Queries the database and evaluates the user's authorization to 
     *               access the specific student's school data.
     * 
     * @param id the ID of the student
     * @return the student if found and authorized, 403 if unauthorized,
     *         or 404 if not found
     */
    @GetMapping("/{id}")
    public ResponseEntity<CollegeStudents> getStudentById(@PathVariable UUID id) {
        return collegeStudentsRepository.findById(id)
                .map(student -> {
                    if (!isAuthorizedForSchool(student.getSchool().getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<CollegeStudents>build();
                    }
                    return ResponseEntity.ok(student);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieves all college students belonging to a specific school. ROLE_ADMIN sees all 
     * schools; ROLE_COLLEGE only sees their own school's students.
     *
     * Side effects: Queries the database and enforces tenant authorization against 
     *               the requested school ID.
     * 
     * @param schoolId the ID of the school
     * @return a list of students belonging to the school, or 403 if unauthorized
     */
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<List<CollegeStudents>> getStudentsBySchool(@PathVariable UUID schoolId) {
        if (!isAuthorizedForSchool(schoolId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(collegeStudentsRepository.findBySchoolId(schoolId));
    }

    /**
     * Creates a new college student.
     * 
     * Non-admins can only ever create students under their own school -
     * whatever school is passed in the request body is ignored/overridden
     * for them, so a ROLE_COLLEGE user can't write into another school's
     * data just by changing the payload.
     * 
     * Side effects: Persists a new student to the database. For non-admins, overrides the 
     *               request body's school assignment to match the user's JWT claim.
     *
     * @param collegeStudent the college student to create
     * @return the saved college student, or 403 if the user's school cannot be determined
     */
    @PostMapping
    public ResponseEntity<CollegeStudents> createStudent(@RequestBody CollegeStudents collegeStudent) {
        if (!AuthUtil.isAdmin()) {
            UUID schoolId = AuthUtil.getCurrentSchoolId();
            if (schoolId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            com.cssweng.reportbuilder.model.School ownSchool = new com.cssweng.reportbuilder.model.School();
            ownSchool.setId(schoolId);
            collegeStudent.setSchool(ownSchool);
        }
        CollegeStudents saved = collegeStudentsRepository.save(collegeStudent);
        return ResponseEntity.ok(saved);
    }

    /**
     * Bulk creates multiple college student records (primarily intended 
     * for data seeding and testing).
     * 
     * Side effects: Persists multiple students to the database. For non-admins, iterates through 
     *               the list to override all school assignments to match the user's tenant context.
     *
     * @param students a list of CollegeStudents objects to be saved.
     * @return a response containing the list of successfully saved student records 
     *         or a 403 Forbidden if context is invalid.
     */
    @PostMapping("/bulk")
    public ResponseEntity<List<CollegeStudents>> createStudents(@RequestBody List<CollegeStudents> students) {
        if (!AuthUtil.isAdmin()) {
            UUID schoolId = AuthUtil.getCurrentSchoolId();
            if (schoolId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            for (CollegeStudents s : students) {
                com.cssweng.reportbuilder.model.School ownSchool = new com.cssweng.reportbuilder.model.School();
                ownSchool.setId(schoolId);
                s.setSchool(ownSchool);
            }
        }
        List<CollegeStudents> saved = collegeStudentsRepository.saveAll(students);
        return ResponseEntity.ok(saved);
    }

    /**
     * Updates an existing college student.
     * 
     * ROLE_ADMIN users can update students from any school and change their
     * school assignment. ROLE_COLLEGE users can only update students from their
     * own school and cannot change the student's school assignment.
     *
     * Side effects: Modifies a database record and ignores attempts by non-admins
     *               to move a student to a different school.
     * 
     * @param id the ID of the student to update
     * @param collegeStudent the updated student information
     * @return the updated student, 403 if unauthorized, or 404 if not found
     */
    @PutMapping("/{id}")
    public ResponseEntity<CollegeStudents> updateStudent(@PathVariable UUID id, @RequestBody CollegeStudents collegeStudent) {
        return collegeStudentsRepository.findById(id)
                .map(existing -> {
                    if (!isAuthorizedForSchool(existing.getSchool().getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<CollegeStudents>build();
                    }

                    existing.setStudentId(collegeStudent.getStudentId());

                    // Non-admins cannot move a student to a different school —
                    // only ROLE_ADMIN may change the school assignment.
                    if (collegeStudent.getSchool() != null && AuthUtil.isAdmin()) {
                        existing.setSchool(collegeStudent.getSchool());
                    }

                    existing.setFirstName(collegeStudent.getFirstName());
                    existing.setLastName(collegeStudent.getLastName());
                    existing.setCourse(collegeStudent.getCourse());
                    existing.setYearLevel(collegeStudent.getYearLevel());
                    existing.setStatus(collegeStudent.getStatus());
                    CollegeStudents updated = collegeStudentsRepository.save(existing);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Deletes an existing college student.
     * 
     * ROLE_ADMIN users can delete students from any school, while ROLE_COLLEGE
     * users can only delete students belonging to their own school.
     *
     * Side effects: Permanently removes a specific database record after verifying the user's 
     *               authorization to modify that school's data.
     * 
     * @param id the ID of the student to delete
     * @return the deleted student, 403 if unauthorized, or 404 if not found
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<CollegeStudents> deleteStudent(@PathVariable UUID id) {
        return collegeStudentsRepository.findById(id)
                .map(existing -> {
                    if (!isAuthorizedForSchool(existing.getSchool().getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<CollegeStudents>build();
                    }
                    collegeStudentsRepository.delete(existing);
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