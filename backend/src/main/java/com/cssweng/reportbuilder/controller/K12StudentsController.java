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

@RestController
@RequestMapping("/api/k12-students")
@CrossOrigin(origins = "*")
// Only ROLE_K12 and ROLE_ADMIN may touch K12 data at all. Within that,
// ROLE_K12 users are further restricted to their own school below —
// this annotation only gates the data *type*, not the school boundary.
@PreAuthorize("hasRole('K12') or hasRole('ADMIN')")
public class K12StudentsController {

    private final K12StudentsRepository k12StudentsRepository;

    public K12StudentsController(K12StudentsRepository k12StudentsRepository) {
        this.k12StudentsRepository = k12StudentsRepository;
    }

    // GET http://localhost:8080/api/k12-students
    // ROLE_ADMIN sees all schools; ROLE_K12 only sees their own school's students.
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
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<List<K12Students>> getStudentsBySchool(@PathVariable UUID schoolId) {
        if (!isAuthorizedForSchool(schoolId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(k12StudentsRepository.findBySchoolId(schoolId));
    }

    // POST http://localhost:8080/api/k12-students
    // Non-admins can only ever create students under their own school —
    // whatever school is passed in the request body is ignored/overridden
    // for them, so a ROLE_K12 user can't write into another school's data
    // just by changing the payload.
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
    // ONLY FOR TESTING PURPOSES TO SEED DATA FAST IN POSTMANT
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
     */
    private boolean isAuthorizedForSchool(UUID targetSchoolId) {
        if (AuthUtil.isAdmin()) return true;
        UUID currentSchoolId = AuthUtil.getCurrentSchoolId();
        return currentSchoolId != null && currentSchoolId.equals(targetSchoolId);
    }
}