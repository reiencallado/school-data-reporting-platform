package com.cssweng.reportbuilder.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cssweng.reportbuilder.model.CollegeStudents;
import com.cssweng.reportbuilder.repository.CollegeStudentsRepository;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/college-students")
@CrossOrigin(origins = "*")
public class CollegeStudentsController {

    private final CollegeStudentsRepository collegeStudentsRepository;

    public CollegeStudentsController(CollegeStudentsRepository collegeStudentsRepository) {
        this.collegeStudentsRepository = collegeStudentsRepository;
    }

    // GET http://localhost:8080/api/college-students
    @GetMapping
    public ResponseEntity<List<CollegeStudents>> getAllStudents() {
        return ResponseEntity.ok(collegeStudentsRepository.findAll());
    }

    // GET http://localhost:8080/api/college-students/{id}
    @GetMapping("/{id}")
    public ResponseEntity<CollegeStudents> getStudentById(@PathVariable UUID id) {
        return collegeStudentsRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET http://localhost:8080/api/college-students/school/{schoolId}
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<List<CollegeStudents>> getStudentsBySchool(@PathVariable UUID schoolId) {
        return ResponseEntity.ok(collegeStudentsRepository.findBySchoolId(schoolId));
    }

    // POST http://localhost:8080/api/college-students
    @PostMapping
    public ResponseEntity<CollegeStudents> createStudent(@RequestBody CollegeStudents collegeStudent) {
        CollegeStudents saved = collegeStudentsRepository.save(collegeStudent);
        return ResponseEntity.ok(saved);
    }

    // POST http://localhost:8080/api/college-students/bulk
    // ONLY FOR TESTING PURPOSES TO SEED DATA FAST IN POSTMANT
    @PostMapping("/bulk")
    public ResponseEntity<List<CollegeStudents>> createStudents(@RequestBody List<CollegeStudents> students) {
        List<CollegeStudents> saved = collegeStudentsRepository.saveAll(students);
        return ResponseEntity.ok(saved);
    }

    // PUT http://localhost:8080/api/college-students/{id}
    @PutMapping("/{id}")
    public ResponseEntity<CollegeStudents> updateStudent(@PathVariable UUID id, @RequestBody CollegeStudents collegeStudent) {
        return collegeStudentsRepository.findById(id)
                .map(existing -> {
                    existing.setStudentId(collegeStudent.getStudentId());
                    if (collegeStudent.getSchool() != null) {
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
                    collegeStudentsRepository.delete(existing);
                    return ResponseEntity.ok(existing);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}