import express from 'express';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generate } from '@pdfme/generator';
import { text, barcodes, image, multiVariableText, table, line, rectangle, ellipse } from '@pdfme/schemas';
import JSZip from 'jszip';
import axios from 'axios';

const app = express();

// LocalStack AWS Clients
const s3 = new S3Client({
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    forcePathStyle: true,
});

const sqs = new SQSClient({
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
});

// LocalStack configurations
const QUEUE_URL = 'http://localhost:4566/000000000000/my-queue.fifo';
const BUCKET_NAME = 'document-maker-bucket';
const WEBHOOK_URL = 'http://localhost:8080/api/reports/webhook/completion'; 

const plugins = { 
    Text: text, 'Multi-var Text': multiVariableText, 'QR Code': barcodes.qrcode, 
    'Barcode': barcodes.code128, Image: image, Table: table, Line: line, 
    Rectangle: rectangle, Ellipse: ellipse 
};

async function processJob(jobData, receiptHandle) {
    const { jobId, reportName, configuration, inputs } = jobData;
    console.log(`[Worker - Job ${jobId}] Processing ${inputs.length} student(s)...`);

    try {
        const templateConfig = JSON.parse(configuration);
        const zip = new JSZip();
        const results = [];
        const CHUNK_SIZE = 20;

        for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
            const chunk = inputs.slice(i, i + CHUNK_SIZE);

            await Promise.all(chunk.map(async (item, index) => {
                const globalIndex = i + index;
                const studentInput = item.pdfmeInput;
                const student = item.student;

                const rawName = student?.studentName || `student_${globalIndex}`;
                const nameParts = rawName.trim().split(/\s+/);
                let formattedName = rawName;

                if (nameParts.length > 1) {
                    const lastName = nameParts.pop();
                    const firstNames = nameParts.join('_');
                    formattedName = `${lastName}_${firstNames}`;
                }

                const safeName = formattedName.replace(/[^a-zA-Z0-9_-]/g, '');
                const fileName = `${safeName}.pdf`;
                const studentId = student?.studentId ?? String(globalIndex);

                try {
                    const pdfBytes = await generate({ template: templateConfig, inputs: [studentInput], plugins });
                    zip.file(fileName, pdfBytes);

                    const pdfKey = `reports/items/${jobId}_${fileName}`;
                    await s3.send(new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: pdfKey,
                        Body: Buffer.from(pdfBytes),
                        ContentType: 'application/pdf',
                        ContentDisposition: `attachment; filename="${fileName}"`
                    }));

                    results.push({
                        studentId, studentName: rawName,
                        grade: student?.grade ?? '',
                        section: student?.section ?? '',
                        strand: student?.strand ?? '',
                        status: 'DONE', fileName,
                        fileUrl: `http://localhost:4566/${BUCKET_NAME}/${pdfKey}`
                    });
                } catch (innerErr) {
                    results.push({
                        studentId, studentName: rawName, status: 'FAILED',
                        failureReason: innerErr.message
                    });
                }
            }));
        }

        console.log(`[Worker - Job ${jobId}] Uploading ZIP to S3...`);
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: "DEFLATE" });
        
        const safeTemplateName = (reportName || 'Batch_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
        const zipKey = `reports/${safeTemplateName}_${jobId}.zip`;
        const downloadZipName = `${safeTemplateName}.zip`;
        
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: zipKey,
            Body: zipBuffer,
            ContentType: 'application/zip',
            ContentDisposition: `attachment; filename="${downloadZipName}"`
        }));
        
        const zipUrl = `http://localhost:4566/${BUCKET_NAME}/${zipKey}`;

        console.log('[DEBUG] Sample result:', JSON.stringify(results[0])); // DEBUGGING

        await axios.post(WEBHOOK_URL, { jobId, status: 'DONE', fileUrl: zipUrl, results });
        await sqs.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: receiptHandle }));
        console.log(`[Worker - Job ${jobId}] Job complete & removed from queue!`);

    } catch (err) {
        console.error(`[Worker - Job ${jobId}] Fatal error:`, err);
        await axios.post(WEBHOOK_URL, { jobId, status: 'FAILED', results: [] }).catch(() => {});
    }
}

async function pollQueue() {
    try {
        const response = await sqs.send(new ReceiveMessageCommand({
            QueueUrl: QUEUE_URL,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 5
        }));

        if (response.Messages && response.Messages.length > 0) {
            const msg = response.Messages[0];
            await processJob(JSON.parse(msg.Body), msg.ReceiptHandle);
        }
    } catch (error) {
        console.error("[Worker] SQS Polling Error:", error.message);
    }
    setImmediate(pollQueue);
}

pollQueue(); // polling

const PORT = process.env.PORT || 3000;
app.get('/health', (req, res) => res.send('Worker is polling SQS!'));
app.listen(PORT, () => console.log(`Worker running on port ${PORT}`));