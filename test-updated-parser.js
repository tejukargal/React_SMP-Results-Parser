const fs = require('fs');
const pdfParse = require('pdf-parse');

// Copy the updated parsing functions from client-side parser
class TestParser {
    static async parsePDF(buffer) {
        const pdfData = await pdfParse(buffer);
        const rawText = pdfData.text;
        
        const results = {
            institute: '',
            programme: '',
            resultDate: '',
            students: [],
            rawText
        };

        results.students = this.extractStudents(rawText);
        return results;
    }

    static extractStudents(text) {
        const students = [];
        this.parseContinuousText(text, students);
        return students;
    }

    static parseContinuousText(allText, students) {
        const lines = allText.split('\n');
        let currentStudent = null;
        let inStudentSection = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip header lines and page breaks
            const skipPhrases = [
                'BOARD OF TECHNICAL EXAMINATION',
                'RESULT LEDGER',
                'Page No :',
                'Continue...',
                '...Continue',
                'Note : This is only for Institutional Reference',
                'Institute :',
                'Programme :',
                'Result Date :',
                'Printed on :'
            ];
            
            if (skipPhrases.some(phrase => line.includes(phrase))) {
                continue;
            }
            
            // Check for student registration number and name
            const studentMatch = line.match(/(\d+)\s+(\d+(?:CE|ME|EC|CS|EE)\d+)\s+(.+?)\s*\[\s*S\(D\)\s*\/\s*o\s*:\s*(.+?)\s*\]/);
            if (studentMatch) {
                const [, sno, regNo, studentName, fatherName] = studentMatch;
                
                console.log(`Found student: ${regNo} - ${studentName}`);
                
                currentStudent = {
                    regNo: regNo.trim(),
                    name: studentName.trim(),
                    fatherName: fatherName.trim(),
                    semesterResults: [{
                        semester: 'Current',
                        subjects: []
                    }],
                    cgpa: 'Pending',
                    sgpa: {},
                    finalResult: 'Unknown'
                };
                students.push(currentStudent);
                inStudentSection = true;
                continue;
            }
            
            // Check for Results line - handle both "Results :" and "Results" + ": FAILS" patterns
            if (currentStudent && (line.includes('Results :') || line === 'Results' || line.includes('RESULTS'))) {
                let resultText = '';
                
                if (line.includes('Results :') || line.includes('RESULTS :')) {
                    const resultMatch = line.match(/Results?\s*:\s*(.+)/i);
                    if (resultMatch) {
                        resultText = resultMatch[1].trim();
                    }
                } else if ((line === 'Results' || line === 'RESULTS') && i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine.startsWith(':')) {
                        resultText = nextLine.substring(1).trim();
                        i++; // Skip the next line since we processed it
                    }
                }
                
                if (resultText) {
                    currentStudent.finalResult = resultText;
                    console.log(`Set result for ${currentStudent.regNo}: ${resultText}`);
                }
                inStudentSection = false;
                continue;
            }
            
            // Skip semester summary lines
            const skipLines = [
                'Semester I II III IV V VI',
                'Credit Applied',
                'Credit Earned',
                'Σ(Ci x Gi)',
                'SGPA',
                '% Conversion',
                'CGPA :'
            ];
            
            // Check for subject information
            if (currentStudent && inStudentSection && line && !skipLines.some(skip => line.includes(skip))) {
                const parts = line.split(/\s+/);
                
                // Check if this is a QP code line
                if (parts.length >= 6 && parts[0].includes(':')) {
                    const qpCode = parts[0].replace(':', '').trim();
                    
                    if (this.validateQPCode(qpCode)) {
                        try {
                            const restOfLine = parts.slice(1).join(' ');
                            const parsed = this.parseQPLine(restOfLine);
                            
                            if (parsed) {
                                const subject = {
                                    qpCode,
                                    subjectName: parsed.subjectName,
                                    marks: parsed.marks,
                                    result: parsed.result === 'F' || parsed.result === 'F*' ? 'Fail' : 'Pass',
                                    credits: parsed.credit,
                                    grade: parsed.grade.replace(/[+\-*]/g, '')
                                };
                                
                                currentStudent.semesterResults[0].subjects.push(subject);
                                console.log(`Added subject for ${currentStudent.regNo}: ${qpCode} - ${parsed.subjectName}`);
                            }
                        } catch (error) {
                            console.warn(`Error parsing QP line: ${line}`, error);
                        }
                    }
                }
            }
        }
    }

    static validateQPCode(qpCode) {
        if (!qpCode || qpCode.length < 6) return false;
        
        const patterns = [
            /^\d{2}[A-Z]{2}\d{2}[A-Z]$/,
            /^\d{2}[A-Z]{2}\d{2}[A-Z]\d+$/,
            /^\d{2}[A-Z]+\d{2}[A-Z]$/
        ];
        
        return patterns.some(pattern => pattern.test(qpCode));
    }

    static parseQPLine(restOfLine) {
        // Pattern matching for subject lines - handle number concatenated to subject name
        // Example: "TRANSPORTATION ENGINEERING182 / 03 / 25F 0 F"
        
        // First try - standard pattern with space before marks
        const standardPattern = /^(.+?)\s+(\d+)\s*\/\s*(\d+|AB|--)\s*\/\s*(\d+|AB|--)\s*([PF]\*?)\s*(\d+)\s*([A-F][+\-*]?)$/;
        let match = restOfLine.match(standardPattern);
        
        if (match) {
            const [, subjectName, ia, tr, pr, result, credit, grade] = match;
            return {
                subjectName: subjectName.trim(),
                marks: {
                    IA: this.parseMarkValue(ia),
                    Tr: this.parseMarkValue(tr),
                    Pr: this.parseMarkValue(pr)
                },
                result: result.replace('*', ''),
                credit: parseInt(credit),
                grade: grade || ''
            };
        }
        
        // Second try - number concatenated to subject name
        // Match subject name ending with numbers, followed by marks
        const concatenatedPattern = /^(.+?)(\d+)\s*\/\s*(\d+|AB|--)\s*\/\s*(\d+|AB|--)\s*([PF]\*?)\s*(\d+)\s*([A-F][+\-*]?)$/;
        match = restOfLine.match(concatenatedPattern);
        
        if (match) {
            let [, subjectPart, ia, tr, pr, result, credit, grade] = match;
            
            // Extract subject name by removing trailing numbers
            let subjectName = subjectPart.replace(/\d+$/, '').trim();
            
            return {
                subjectName: subjectName,
                marks: {
                    IA: this.parseMarkValue(ia),
                    Tr: this.parseMarkValue(tr),
                    Pr: this.parseMarkValue(pr)
                },
                result: result.replace('*', ''),
                credit: parseInt(credit),
                grade: grade || ''
            };
        }
        
        // Third try - alternative pattern for cases like "70P24 B+"
        const alternativePattern = /^(.+?)(\d+)\s*\/\s*(\d+|AB|--)\s*\/\s*(\d+|AB|--)\s*([PF]\*?)(\d+)\s*([A-F][+\-*]?)$/;
        match = restOfLine.match(alternativePattern);
        
        if (match) {
            let [, subjectPart, ia, tr, pr, result, credit, grade] = match;
            
            // Extract subject name by removing trailing numbers
            let subjectName = subjectPart.replace(/\d+$/, '').trim();
            
            return {
                subjectName: subjectName,
                marks: {
                    IA: this.parseMarkValue(ia),
                    Tr: this.parseMarkValue(tr),
                    Pr: this.parseMarkValue(pr)
                },
                result: result.replace('*', ''),
                credit: parseInt(credit),
                grade: grade || ''
            };
        }
        
        return null;
    }

    static parseMarkValue(mark) {
        if (!mark || mark === 'AB' || mark === '--') return 0;
        const parsed = parseInt(mark);
        return isNaN(parsed) ? 0 : parsed;
    }
}

async function testUpdatedParser() {
    try {
        const pdfPath = 'c:/Users/Lekhana/Downloads/Results CE 1-4.pdf';
        const buffer = fs.readFileSync(pdfPath);
        
        console.log('Testing updated parser...');
        const results = await TestParser.parsePDF(buffer);
        
        console.log('\n=== PARSING RESULTS ===');
        console.log(`Students found: ${results.students.length}`);
        
        results.students.forEach((student, index) => {
            const subjectCount = student.semesterResults[0]?.subjects.length || 0;
            console.log(`\n${index + 1}. ${student.regNo} - ${student.name}`);
            console.log(`   Father: ${student.fatherName}`);
            console.log(`   Result: ${student.finalResult}`);
            console.log(`   Subjects: ${subjectCount}`);
            
            if (subjectCount > 0) {
                student.semesterResults[0].subjects.forEach((subject, idx) => {
                    console.log(`     ${idx + 1}. ${subject.qpCode}: ${subject.subjectName}`);
                    console.log(`        Marks: IA=${subject.marks.IA}, Tr=${subject.marks.Tr}, Pr=${subject.marks.Pr}`);
                    console.log(`        Result: ${subject.result}, Grade: ${subject.grade}, Credits: ${subject.credits}`);
                });
            }
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testUpdatedParser();