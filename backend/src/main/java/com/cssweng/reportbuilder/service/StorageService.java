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
