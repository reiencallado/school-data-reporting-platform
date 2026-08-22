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

    /**
     * Uploads a file to the storage service.
     *
     * Side effects: Delegates to the StorageService, which writes data to an external AWS S3 bucket.
     * 
     * @param file the file to upload
     * @return a confirmation message
     * @throws IOException if the file cannot be read or uploaded
     */
    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(storageService.uploadFile(file));
    }

    /**
     * Sends a message to the message queue.
     *
     * Side effects: Delegates to the StorageService, which enqueues a new message in an 
     *               external AWS SQS system.
     * 
     * @param messageBody the message content
     * @return a confirmation message
     */
    @PostMapping("/message")
    public ResponseEntity<String> sendMessage(@RequestParam("body") String messageBody) {
        return ResponseEntity.ok(storageService.sendMessage(messageBody));
    }

    /**
     * Streams a stored object directly to the client. Accepts either a full stored URL 
     * or a bare object key, parsing it automatically so it keeps working.
     * 
     * Side effects: Makes an outbound network request to an external AWS S3 bucket to retrieve 
     *               the file stream, and modifies the HTTP response headers to enforce 
     *               client-side caching.
     *
     * @param key the full URL or raw S3 object key of the file to retrieve
     * @return a ResponseEntity containing the file's binary byte array and appropriate content type, 
     *         or a 404 Not Found if the key does not exist in the bucket
     * @throws IOException if there is an error reading the byte stream from the S3 response
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