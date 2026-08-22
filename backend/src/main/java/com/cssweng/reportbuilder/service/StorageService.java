package com.cssweng.reportbuilder.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import java.io.IOException;
import java.util.UUID;

/**
 * Provides file storage and message queue operations for the report generation
 * system. This service uploads generated files to Amazon S3 and sends job
 * messages to Amazon SQS for asynchronous processing.
 */
@Service
public class StorageService {

    private final S3Client s3Client;
    private final SqsClient sqsClient;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.sqs.queue-name}")
    private String queueName;

    @Value("${aws.endpoint}")
    private String endpoint;

    
    public StorageService(S3Client s3Client, SqsClient sqsClient) {
        this.s3Client = s3Client;
        this.sqsClient = sqsClient;
    }

    /**
     * Uploads a file to the configured S3 bucket.
     * 
     * Side effects: Writes data to an external AWS S3 bucket.
     *
     * @param file the file to upload
     * @return a confirmation message containing the uploaded file name
     * @throws IOException if the file cannot be read
     */
    public String uploadFile(MultipartFile file) throws IOException {
        String key = file.getOriginalFilename();
        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build(),
                RequestBody.fromBytes(file.getBytes())
        );
        return "Uploaded: " + key;
    }

    /**
     * Uploads a file to S3 and returns its accessible URL.
     *
     * Side effects: Writes data to an external AWS S3 bucket.
     * 
     * @param file the file to upload
     * @param keyPrefix the S3 key prefix for the uploaded file
     * @return the URL of the uploaded file
     * @throws IOException if the file cannot be read
     */
    public String uploadFileAndGetUrl(MultipartFile file, String keyPrefix) throws IOException {
        return uploadFileAndGetUrl(file, keyPrefix, file.getOriginalFilename());
    }

    /**
     * Uploads a file to S3 with a custom download filename and returns its URL.
     *
     * Side effects: Writes data to an external AWS S3 bucket and generates a 
     *               random UUID for the object's key.
     * 
     * @param file the file to upload
     * @param keyPrefix the S3 key prefix for the uploaded file
     * @param downloadFilename the filename presented when the file is downloaded
     * @return the URL of the uploaded file
     * @throws IOException if the file cannot be read
     */
    public String uploadFileAndGetUrl(MultipartFile file, String keyPrefix, String downloadFilename) throws IOException {
        String extension = "";
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf('.'));
        }
        String key = keyPrefix + UUID.randomUUID() + extension;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .contentType(file.getContentType())
                        .contentDisposition("attachment; filename=\"" + downloadFilename + "\"")
                        .build(),
                RequestBody.fromBytes(file.getBytes())
        );

        // LocalStack/S3-style path URL: {endpoint}/{bucket}/{key}
        return endpoint + "/" + bucketName + "/" + key;
    }

    /**
     * Sends a message to the configured SQS queue.
     *
     * Side effects: Sends a message to an external AWS SQS queue.
     * 
     * @param messageBody the message content to send
     * @return a confirmation message
     */
    public String sendMessage(String messageBody) {
        String queueUrl = endpoint + "/000000000000/" + queueName;
        sqsClient.sendMessage(
                SendMessageRequest.builder()
                        .queueUrl(queueUrl)
                        .messageBody(messageBody)
                        .messageGroupId("group1")
                        .messageDeduplicationId(String.valueOf(System.currentTimeMillis()))
                        .build()
        );
        return "Message sent: " + messageBody;
    }
}