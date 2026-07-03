package com.cssweng.reportbuilder.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.cssweng.reportbuilder.model.AdmissionStudents;
import com.cssweng.reportbuilder.repository.AdmissionStudentsRepository;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admission-students")
@CrossOrigin(origins = "*")
public class AdmissionStudentsController {

    private final AdmissionStudentsRepository admissionStudentsRepository;

    public AdmissionStudentsController(AdmissionStudentsRepository admissionStudentsRepository) {
        this.admissionStudentsRepository = admissionStudentsRepository;
    }

    // GET http://localhost:8080/api/admission-students
    @GetMapping
    public ResponseEntity<List<AdmissionStudents>> getAllStudents() {
        return ResponseEntity.ok(admissionStudentsRepository.findAll());
    }

    // GET http://localhost:8080/api/admission-students/{id}
    @GetMapping("/{id}")
    public ResponseEntity<AdmissionStudents> getStudentById(@PathVariable UUID id) {
        return admissionStudentsRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST http://localhost:8080/api/admission-students
    @PostMapping
    public ResponseEntity<AdmissionStudents> createStudent(@RequestBody AdmissionStudents admissionStudent) {
        AdmissionStudents saved = admissionStudentsRepository.save(admissionStudent);
        return ResponseEntity.ok(saved);
    }

    // POST http://localhost:8080/api/admission-students/bulk
    // ONLY FOR TESTING PURPOSES TO SEED DATA FAST IN POSTMANT
    @PostMapping("/bulk")
    public ResponseEntity<List<AdmissionStudents>> createStudents(@RequestBody List<AdmissionStudents> students) {
        List<AdmissionStudents> saved = admissionStudentsRepository.saveAll(students);
        return ResponseEntity.ok(saved);
    }

    // PUT http://localhost:8080/api/admission-students/{id}
    @PutMapping("/{id}")
    public ResponseEntity<AdmissionStudents> updateStudent(@PathVariable UUID id, @RequestBody AdmissionStudents admissionStudent) {
        return admissionStudentsRepository.findById(id)
                .map(existing -> {
                    existing.setStudentId(admissionStudent.getStudentId());
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