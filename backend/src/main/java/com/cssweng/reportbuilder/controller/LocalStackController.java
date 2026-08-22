package com.cssweng.reportbuilder.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageResponse;
import software.amazon.awssdk.services.sqs.model.SqsException;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/localstack")
@CrossOrigin(origins = "*")
public class LocalStackController {

    private final S3Client s3Client;
    private final SqsClient sqsClient;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.sqs.queue-name}")
    private String queueName;
    
    @Value("${aws.endpoint}")
    private String awsEndpoint;

    public LocalStackController(S3Client s3Client, SqsClient sqsClient) {
        this.s3Client = s3Client;
        this.sqsClient = sqsClient;
    }

    /**
     * Uploads a provided file to the LocalStack S3 bucket.
     * 
     * Side effects: Writes an object to an external S3 storage bucket and 
     *               generates a random UUID to prefix the file key.
     *
     * @param file the MultipartFile object containing the document payload
     * @return a JSON response containing success details on a 200 OK, a 400 if 
     *         the file is empty, or a 500 on an AWS/LocalStack failure
     */
    @PostMapping("/s3/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        // TRIGGER 400 BAD REQUEST: File cannot be missing or empty
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "status", 400,
                "error", "Bad Request",
                "message", "Cannot upload an empty file. Please provide a valid document payload."
            ));
        }

        try {
            String key = UUID.randomUUID() + "_" + file.getOriginalFilename();
            
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, 
                    software.amazon.awssdk.core.sync.RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            return ResponseEntity.ok(Map.of(
                    "status", 200,
                    "message", "File uploaded successfully to LocalStack S3!",
                    "bucket", bucketName,
                    "key", key
            ));
        } catch (S3Exception e) {
            // TRIGGER 500 INTERNAL SERVER ERROR: AWS/LocalStack side failure
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "status", 500,
                "error", "S3 Storage Exception",
                "message", e.awsErrorDetails().errorMessage()
            ));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("status", 500, "message", e.getMessage()));
        }
    }

    /**
     * Sends a plain text message to the LocalStack SQS queue.
     * 
     * Side effects: Enqueues a new message in an external SQS system and generates 
     *               a random UUID for the message deduplication ID.
     *
     * @param payload a Map representing the request body, specifically expecting a 
     *                message key containing the text to send.
     * @return a JSON response containing delivery details on a 200 OK,
     *         a 400 if the message is missing, or a 500 on an SQS delivery failure.
     */
    @PostMapping("/sqs/send")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, String> payload) {
        String messageBody = payload.get("message");
        
        // TRIGGER 400 BAD REQUEST: Body missing message parameter
        if (messageBody == null || messageBody.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "status", 400,
                "error", "Bad Request",
                "message", "Missing or empty 'message' text parameter in request body"
            ));
        }

        try {
            String queueUrl = awsEndpoint + "/000000000000/" + queueName;

            SendMessageRequest sendMsgRequest = SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(messageBody)
                    .messageGroupId("report-group") 
                    .messageDeduplicationId(UUID.randomUUID().toString()) 
                    .build();

            SendMessageResponse response = sqsClient.sendMessage(sendMsgRequest);

            return ResponseEntity.ok(Map.of(
                    "status", 200,
                    "message", "Message sent successfully to LocalStack SQS!",
                    "messageId", response.messageId(),
                    "queue", queueName
            ));
        } catch (SqsException e) {
            // TRIGGER 500 INTERNAL SERVER ERROR: Queue delivery issues
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "status", 500,
                "error", "SQS Delivery Exception",
                "message", e.awsErrorDetails().errorMessage()
            ));
        }
    }
}