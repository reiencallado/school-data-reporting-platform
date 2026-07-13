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

@RestController
@RequestMapping("/api/college-students")
@CrossOrigin(origins = "*")
// Only ROLE_COLLEGE and ROLE_ADMIN may touch college data at all. Within
// that, ROLE_COLLEGE users are further restricted to their own school
// below — this annotation only gates the data *type*, not the school
// boundary.
@PreAuthorize("hasRole('COLLEGE') or hasRole('ADMIN')")
public class CollegeStudentsController {

    private final CollegeStudentsRepository collegeStudentsRepository;

    public CollegeStudentsController(CollegeStudentsRepository collegeStudentsRepository) {
        this.collegeStudentsRepository = collegeStudentsRepository;
    }

    // GET http://localhost:8080/api/college-students
    // ROLE_ADMIN sees all schools; ROLE_COLLEGE only sees their own school's students.
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

    // GET http://localhost:8080/api/college-students/{id}
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

    // GET http://localhost:8080/api/college-students/school/{schoolId}
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<List<CollegeStudents>> getStudentsBySchool(@PathVariable UUID schoolId) {
        if (!isAuthorizedForSchool(schoolId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(collegeStudentsRepository.findBySchoolId(schoolId));
    }

    // POST http://localhost:8080/api/college-students
    // Non-admins can only ever create students under their own school —
    // whatever school is passed in the request body is ignored/overridden
    // for them, so a ROLE_COLLEGE user can't write into another school's
    // data just by changing the payload.
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

    // POST http://localhost:8080/api/college-students/bulk
    // ONLY FOR TESTING PURPOSES TO SEED DATA FAST IN POSTMANT
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

    // PUT http://localhost:8080/api/college-students/{id}
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

    // DEL http://localhost:8080/api/college-students/{id}
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
     */
    private boolean isAuthorizedForSchool(UUID targetSchoolId) {
        if (AuthUtil.isAdmin()) return true;
        UUID currentSchoolId = AuthUtil.getCurrentSchoolId();
        return currentSchoolId != null && currentSchoolId.equals(targetSchoolId);
    }
}