package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

/**
 * Handles HTTP requests related to file storage and message queue operations.
 * Provides endpoints for uploading files and sending messages to the queue.
 */
@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    // POST http://localhost:8080/api/storage/upload
    /**
     * Uploads a file to the storage service.
     *
     * @param file the file to upload
     * @return a confirmation message
     * @throws IOException if the file cannot be read or uploaded
     */
    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(storageService.uploadFile(file));
    }

    // POST http://localhost:8080/api/storage/message
    /**
     * Sends a message to the message queue.
     *
     * @param messageBody the message content
     * @return a confirmation message
     */
    @PostMapping("/message")
    public ResponseEntity<String> sendMessage(@RequestParam("body") String messageBody) {
        return ResponseEntity.ok(storageService.sendMessage(messageBody));
    }
}
