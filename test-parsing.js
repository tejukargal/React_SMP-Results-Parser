const fs = require('fs');
const { PDFParser } = require('./dist/services/pdfParser');

async function testParsing() {
    try {
        console.log('Testing updated PDF parsing logic...');
        
        const pdfPath = 'c:/Users/Lekhana/Downloads/Results CE 1-4.pdf';
        const buffer = fs.readFileSync(pdfPath);
        
        const results = await PDFParser.parsePDF(buffer);
        
        console.log('\n=== PARSED RESULTS ===');
        console.log('Institute:', results.institute);
        console.log('Programme:', results.programme);
        console.log('Result Date:', results.resultDate);
        console.log('Total Students:', results.students.length);
        
        console.log('\n=== FIRST 3 STUDENTS ===');
        results.students.slice(0, 3).forEach((student, index) => {
            console.log(`\n${index + 1}. Student Details:`);
            console.log('   Reg No:', student.regNo);
            console.log('   Name:', student.name);
            console.log('   Father Name:', student.fatherName);
            console.log('   CGPA:', student.cgpa);
            console.log('   Final Result:', student.finalResult);
            console.log('   SGPA:', JSON.stringify(student.sgpa));
            console.log('   Subjects:', student.semesterResults[0]?.subjects.length || 0);
            
            if (student.semesterResults[0]?.subjects.length > 0) {
                console.log('   First Subject:', {
                    code: student.semesterResults[0].subjects[0].qpCode,
                    name: student.semesterResults[0].subjects[0].subjectName,
                    marks: student.semesterResults[0].subjects[0].marks,
                    grade: student.semesterResults[0].subjects[0].grade
                });
            }
        });
        
        console.log('\n✅ Parsing completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during parsing:', error.message);
        console.error('Stack:', error.stack);
    }
}

testParsing();