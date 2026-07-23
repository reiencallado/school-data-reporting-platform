import express from 'express';
import { generate } from '@pdfme/generator';
import { text, barcodes, image, multiVariableText, table, line, rectangle, ellipse } from '@pdfme/schemas';
import JSZip from 'jszip';

const app = express();

app.use(express.json({ limit: '50mb' }));

const plugins = { 
    Text: text, 
    'Multi-var Text': multiVariableText, 
    'QR Code': barcodes.qrcode, 
    'Barcode': barcodes.code128, 
    Image: image, 
    Table: table, 
    Line: line, 
    Rectangle: rectangle, 
    Ellipse: ellipse 
};

app.post('/api/generate', async (req, res) => {
    try {
        const { jobId, configuration, inputs } = req.body;

        if (!inputs || !Array.isArray(inputs)) {
            return res.status(400).send('Inputs must be a valid array.');
        }

        console.log(`[Worker - Job ${jobId}] Received batch for ${inputs.length} student(s)...`);

        // Parse template
        const templateConfig = JSON.parse(configuration);
        const zip = new JSZip();

        const CHUNK_SIZE = 20;
        const results = [];

        for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
            const chunk = inputs.slice(i, i + CHUNK_SIZE);

            await Promise.all(chunk.map(async (studentInput, index) => {
                const globalIndex = i + index;
                function extractValue(field) {
                    if (!field) return '';
                    if (typeof field === 'string' && field.trim().startsWith('{')) {
                        try {
                            const parsed = JSON.parse(field);
                            const firstKey = Object.keys(parsed)[0];
                            return parsed[firstKey] ?? '';
                        } catch {
                            return field;
                        }
                    }
                    return field;
                }

                const rawName = extractValue(studentInput.studentName || studentInput.studentname || studentInput.name) || `student_${globalIndex}`;
                const safeName = rawName.replace(/[^a-z0-9]+/gi, '_');
                const studentId = extractValue(studentInput.studentId || studentInput.studentid) || String(globalIndex);
                const grade = extractValue(studentInput.gradeLevel || studentInput.gradelevel) || '';
                const section = extractValue(studentInput.section) || '';
                const strand = extractValue(studentInput.strand) || '';
                const fileName = `${safeName}_${studentId}.pdf`;

                try {
                    const pdfBytes = await generate({ 
                        template: templateConfig, 
                        inputs: [studentInput], 
                        plugins 
                    });

                    zip.file(fileName, pdfBytes);

                    results.push({
                        studentId,
                        studentName: rawName,
                        grade,
                        section,
                        strand,
                        status: 'DONE',
                        fileName,
                        pdfBase64: Buffer.from(pdfBytes).toString('base64'),
                        failureReason: null
                    });
                } catch (innerErr) {
                    console.error(`[Worker - Job ${jobId}] Failed to generate PDF for ${fileName}:`, innerErr.message);
                    zip.file(`_FAILED_${fileName}.txt`, `Failed to generate: ${innerErr.message}`);

                    results.push({
                        studentId,
                        studentName: rawName,
                        grade,
                        section,
                        strand,
                        status: 'FAILED',
                        fileName: null,
                        pdfBase64: null,
                        failureReason: innerErr.message
                    });
                }
            }));
        }

        const successCount = results.filter(r => r.status === 'DONE').length;
        const failCount = results.filter(r => r.status === 'FAILED').length;

        console.log(`[Worker - Job ${jobId}] Zipping ${successCount} files (${failCount} failed)...`);

        const zipBase64 = await zip.generateAsync({ 
            type: 'base64',
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });

        res.json({
            jobId,
            results,
            zipBase64
        });

        console.log(`[Worker - Job ${jobId}] Job complete! Response sent back to Java.`);

    } catch (err) {
        console.error("[Worker] Fatal error generating batch:", err);
        res.status(500).json({ error: err.message });
    }
});

// Temporary
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Worker running on port ${PORT}`));