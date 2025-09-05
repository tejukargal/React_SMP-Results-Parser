import pdfParse from 'pdf-parse';
import { ParsedResults, Student, Subject, SemesterResult } from '../types';

export class PDFParser {
  static async parsePDF(buffer: Buffer): Promise<ParsedResults> {
    try {
      const pdfData = await pdfParse(buffer);
      const rawText = pdfData.text;
      
      const results: ParsedResults = {
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

      return results;
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static extractInstitute(text: string): string {
    const instituteMatch = text.match(/Institute\s*:\s*\d+\s*-\s*\[\s*([^\]]+)\s*\]/i);
    if (instituteMatch) return instituteMatch[1].trim();
    
    const fallbackMatch = text.match(/(?:UNIVERSITY|COLLEGE|INSTITUTION)[^\n]*/i);
    return fallbackMatch ? fallbackMatch[0].trim() : 'Unknown Institute';
  }

  private static extractProgramme(text: string): string {
    const programmeMatch = text.match(/Programme\s*:\s*([A-Z]+)\s*-\s*([^\n]+)/i);
    if (programmeMatch) return `${programmeMatch[1]} - ${programmeMatch[2].trim()}`;
    
    const fallbackMatch = text.match(/(?:PROGRAMME|COURSE|BRANCH)[\s:]*([^\n]+)/i);
    return fallbackMatch ? fallbackMatch[1].trim() : 'Unknown Programme';
  }

  private static extractResultDate(text: string): string {
    const dateMatch = text.match(/Result Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (dateMatch) return dateMatch[1];
    
    const fallbackMatch = text.match(/(?:DATE|RESULT DATE)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    return fallbackMatch ? fallbackMatch[1] : new Date().toLocaleDateString();
  }

  private static extractExaminationInfo(text: string): string {
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

  private static getMonthName(monthNumber: number): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[monthNumber - 1] || 'Unknown';
  }

  private static extractExaminationInfo(text: string): string {
    // Look for patterns like "DIPLOMA IN XXXXX NOV/DEC 2023" or similar
    const examPatterns = [
      /DIPLOMA.*?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\s]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)?[\/\s]*([12]\d{3})/i,
      /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\s]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)?[\/\s]*([12]\d{3})/i,
      /EXAMINATION.*?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\s]*([12]\d{3})/i
    ];
    
    for (const pattern of examPatterns) {
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

  private static getMonthName(monthNumber: number): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[monthNumber - 1] || 'Unknown';
  }

  private static extractStudents(text: string): Student[] {
    const students: Student[] = [];
    
    // Parse text continuously like Python implementation
    this.parseContinuousText(text, students);

    return students;
  }

  private static parseContinuousText(allText: string, students: Student[]): void {
    const lines = allText.split('\n');
    let currentStudent: Student | null = null;
    let inStudentSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip header lines and page breaks (based on Python skip_phrases)
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
      
      // Check if line contains student registration number and name
      // Pattern supports: CE, ME, EC, CS, EE courses (from Python)
      const studentMatch = line.match(/(\d+)\s+(\d+(?:CE|ME|EC|CS|EE)\d+)\s+(.+?)\s*\[\s*S\(D\)\s*\/\s*o\s*:\s*(.+?)\s*\]/);
      if (studentMatch) {
        const [, sno, regNo, studentName, fatherName] = studentMatch;
        
        // Extract course code for reference
        const courseMatch = regNo.match(/\d+(CE|ME|EC|CS|EE)\d+/);
        const courseCode = courseMatch ? courseMatch[1] : 'Unknown';
        
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
      
      // Check for Results line (can be on same line or next line)
      if (currentStudent && (line.includes('Results :') || (line === 'Results' && i + 1 < lines.length))) {
        let resultText = '';
        
        if (line.includes('Results :')) {
          const resultMatch = line.match(/Results\s*:\s*(.+)/);
          if (resultMatch) {
            resultText = resultMatch[1].trim();
          }
        } else if (line === 'Results' && i + 1 < lines.length) {
          // Look at next line for ": FAILS" pattern
          const nextLine = lines[i + 1].trim();
          const nextMatch = nextLine.match(/:\s*(.+)/);
          if (nextMatch) {
            resultText = nextMatch[1].trim();
            i++; // Skip the next line since we processed it
          }
        }
        
        if (resultText) {
          currentStudent.finalResult = resultText;
        }
        inStudentSection = false;
        continue;
      }
      
      // Skip semester summary lines (from Python skip_lines)
      const skipLines = [
        'Semester I II III IV V VI',
        'Credit Applied',
        'Credit Earned',
        'Σ(Ci x Gi)',
        'SGPA',
        '% Conversion',
        'CGPA :'
      ];
      
      // Check if line contains subject information - ENHANCED PARSING LOGIC
      if (currentStudent && inStudentSection && line && !skipLines.some(skip => line.includes(skip))) {
        const parts = line.split(/\s+/);
        
        // Check if this is a QP code line (starts with QP code pattern)
        if (parts.length >= 6 && parts[0].includes(':')) {
          const qpCode = parts[0].replace(':', '').trim();
          
          // Validate QP code first
          if (this.validateQPCode(qpCode)) {
            try {
              // Join the rest of the line after QP code
              const restOfLine = parts.slice(1).join(' ');
              
              // Parse this using similar logic to Python
              const parsed = this.parseQPLine(restOfLine);
              
              if (parsed) {
                const subject: Subject = {
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
      
      // Extract SGPA if found
      if (currentStudent && line.includes('SGPA') && line.includes('(Atempts)')) {
        currentStudent.sgpa = this.extractSGPA(line);
      }
    }
  }

  private static parseQPLine(restOfLine: string): {
    subjectName: string;
    marks: { IA: number; Tr: number; Pr: number };
    result: string;
    credit: number;
    grade: string;
  } | null {
    // Examples from debug output:
    // "TRANSPORTATION ENGINEERING182  /  03  /  25F    0    F" -> [TRANSPORTATION, ENGINEERING182, /, 03, /, 25F, 0, F]
    // "TRANSPORTATION ENGINEERING225  /  25  /  70P24   B+" -> [TRANSPORTATION, ENGINEERING225, /, 25, /, 70P24, B+]
    
    // First, let's reconstruct this better by looking for the slash patterns
    // The format is: SUBJECT_NAME + MARKS_IA + / + MARKS_TR + / + MARKS_PR + RESULT + CREDIT + GRADE
    
    // Look for pattern with slashes that indicates marks
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
    
    // Try alternative pattern for cases like "70P24   B+" where credit and result are combined
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
    
    // Fallback to the original logic for complex cases
    return this.parseQPLineFallback(restOfLine);
  }

  private static parseQPLineFallback(restOfLine: string): {
    subjectName: string;
    marks: { IA: number; Tr: number; Pr: number };
    result: string;
    credit: number;
    grade: string;
  } | null {
    const parts = restOfLine.trim().split(/\s+/);
    if (parts.length < 6) return null;
    
    // Work backwards to find grade (last part)
    const grade = parts[parts.length - 1];
    if (!grade.match(/^[A-F][+\-*]?$/)) return null;
    
    // Try to find credit and result working backwards
    let credit = 0;
    let result = '';
    let endIndex = parts.length - 1;
    
    // Look for credit in second-to-last position
    const secondLast = parts[parts.length - 2];
    if (secondLast.match(/^\d+$/)) {
      credit = parseInt(secondLast);
      endIndex = parts.length - 2;
      
      // Look for result attached to marks
      for (let i = endIndex - 1; i >= 0; i--) {
        const resultMatch = parts[i].match(/([PF]\*?)$/);
        if (resultMatch) {
          result = resultMatch[1];
          const marksPrefix = parts[i].substring(0, parts[i].length - result.length);
          if (marksPrefix) {
            parts[i] = marksPrefix;
          }
          break;
        }
      }
    }
    
    if (!result) return null;
    
    // Everything before endIndex should be subject name + marks
    const beforeResult = parts.slice(0, endIndex);
    const subjectAndMarks = beforeResult.join(' ');
    
    const { subjectName, marks } = this.separateSubjectAndMarks(subjectAndMarks);
    
    return {
      subjectName,
      marks: this.parseMarksString(marks),
      result,
      credit,
      grade
    };
  }




  private static validateQPCode(qpCode: string): boolean {
    if (!qpCode || qpCode.length < 6) return false;
    
    const patterns = [
      /^\d{2}[A-Z]{2}\d{2}[A-Z]$/,     // 20CE53I
      /^\d{2}[A-Z]{2}\d{2}[A-Z]\d+$/,  // Extended with numbers
      /^\d{2}[A-Z]+\d{2}[A-Z]$/        // Variable length dept codes
    ];
    
    return patterns.some(pattern => pattern.test(qpCode));
  }

  private static separateSubjectAndMarks(middleText: string): { subjectName: string, marks: string } {
    if (!middleText.trim()) {
      return { subjectName: 'Unknown Subject', marks: '--' };
    }
    
    // Known subject patterns that might contain numbers
    const specialSubjects = [
      'SAHITHYA SINCHANA-2',
      'BALAKE KANNADA-2',
      'ENGINEERING MATHEMATICS',
      'TRANSPORTATION ENGINEERING',
      'CONSTRUCTION MATERIALS',
      'COMPUTER AIDED ENGINEERING GRAPHICS',
      'FUNDAMENTALS OF ELECTRICAL & ELECTRONICS ENGG',
      'FUNDAMENTALS OF MECHANICAL ENGINEERING',
      'FUNDAMENTALS OF CIVIL ENGINEERING'
    ];
    
    // Check for special subjects first
    for (const specialSubject of specialSubjects) {
      if (middleText.includes(specialSubject)) {
        const subjectEnd = middleText.indexOf(specialSubject) + specialSubject.length;
        const remainingText = middleText.slice(subjectEnd).trim();
        return {
          subjectName: specialSubject,
          marks: remainingText || '--'
        };
      }
    }
    
    // Try different patterns for marks separation
    const marksPatterns = [
      /^(.+?)\s+(\d{1,3}\s*\/\s*\d{1,3}\s*\/\s*\d{1,3})$/,        // Subject 234 / 36 / 93
      /^(.+?)\s+(\d{1,3}\s*\/\s*\d{1,3}\s*\/\s*--)$/,             // Subject 30 / 29 / --
      /^(.+?)\s+(\d{1,3}\s*\/\s*--\s*\/\s*\d{1,3})$/,             // Subject 155 / -- / 50
      /^(.+?)\s+(\d{1,3}\s*\/\s*AB\s*\/\s*--)$/,                  // Subject 20 / AB / --
      /^(.+?)\s+(\d{1,3}\s*\/\s*\d{1,3}\s*\/\s*AB)$/,             // Subject 33 / 24 / AB
      /^(.+?)\s+(\d{1,3}\s*\/\s*\d{1,3})$/,                       // Subject 30 / 29
      /^(.+?)\s+(\d{1,3}\s*\/\s*--)$/,                            // Subject 24 / --
      /^(.+?)\s+(\d{1,3}\s*\/\s*AB)$/,                            // Subject 33 / AB
      /^(.+?)\s+(\d{2,3})$/,                                      // Subject 234 (2-3 digits)
      /^(.+?)\s+(AB)$/,                                           // Subject AB
      /^(.+?)\s+(--)$/                                            // Subject --
    ];
    
    for (const pattern of marksPatterns) {
      const match = middleText.match(pattern);
      if (match) {
        const potentialSubject = match[1].trim();
        const potentialMarks = match[2].trim();
        
        // Validate the split makes sense
        if (this.isValidSubjectName(potentialSubject) && this.looksLikeMarks(potentialMarks)) {
          return {
            subjectName: potentialSubject,
            marks: potentialMarks
          };
        }
      }
    }
    
    // Fallback: treat entire text as subject name
    return {
      subjectName: middleText,
      marks: '--'
    };
  }

  private static isValidSubjectName(name: string): boolean {
    if (!name || name.length < 3) return false;
    if (!/[A-Za-z]/.test(name)) return false;
    
    const letterCount = (name.match(/[A-Za-z]/g) || []).length;
    const totalCount = name.replace(/\s/g, '').length;
    
    return totalCount > 0 && letterCount / totalCount >= 0.5;
  }

  private static looksLikeMarks(text: string): boolean {
    const patterns = [
      /^\d+\/\d+\/\d+$/,      // 234/36/93
      /^\d+\/\d+\/--$/,       // 30/29/--
      /^\d+\/--\/\d+$/,       // 155/--/50
      /^\d+\/AB\/--$/,        // 20/AB/--
      /^\d+\/\d+\/AB$/,       // 33/24/AB
      /^\d+\/\d+$/,           // 30/29
      /^\d+\/--$/,            // 24/--
      /^\d+\/AB$/,            // 33/AB
      /^\d+$/,                // Single number
      /^AB$/,                 // Absent
      /^--$/                  // Not applicable
    ];
    
    return patterns.some(pattern => pattern.test(text.replace(/\s/g, '')));
  }

  private static parseMarksString(marksStr: string): { IA: number; Tr: number; Pr: number } {
    if (!marksStr || marksStr === '--' || marksStr === 'AB') {
      return { IA: 0, Tr: 0, Pr: 0 };
    }
    
    // Remove spaces and normalize
    const cleanMarks = marksStr.replace(/\s/g, '');
    
    if (cleanMarks.includes('/')) {
      const parts = cleanMarks.split('/');
      return {
        IA: this.parseMarkValue(parts[0] || '--'),
        Tr: this.parseMarkValue(parts[1] || '--'),
        Pr: this.parseMarkValue(parts[2] || '--')
      };
    } else {
      // Single value - typically IA only
      return {
        IA: this.parseMarkValue(cleanMarks),
        Tr: 0,
        Pr: 0
      };
    }
  }

  private static parseMarkValue(mark: string): number {
    if (!mark || mark === 'AB' || mark === '--') return 0;
    const parsed = parseInt(mark);
    return isNaN(parsed) ? 0 : parsed;
  }


  private static extractCGPA(studentSection: string): string {
    // Look for "Credit(s) Pending" or actual CGPA value
    const pendingMatch = studentSection.match(/CGPA[\s:]*Credit\(s\)\s*Pending/i);
    if (pendingMatch) return 'Pending';
    
    const cgpaMatch = studentSection.match(/CGPA[\s:]*(\d+\.?\d*)/i);
    return cgpaMatch ? cgpaMatch[1] : '0.00';
  }

  private static extractSGPA(line: string): { [semester: string]: number } {
    const sgpa: { [semester: string]: number } = {};
    
    // Pattern: SGPA  (Atempts)    7.11 (7)  5.64 (6)  6.08 (3)  6.00 (3)  0.00 (3)  7.00 (1)
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

  private static extractFinalResult(studentSection: string): string {
    // Pattern: Results : FAILS
    const resultMatch = studentSection.match(/Results[\s:]*([A-Z\s]+?)(?:\n|\d)/i);
    if (resultMatch) return resultMatch[1].trim();
    
    const fallbackMatch = studentSection.match(/(?:RESULT|STATUS)[\s:]*([A-Z\s]+?)(?:\n|\s{2,})/i);
    return fallbackMatch ? fallbackMatch[1].trim() : 'UNKNOWN';
  }
}