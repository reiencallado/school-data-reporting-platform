package com.cssweng.reportbuilder.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cssweng.reportbuilder.model.K12Students;
import com.cssweng.reportbuilder.repository.K12StudentsRepository;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/k12-students")
@CrossOrigin(origins = "*")
public class K12StudentsController {

    private final K12StudentsRepository k12StudentsRepository;

    public K12StudentsController(K12StudentsRepository k12StudentsRepository) {
        this.k12StudentsRepository = k12StudentsRepository;
    }

    // GET http://localhost:8080/api/k12-students
    @GetMapping
    public ResponseEntity<List<K12Students>> getAllStudents() {
        return ResponseEntity.ok(k12StudentsRepository.findAll());
    }

    // GET http://localhost:8080/api/k12-students/{id}
    @GetMapping("/{id}")
    public ResponseEntity<K12Students> getStudentById(@PathVariable UUID id) {
        return k12StudentsRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET http://localhost:8080/api/k12-students/school/{schoolId}
    @GetMapping("/school/{schoolId}")
    public ResponseEntity<List<K12Students>> getStudentsBySchool(@PathVariable UUID schoolId) {
        return ResponseEntity.ok(k12StudentsRepository.findBySchoolId(schoolId));
    }

    // POST http://localhost:8080/api/k12-students
    @PostMapping
    public ResponseEntity<K12Students> createStudent(@RequestBody K12Students k12Student) {
        K12Students saved = k12StudentsRepository.save(k12Student);
        return ResponseEntity.ok(saved);
    }

    // POST http://localhost:8080/api/k12-students/bulk
    // ONLY FOR TESTING PURPOSES TO SEED DATA FAST IN POSTMANT
    @PostMapping("/bulk")
    public ResponseEntity<List<K12Students>> createStudents(@RequestBody List<K12Students> students) {
        List<K12Students> saved = k12StudentsRepository.saveAll(students);
        return ResponseEntity.ok(saved);
    }

    // PUT http://localhost:8080/api/k12-students/{id}
    @PutMapping("/{id}")
    public ResponseEntity<K12Students> updateStudent(@PathVariable UUID id, @RequestBody K12Students k12Student) {
        return k12StudentsRepository.findById(id)
                .map(existing -> {
                    existing.setStudentId(k12Student.getStudentId());
                    if (k12Student.getSchool() != null) {
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
                    k12StudentsRepository.delete(existing);
                    return ResponseEntity.ok(existing);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}