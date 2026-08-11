package com.cssweng.reportbuilder.controller;

import com.cssweng.reportbuilder.service.StorageService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.io.IOException;
import java.net.URI;

/**
 * Handles HTTP requests related to file storage and message queue operations.
 * Provides endpoints for uploading files and sending messages to the queue.
 */
@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final StorageService storageService;
    private final S3Client s3Client;

    // Matches the bucket name used everywhere else (index.js worker,
    // ReportJobService's generateSelectedZip) - pull this into a shared
    // config property if it ever needs to vary per environment.
    private static final String BUCKET_NAME = "document-maker-bucket";

    public StorageController(StorageService storageService, S3Client s3Client) {
        this.storageService = storageService;
        this.s3Client = s3Client;
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

    // GET http://localhost:8080/api/storage/file?key=...
    /**
     * Streams a stored object (school logos, template thumbnails, etc.)
     * through the backend.
     * Accepts either a full stored URL
     * (http://localhost:4566/document-maker-bucket/logos/xyz.png) or a bare
     * object key (logos/xyz.png) so it keeps working regardless of which
     * form a caller happens to have on hand.
     */
    @GetMapping("/file")
    public ResponseEntity<byte[]> getFile(@RequestParam("key") String key) throws IOException {
        String objectKey = extractKey(key);

        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(BUCKET_NAME)
                .key(objectKey)
                .build();

        try (ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(request)) {
            byte[] bytes = s3Object.readAllBytes();
            GetObjectResponse metadata = s3Object.response();

            MediaType contentType;
            try {
                contentType = metadata.contentType() != null
                        ? MediaType.parseMediaType(metadata.contentType())
                        : MediaType.APPLICATION_OCTET_STREAM;
            } catch (Exception e) {
                contentType = MediaType.APPLICATION_OCTET_STREAM;
            }

            return ResponseEntity.ok()
                    .contentType(contentType)
                    // Logos/thumbnails cache instead of re-fetching every time
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                    .body(bytes);
        } catch (NoSuchKeyException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String extractKey(String urlOrKey) {
        if (!urlOrKey.startsWith("http://") && !urlOrKey.startsWith("https://")) {
            return urlOrKey;
        }
        String path = URI.create(urlOrKey).getPath(); // /document-maker-bucket/logos/xyz.png
        String prefix = "/" + BUCKET_NAME + "/";
        return path.startsWith(prefix) ? path.substring(prefix.length()) : path.substring(1);
    }
}