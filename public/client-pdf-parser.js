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
                const pageText = textContent.items.map(item => item.str).join(' ');
                rawText += pageText + '\n';
            }
            
            const results = {
                institute: '',
                programme: '',
                resultDate: '',
                students: [],
                rawText
            };

            results.institute = this.extractInstitute(rawText);
            results.programme = this.extractProgramme(rawText);
            results.resultDate = this.extractResultDate(rawText);
            results.students = this.extractStudents(rawText);

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
            
            // Check for Results line
            if (currentStudent && (line.includes('Results :') || (line === 'Results' && i + 1 < lines.length))) {
                let resultText = '';
                
                if (line.includes('Results :')) {
                    const resultMatch = line.match(/Results\s*:\s*(.+)/);
                    if (resultMatch) {
                        resultText = resultMatch[1].trim();
                    }
                } else if (line === 'Results' && i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    const nextMatch = nextLine.match(/:\s*(.+)/);
                    if (nextMatch) {
                        resultText = nextMatch[1].trim();
                        i++;
                    }
                }
                
                if (resultText) {
                    currentStudent.finalResult = resultText;
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
                            }
                        } catch (error) {
                            console.warn(`Error parsing QP line: ${line}`, error);
                        }
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
        // Pattern matching for subject lines
        const slashPattern = /^(.+?)(\d+)\s*\/\s*(\d+|AB|--)\s*\/\s*(\d+|AB|--)\s*([PF]\*?)\s*(\d+)\s*([A-F][+\-*]?)$/;
        let match = restOfLine.match(slashPattern);
        
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
                grade: grade
            };
        }
        
        // Alternative pattern
        const combinedPattern = /^(.+?)(\d+)\s*\/\s*(\d+|AB|--)\s*\/\s*(\d+|AB|--)\s*([PF]\*?)(\d+)\s*([A-F][+\-*]?)$/;
        match = restOfLine.match(combinedPattern);
        
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
                grade: grade
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