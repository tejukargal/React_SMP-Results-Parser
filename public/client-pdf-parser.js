class ClientPDFParser {
    static async parsePDF(file) {
        try {
            // Use PDF.js to extract text from PDF
            const arrayBuffer = await file.arrayBuffer();
            
            // Load PDF.js
            if (!window.pdfjsLib) {
                await this.loadPDFJS();
            }
            
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            
            let rawText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Better text extraction - preserve spacing and line breaks
                let pageText = '';
                let lastY = null;
                
                textContent.items.forEach((item, index) => {
                    // If this is a new line (different Y position), add newline
                    if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                        pageText += '\n';
                    }
                    
                    // Add the text with space if needed
                    if (index > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
                        pageText += ' ';
                    }
                    
                    pageText += item.str;
                    lastY = item.transform[5];
                });
                
                rawText += pageText + '\n';
            }
            
            console.log('Raw text length:', rawText.length);
            console.log('Raw text preview:', rawText.substring(0, 500));
            
            // Debug: Show first 10 lines
            const debugLines = rawText.split('\n').slice(0, 15);
            console.log('First 15 lines:', debugLines);
            
            const results = {
                institute: '',
                programme: '',
                resultDate: '',
                examinationInfo: '',
                students: [],
                rawText
            };

            results.institute = this.extractInstitute(rawText);
            results.programme = this.extractProgramme(rawText);
            results.resultDate = this.extractResultDate(rawText);
            results.examinationInfo = this.extractExaminationInfo(rawText);
            results.students = this.extractStudents(rawText);

            console.log('Parsing results:', {
                institute: results.institute,
                programme: results.programme,
                studentsCount: results.students.length
            });
            
            results.students.forEach((student, index) => {
                console.log(`Student ${index + 1}:`, student.regNo, student.name, `Subjects: ${student.semesterResults[0]?.subjects.length || 0}`);
            });

            return results;
        } catch (error) {
            throw new Error(`Failed to parse PDF: ${error.message}`);
        }
    }
    
    static async loadPDFJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    static extractInstitute(text) {
        const instituteMatch = text.match(/Institute\s*:\s*\d+\s*-\s*\[\s*([^\]]+)\s*\]/i);
        if (instituteMatch) return instituteMatch[1].trim();
        
        const fallbackMatch = text.match(/(?:UNIVERSITY|COLLEGE|INSTITUTION)[^\n]*/i);
        return fallbackMatch ? fallbackMatch[0].trim() : 'Unknown Institute';
    }

    static extractProgramme(text) {
        const programmeMatch = text.match(/Programme\s*:\s*([A-Z]+)\s*-\s*([^\n]+)/i);
        if (programmeMatch) return `${programmeMatch[1]} - ${programmeMatch[2].trim()}`;
        
        const fallbackMatch = text.match(/(?:PROGRAMME|COURSE|BRANCH)[\s:]*([^\n]+)/i);
        return fallbackMatch ? fallbackMatch[1].trim() : 'Unknown Programme';
    }

    static extractResultDate(text) {
        const dateMatch = text.match(/Result Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (dateMatch) return dateMatch[1];
        
        const fallbackMatch = text.match(/(?:DATE|RESULT DATE)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
        return fallbackMatch ? fallbackMatch[1] : new Date().toLocaleDateString();
    }

    static extractExaminationInfo(text) {
        // Look for the specific pattern: "RESULT LEDGER - DIPLOMA EXAMINATION Nov/Dec-2023"
        const examPattern = /RESULT LEDGER\s*-\s*DIPLOMA EXAMINATION\s+([A-Za-z]+\/[A-Za-z]+-\d{4})/i;
        const match = text.match(examPattern);
        
        if (match && match[1]) {
            // Extract the month/year part (e.g., "Nov/Dec-2023")
            const examInfo = match[1];
            // Replace hyphen with space for better formatting
            return examInfo.replace('-', ' ');
        }
        
        // Fallback patterns if the specific format is not found
        const fallbackPatterns = [
            /DIPLOMA.*?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\s]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)?[\/\s]*([12]\d{3})/i,
            /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\s]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)?[\/\s]*([12]\d{3})/i,
            /EXAMINATION.*?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\s]*([12]\d{3})/i
        ];
        
        for (const pattern of fallbackPatterns) {
            const match = text.match(pattern);
            if (match) {
                // Return the examination info in format "Nov/Dec 2023"
                const month1 = match[1] ? match[1].toUpperCase() : '';
                const month2 = match[2] ? match[2].toUpperCase() : '';
                const year = match[3] || '';
                
                if (month1 && month2 && year) {
                    return `${month1}/${month2} ${year}`;
                } else if (month1 && year) {
                    return `${month1} ${year}`;
                }
            }
        }
        
        // Fallback to result date if no specific examination info found
        const resultDate = this.extractResultDate(text);
        if (resultDate) {
            const dateParts = resultDate.split('/');
            if (dateParts.length === 3) {
                const month = this.getMonthName(parseInt(dateParts[1]));
                const year = dateParts[2];
                return `${month} ${year}`;
            }
        }
        
        return 'Unknown Examination';
    }

    static getMonthName(monthNumber) {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return months[monthNumber - 1] || 'Unknown';
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
        
        console.log(`Processing ${lines.length} lines for parsing...`);
        
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
            
            // Check for student registration number and name - try multiple patterns
            let studentMatch = line.match(/(\d+)\s+(\d+(?:CE|ME|EC|CS|EE)\d+)\s+(.+?)\s*\[\s*S\(D\)\s*\/\s*o\s*:\s*(.+?)\s*\]/);
            
            // If first pattern doesn't match, try alternative patterns
            if (!studentMatch) {
                // Pattern without S(D)/o format
                studentMatch = line.match(/(\d+)\s+(\d+(?:CE|ME|EC|CS|EE)\d+)\s+(.+?)\s*\[\s*(.+?)\s*\]/);
            }
            
            if (!studentMatch) {
                // Simple pattern with just name in brackets
                studentMatch = line.match(/(\d+)\s+(\d+(?:CE|ME|EC|CS|EE)\d+)\s+(.+)/);
                if (studentMatch) {
                    // Try to extract father's name from the end
                    const nameAndFather = studentMatch[3];
                    const bracketMatch = nameAndFather.match(/(.+?)\s*\[\s*(.+?)\s*\]$/);
                    if (bracketMatch) {
                        studentMatch = [studentMatch[0], studentMatch[1], studentMatch[2], bracketMatch[1], bracketMatch[2]];
                    } else {
                        studentMatch = [studentMatch[0], studentMatch[1], studentMatch[2], nameAndFather, 'Unknown'];
                    }
                }
            }
            
            if (studentMatch) {
                const [, sno, regNo, studentName, fatherName] = studentMatch;
                
                console.log(`Found student at line ${i}: ${regNo} - ${studentName} [${fatherName}]`);
                
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
            
            // Check for Results line - handle multiple patterns
            if (currentStudent && (line.includes('Results') || line.includes('RESULTS'))) {
                let resultText = '';
                
                // Pattern 1: "Results : FAILS" (embedded in SGPA line or standalone)
                const resultMatch = line.match(/Results?\s*:\s*([A-Z][A-Z\s]*)/i);
                if (resultMatch) {
                    resultText = resultMatch[1].trim();
                    // Clean up common trailing text
                    resultText = resultText.replace(/\s*(PASS|FAILS?|DISTINCTION|FIRST CLASS|SECOND CLASS).*$/i, '$1');
                }
                
                if (resultText) {
                    currentStudent.finalResult = resultText;
                    console.log(`Set result for ${currentStudent.regNo}: ${resultText}`);
                    inStudentSection = false;
                }
                continue;
            }
            
            // Also check for Results on separate lines (fallback pattern)
            if (currentStudent && inStudentSection && (line === 'Results' || line === 'RESULTS') && i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                if (nextLine.startsWith(':')) {
                    const resultText = nextLine.substring(1).trim();
                    currentStudent.finalResult = resultText;
                    console.log(`Set result for ${currentStudent.regNo}: ${resultText}`);
                    inStudentSection = false;
                    i++; // Skip the next line
                }
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
                
                // Extract semester number from the beginning of the line
                // Pattern: "5 01 20CE53I : TRANSPORTATION ENGINEERING 172 / 04 / 50 F 0 F"
                let semester = null;
                if (parts.length >= 3) {
                    const firstPart = parts[0];
                    // Check if first part is a single digit (1-8) indicating semester
                    if (/^[1-8]$/.test(firstPart)) {
                        semester = parseInt(firstPart);
                    }
                }
                
                // Look for QP code pattern in the line - handle different formats
                let qpCodeIndex = -1;
                let qpCode = '';
                
                // Pattern 1: QP code with colon directly attached (20CE53I:)
                for (let j = 0; j < parts.length; j++) {
                    if (parts[j].includes(':') && this.validateQPCode(parts[j].replace(':', ''))) {
                        qpCodeIndex = j;
                        qpCode = parts[j].replace(':', '').trim();
                        break;
                    }
                }
                
                // Pattern 2: QP code with colon separated by space (20CE53I :)
                if (qpCodeIndex === -1) {
                    for (let j = 0; j < parts.length - 1; j++) {
                        if (parts[j + 1] === ':' && this.validateQPCode(parts[j])) {
                            qpCodeIndex = j;
                            qpCode = parts[j].trim();
                            break;
                        }
                    }
                }
                
                if (qpCodeIndex >= 0 && qpCode) {
                    try {
                        // Get the rest of the line after the QP code and colon
                        let restOfLine;
                        if (parts[qpCodeIndex].includes(':')) {
                            // Colon attached to QP code
                            restOfLine = parts.slice(qpCodeIndex + 1).join(' ');
                        } else {
                            // Colon separate from QP code
                            restOfLine = parts.slice(qpCodeIndex + 2).join(' ');
                        }
                        
                        const parsed = this.parseQPLine(restOfLine);
                        
                        if (parsed) {
                            const subject = {
                                qpCode,
                                subjectName: parsed.subjectName,
                                marks: parsed.marks,
                                result: parsed.result === 'F' || parsed.result === 'F*' ? 'Fail' : 'Pass',
                                credits: parsed.credit,
                                grade: parsed.grade.replace(/[+\-*]/g, ''),
                                semester: semester // Add the semester information
                            };
                            
                            currentStudent.semesterResults[0].subjects.push(subject);
                            console.log(`Added subject for ${currentStudent.regNo}: ${qpCode} - ${parsed.subjectName} (Sem: ${semester})`);
                        }
                    } catch (error) {
                        console.warn(`Error parsing QP line: ${line}`, error);
                    }
                }
            }
            
            // Extract SGPA
            if (currentStudent && line.includes('SGPA') && line.includes('(Atempts)')) {
                currentStudent.sgpa = this.extractSGPA(line);
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

    static extractSGPA(line) {
        const sgpa = {};
        
        const sgpaMatch = line.match(/SGPA\s*\(Atempts\)\s*([\d\.\s\(\)]+)/i);
        
        if (sgpaMatch && sgpaMatch[1]) {
            const values = sgpaMatch[1].match(/(\d+\.\d+)\s*\(\d+\)/g);
            if (values) {
                values.forEach((value, index) => {
                    const sgpaValueMatch = value.match(/(\d+\.\d+)/);
                    if (sgpaValueMatch) {
                        const sgpaValue = parseFloat(sgpaValueMatch[1]);
                        const semesterNumber = index + 1;
                        sgpa[`sem${semesterNumber}`] = sgpaValue;
                    }
                });
            }
        }

        return sgpa;
    }
}