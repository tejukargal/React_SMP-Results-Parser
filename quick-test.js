const fs = require('fs');
const pdfParse = require('pdf-parse');

async function quickTest() {
    try {
        const pdfPath = 'c:/Users/Lekhana/Downloads/Results CE 1-4.pdf';
        const buffer = fs.readFileSync(pdfPath);
        
        console.log('Testing with pdf-parse library...');
        const pdfData = await pdfParse(buffer);
        const rawText = pdfData.text;
        
        console.log('Raw text length:', rawText.length);
        console.log('First 500 chars:', rawText.substring(0, 500));
        
        // Test student regex
        const studentRegex = /(\d+)\s+(\d+(?:CE|ME|EC|CS|EE)\d+)\s+(.+?)\s*\[\s*S\(D\)\s*\/\s*o\s*:\s*(.+?)\s*\]/;
        const lines = rawText.split('\n');
        let studentCount = 0;
        
        for (let line of lines) {
            const match = line.match(studentRegex);
            if (match) {
                studentCount++;
                if (studentCount <= 3) {
                    console.log(`Student ${studentCount}: ${match[2]} - ${match[3]}`);
                }
            }
        }
        
        console.log(`Total students found: ${studentCount}`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

quickTest();