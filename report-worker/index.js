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
        
        // Validation
        if (!inputs || !Array.isArray(inputs)) {
            return res.status(400).send('Inputs must be a valid array.');
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // For testing, delete later

        console.log(`[Worker - Job ${jobId}] Received batch for ${inputs.length} student(s)...`);

        // Parse template
        const templateConfig = JSON.parse(configuration);
        const zip = new JSZip();

        // 20 students at a time
        const CHUNK_SIZE = 20;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
            const chunk = inputs.slice(i, i + CHUNK_SIZE);
            
            // Parallel processing
            await Promise.all(chunk.map(async (studentInput, index) => {
                const globalIndex = i + index;
                const rawName = studentInput.studentname || studentInput.name || `student_${globalIndex}`;
                const safeName = rawName.replace(/[^a-z0-9]+/gi, '_');
                const studentId = studentInput.studentid || globalIndex;
                const fileName = `${safeName}_${studentId}.pdf`;

                try {
                    const pdfBytes = await generate({ 
                        template: templateConfig, 
                        inputs: [studentInput], 
                        plugins 
                    });
                    
                    zip.file(fileName, pdfBytes);
                    successCount++;
                } catch (innerErr) {
                    console.error(`[Worker - Job ${jobId}] Failed to generate PDF for ${fileName}:`, innerErr.message);
                    failCount++;
                    zip.file(`_FAILED_${fileName}.txt`, `Failed to generate: ${innerErr.message}`);
                }
            }));
        }

        console.log(`[Worker - Job ${jobId}] Zipping ${successCount} files (${failCount} failed)...`);
        
        const zipBuffer = await zip.generateAsync({ 
            type: 'nodebuffer',
            streamFiles: true,
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });
        
        res.setHeader('Content-Type', 'application/zip');
        res.send(zipBuffer);
        
        console.log(`[Worker - Job ${jobId}] Job complete! ZIP sent back to Java.`);

    } catch (err) {
        console.error("[Worker] Fatal error generating batch:", err);
        res.status(500).send('Generation failed');
    }
});

// Temporary
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Worker running on port ${PORT}`));