package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(storageService.uploadFile(file));
    }

    @PostMapping("/message")
    public ResponseEntity<String> sendMessage(@RequestParam("body") String messageBody) {
        return ResponseEntity.ok(storageService.sendMessage(messageBody));
    }
}
