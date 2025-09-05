const fs = require('fs');
const path = require('path');

// Simple test to check if the PDF file exists and read it
const pdfPath = 'c:/Users/Lekhana/Downloads/Results CE 1-4.pdf';

console.log('Testing PDF parser...');

if (fs.existsSync(pdfPath)) {
    console.log('✓ PDF file found at:', pdfPath);
    
    const stats = fs.statSync(pdfPath);
    console.log('✓ File size:', Math.round(stats.size / 1024), 'KB');
    
    // Test if we can read the file
    try {
        const buffer = fs.readFileSync(pdfPath);
        console.log('✓ PDF file successfully read into buffer');
        console.log('✓ Buffer size:', buffer.length, 'bytes');
        
        // Check if it's a valid PDF by looking at the header
        const header = buffer.slice(0, 4).toString();
        if (header === '%PDF') {
            console.log('✓ Valid PDF file header detected');
        } else {
            console.log('✗ Invalid PDF file header:', header);
        }
        
    } catch (error) {
        console.log('✗ Error reading PDF file:', error.message);
    }
    
} else {
    console.log('✗ PDF file not found at:', pdfPath);
    console.log('Please ensure the PDF file exists at the specified location');
}

console.log('\nServer is running at: http://localhost:3000');
console.log('You can now test the application by uploading the PDF file through the web interface.');