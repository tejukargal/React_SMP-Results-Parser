class StudentResultsApp {
    constructor() {
        this.currentResults = null;
        this.filteredStudents = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        this.initializeEventListeners();
        this.initializeTheme();
    }

    initializeEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // File upload
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('pdf-input');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Extract button
        document.getElementById('extract-btn').addEventListener('click', () => this.extractResults());
        
        // Search and filter
        document.getElementById('search-input').addEventListener('input', (e) => {
            // Convert input to uppercase dynamically
            const cursorPosition = e.target.selectionStart;
            e.target.value = e.target.value.toUpperCase();
            e.target.setSelectionRange(cursorPosition, cursorPosition);
            this.filterResults();
        });
        document.getElementById('result-filter').addEventListener('change', () => this.filterResults());
        
        // Tab navigation
        document.getElementById('structured-tab').addEventListener('click', () => this.switchTab('structured'));
        document.getElementById('analysis-tab').addEventListener('click', () => this.switchTab('analysis'));
        document.getElementById('raw-tab').addEventListener('click', () => this.switchTab('raw'));
        
        // Export and copy buttons
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportToPDF());
        document.getElementById('export-csv-btn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('copy-results-btn').addEventListener('click', () => this.copyResults());
        document.getElementById('copy-raw-btn').addEventListener('click', () => this.copyRawText());
        document.getElementById('debug-btn').addEventListener('click', () => this.showDebugInfo());
        
        // Modal
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('subject-modal').addEventListener('click', (e) => {
            if (e.target.id === 'subject-modal') this.closeModal();
        });
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    }

    toggleTheme() {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    handleDragOver(e) {
        e.preventDefault();
        const uploadArea = document.getElementById('upload-area');
        uploadArea.classList.add('border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/10');
    }

    handleDrop(e) {
        e.preventDefault();
        const uploadArea = document.getElementById('upload-area');
        uploadArea.classList.remove('border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/10');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.selectFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.selectFile(file);
        }
    }

    selectFile(file) {
        if (file.type !== 'application/pdf') {
            this.showError('Please select a PDF file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB');
            return;
        }

        this.selectedFile = file;
        
        // Show file info
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = `(${this.formatFileSize(file.size)})`;
        document.getElementById('file-info').classList.remove('hidden');
        
        // Enable extract button
        document.getElementById('extract-btn').disabled = false;
        
        this.hideError();
        this.hideResults();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async extractResults() {
        if (!this.selectedFile) return;

        this.showLoading();
        this.hideError();
        this.hideResults();

        try {
            // Use client-side PDF parser
            const results = await ClientPDFParser.parsePDF(this.selectedFile);
            
            console.log('Received results from parser:', results);
            console.log('Students array:', results.students);
            console.log('Students count:', results.students?.length || 0);
            
            this.currentResults = results;
            this.displayResults();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('extract-btn').disabled = true;
        document.getElementById('extract-text').textContent = 'Processing...';
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('extract-btn').disabled = false;
        document.getElementById('extract-text').textContent = 'Extract Results';
    }

    showError(message) {
        document.getElementById('error-text').textContent = message;
        document.getElementById('error-message').classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error-message').classList.add('hidden');
    }

    hideResults() {
        document.getElementById('results-container').classList.add('hidden');
    }

    calculateResultStatistics() {
        if (!this.currentResults || !this.currentResults.students) {
            return {
                totalStudents: 0,
                totalPassed: 0,
                totalFailed: 0,
                passPercentage: 0,
                totalDistinction: 0,
                totalFirstClass: 0,
                totalSecondClass: 0,
                totalPass: 0,
                totalFails: 0
            };
        }

        const students = this.currentResults.students;
        const totalStudents = students.length;
        
        let totalPassed = 0;
        let totalFailed = 0;
        let totalDistinction = 0;
        let totalFirstClass = 0;
        let totalSecondClass = 0;
        let totalPass = 0;
        let totalFails = 0;

        students.forEach(student => {
            const result = student.finalResult.toUpperCase();
            
            // Count passed and failed
            if (result.includes('PASS') || result.includes('DISTINCTION') || result.includes('FIRST CLASS') || result.includes('SECOND CLASS')) {
                totalPassed++;
            } else if (result.includes('FAIL')) {
                totalFailed++;
            }
            
            // Count specific result categories
            if (result.includes('DISTINCTION')) {
                totalDistinction++;
            } else if (result.includes('FIRST CLASS')) {
                totalFirstClass++;
            } else if (result.includes('SECOND CLASS')) {
                totalSecondClass++;
            } else if (result === 'PASS') {
                totalPass++;
            } else if (result.includes('FAIL')) {
                totalFails++;
            }
        });

        const passPercentage = totalStudents > 0 ? Math.round((totalPassed / totalStudents) * 100) : 0;

        return {
            totalStudents,
            totalPassed,
            totalFailed,
            passPercentage,
            totalDistinction,
            totalFirstClass,
            totalSecondClass,
            totalPass,
            totalFails
        };
    }

    displayResultAnalysis() {
        const stats = this.calculateResultStatistics();
        
        // Update statistics display
        document.getElementById('total-students').textContent = stats.totalStudents;
        document.getElementById('total-passed').textContent = stats.totalPassed;
        document.getElementById('total-failed').textContent = stats.totalFailed;
        document.getElementById('pass-percentage').textContent = `${stats.passPercentage}%`;
        document.getElementById('total-distinction').textContent = stats.totalDistinction;
        document.getElementById('total-first-class').textContent = stats.totalFirstClass;
        document.getElementById('total-second-class').textContent = stats.totalSecondClass;
        document.getElementById('total-pass').textContent = stats.totalPass;
        document.getElementById('total-fails').textContent = stats.totalFails;
    }

    displayResults() {
        if (!this.currentResults) {
            console.log('No current results to display');
            return;
        }

        console.log('Displaying results:', this.currentResults);
        console.log('Students to display:', this.currentResults.students);

        // Show results container
        document.getElementById('results-container').classList.remove('hidden');
        
        // Display examination info in header
        const examInfoElement = document.getElementById('exam-info');
        if (this.currentResults.examinationInfo && this.currentResults.examinationInfo !== 'Unknown Examination') {
            examInfoElement.textContent = `DIPLOMA EXAMINATION ${this.currentResults.examinationInfo}`;
            examInfoElement.classList.remove('hidden');
        } else {
            examInfoElement.classList.add('hidden');
        }
        
        // Display raw text
        document.getElementById('raw-text').textContent = this.currentResults.rawText;
        
        // Populate result filter dropdown with unique values
        this.populateResultFilter();
        
        // Filter and display students
        this.filteredStudents = [...this.currentResults.students];
        console.log('Filtered students:', this.filteredStudents);
        this.renderStudentsTable();
        
        // Display result analysis if analysis tab is active
        const analysisTab = document.getElementById('analysis-tab');
        if (analysisTab && analysisTab.classList.contains('active')) {
            this.displayResultAnalysis();
        }
    }

    populateResultFilter() {
        const resultFilter = document.getElementById('result-filter');
        
        // Clear existing options except the first one ("All Results")
        while (resultFilter.options.length > 1) {
            resultFilter.remove(1);
        }
        
        // Get unique result values from students
        const uniqueResults = [...new Set(this.currentResults.students.map(student => student.finalResult))];
        
        // Add each unique result as an option
        uniqueResults.forEach(result => {
            if (result && result !== 'Unknown') {
                const option = document.createElement('option');
                option.value = result.toUpperCase();
                option.textContent = result;
                resultFilter.appendChild(option);
            }
        });
    }

    filterResults() {
        if (!this.currentResults) return;

        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const resultFilter = document.getElementById('result-filter').value;

        this.filteredStudents = this.currentResults.students.filter(student => {
            const matchesSearch = !searchTerm || 
                student.regNo.toLowerCase().includes(searchTerm) ||
                student.name.toLowerCase().includes(searchTerm) ||
                student.fatherName.toLowerCase().includes(searchTerm);

            const matchesFilter = !resultFilter || 
                student.finalResult.toUpperCase() === resultFilter.toUpperCase();

            return matchesSearch && matchesFilter;
        });

        this.renderStudentsTable();
        
        // Update analysis if analysis tab is active
        const analysisTab = document.getElementById('analysis-tab');
        if (analysisTab && analysisTab.classList.contains('active')) {
            this.displayResultAnalysis();
        }
    }

    renderStudentsTable() {
        console.log('Rendering students table with:', this.filteredStudents.length, 'students');
        const tbody = document.getElementById('results-tbody');
        const noResults = document.getElementById('no-results');

        if (this.filteredStudents.length === 0) {
            console.log('No filtered students to display');
            tbody.innerHTML = '';
            noResults.classList.remove('hidden');
            return;
        }

        noResults.classList.add('hidden');

        tbody.innerHTML = this.filteredStudents.map(student => {
            const resultClass = this.getResultClass(student.finalResult);
            
            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white" style="width: 20%;">
                        ${student.regNo}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white" style="width: 20%;">
                        ${student.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white" style="width: 20%;">
                        ${student.fatherName}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap" style="width: 20%;">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${resultClass}">
                            ${student.finalResult}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" style="width: 20%;">
                        <button onclick="app.showSubjectDetails('${student.regNo}')" 
                                class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                            View Details
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getResultClass(result) {
        switch (result.toUpperCase()) {
            case 'PASS':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            case 'FAILS':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            case 'DISTINCTION':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    }

    showSubjectDetails(regNo) {
        const student = this.currentResults.students.find(s => s.regNo === regNo);
        if (!student) return;

        document.getElementById('modal-title').textContent = `${student.name} (${student.regNo}) - Subject Details`;
        
        const modalSubjects = document.getElementById('modal-subjects');
        modalSubjects.innerHTML = '';

        let totalSubjects = 0;
        let passedSubjects = 0;
        let failedSubjects = 0;

        student.semesterResults.forEach(semResult => {
            semResult.subjects.forEach(subject => {
                totalSubjects++;
                if (subject.result.toLowerCase() === 'pass') {
                    passedSubjects++;
                } else if (subject.result.toLowerCase() === 'fail') {
                    failedSubjects++;
                }

                const semester = subject.semester || this.extractSemesterFromQPCode(subject.qpCode);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${semester}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span class="px-2 py-1 text-xs font-semibold rounded ${this.getResultClass(subject.result)}">
                            ${subject.result}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${subject.qpCode}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${subject.subjectName}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${subject.marks.IA}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${subject.marks.Tr}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${subject.marks.Pr}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span class="px-2 py-1 text-xs font-semibold rounded ${this.getGradeClass(subject.grade)}">
                            ${subject.grade}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${subject.credits}
                    </td>
                `;
                modalSubjects.appendChild(row);
            });
        });

        // Generate and display the summary
        this.updateSubjectSummary(student.name, passedSubjects, failedSubjects, totalSubjects);

        document.getElementById('subject-modal').classList.remove('hidden');
    }

    updateSubjectSummary(studentName, passed, failed, total) {
        const summaryText = document.getElementById('summary-text');
        
        // Determine gender pronoun (simple heuristic - can be improved)
        const pronouns = this.getPronouns(studentName);
        
        let summaryMessage = `The student has passed in ${passed.toString().padStart(2, '0')} subjects and has failed in ${failed.toString().padStart(2, '0')} subjects. Out of ${total.toString().padStart(2, '0')} subjects ${pronouns.object} has appeared.`;
        
        // Add additional context based on performance
        if (failed === 0) {
            summaryMessage += ` Excellent performance with 100% pass rate!`;
        } else if (passed > failed) {
            summaryMessage += ` Good performance with majority subjects passed.`;
        } else if (failed > passed) {
            summaryMessage += ` Needs improvement in upcoming examinations.`;
        }
        
        summaryText.textContent = summaryMessage;
    }

    getPronouns(name) {
        // Simple gender detection based on common name patterns
        // This is a basic implementation and may not be 100% accurate
        const femalePatterns = ['A$', 'I$', 'AMMA$', 'APPA$'];
        const nameUpper = name.toUpperCase();
        
        const isFemale = femalePatterns.some(pattern => new RegExp(pattern).test(nameUpper));
        
        return {
            subject: isFemale ? 'she' : 'he',
            object: isFemale ? 'she' : 'he',
            possessive: isFemale ? 'her' : 'his'
        };
    }

    extractSemesterFromQPCode(qpCode) {
        if (!qpCode || qpCode.length < 6) return '-';
        
        // Extract semester from various QP code patterns
        
        // Pattern 1: 20CE53I, 20ME41P - semester in 5th position (single digit)
        const match1 = qpCode.match(/^\d{2}[A-Z]{2}(\d)(\d)[A-Z]$/);
        if (match1) {
            const semesterDigit = parseInt(match1[1]);
            return semesterDigit > 0 && semesterDigit <= 8 ? semesterDigit : '-';
        }
        
        // Pattern 2: 20CE1IT, 20EG1P - semester as single digit after department code
        const match2 = qpCode.match(/^\d{2}[A-Z]{2}(\d)[A-Z]*$/);
        if (match2) {
            const semesterDigit = parseInt(match2[1]);
            return semesterDigit > 0 && semesterDigit <= 8 ? semesterDigit : '-';
        }
        
        // Pattern 3: 20EG01P, 20SC02P, 20CS01P, 20AU01T - semester as two digits (01, 02, etc.)
        const match3 = qpCode.match(/^\d{2}[A-Z]{2}0(\d)[A-Z]*$/);
        if (match3) {
            const semesterDigit = parseInt(match3[1]);
            return semesterDigit > 0 && semesterDigit <= 8 ? semesterDigit : '-';
        }
        
        // Pattern 4: More flexible pattern for longer department codes
        const match4 = qpCode.match(/^\d{2}[A-Z]+0?(\d)(\d)?[A-Z]*$/);
        if (match4) {
            const semesterDigit = parseInt(match4[1]);
            return semesterDigit > 0 && semesterDigit <= 8 ? semesterDigit : '-';
        }
        
        // If no pattern matches, try to find any single digit that could be a semester
        const digits = qpCode.match(/\d/g);
        if (digits && digits.length >= 3) {
            // Skip the first two digits (year), look for semester digit
            for (let i = 2; i < digits.length; i++) {
                const digit = parseInt(digits[i]);
                if (digit > 0 && digit <= 8) {
                    return digit;
                }
            }
        }
        
        return '-';
    }

    getGradeClass(grade) {
        switch (grade) {
            case 'A':
            case 'S':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            case 'B':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
            case 'C':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'D':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
            case 'F':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    }

    getResultClass(result) {
        switch (result.toLowerCase()) {
            case 'pass':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            case 'fail':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    }

    closeModal() {
        document.getElementById('subject-modal').classList.add('hidden');
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active', 'border-blue-500', 'text-blue-600', 'dark:text-blue-400');
            btn.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Activate selected tab
        const tabButton = document.getElementById(`${tab}-tab`);
        const tabContent = document.getElementById(`${tab}-content`);

        tabButton.classList.add('active', 'border-blue-500', 'text-blue-600', 'dark:text-blue-400');
        tabButton.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        tabContent.classList.remove('hidden');
        
        // If switching to analysis tab, display the analysis
        if (tab === 'analysis' && this.currentResults) {
            this.displayResultAnalysis();
        }
    }

    async exportToPDF() {
        if (!this.currentResults) return;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Title
            doc.setFontSize(16);
            const examInfo = this.currentResults.examinationInfo || 'Unknown Examination';
            doc.text(`DIPLOMA EXAMINATION ${examInfo}`, 20, 20);
            doc.text('Student Results Report', 20, 30);
            
            // Institute info
            doc.setFontSize(10);
            doc.text(`Institute: ${this.currentResults.institute}`, 20, 45);
            doc.text(`Programme: ${this.currentResults.programme}`, 20, 52);
            doc.text(`Date: ${this.currentResults.resultDate}`, 20, 59);
            
            // Table headers
            let y = 75;
            doc.setFontSize(8);
            doc.text('Reg. No.', 20, y);
            doc.text('Name', 60, y);
            doc.text('Father\'s Name', 110, y);
            doc.text('Result', 160, y);
            
            // Draw line
            doc.line(20, y + 2, 180, y + 2);
            y += 8;
            
            // Table data
            this.filteredStudents.forEach(student => {
                if (y > 280) { // New page
                    doc.addPage();
                    y = 20;
                }
                
                doc.text(student.regNo, 20, y);
                doc.text(student.name.substring(0, 20), 60, y);
                doc.text(student.fatherName.substring(0, 20), 110, y);
                doc.text(student.finalResult, 160, y);
                y += 6;
            });
            
            doc.save('student-results.pdf');
        } catch (error) {
            this.showError('Failed to export PDF: ' + error.message);
        }
    }

    async exportToCSV() {
        if (!this.currentResults) return;

        try {
            // Create CSV content
            let csvContent = '';
            
            // Add title row
            const examInfo = this.currentResults.examinationInfo || 'Unknown Examination';
            csvContent += `"DIPLOMA EXAMINATION ${examInfo}"\n`;
            csvContent += '"Student Results Report"\n\n';
            
            // Add header info
            csvContent += `"Institute: ${this.currentResults.institute}"\n`;
            csvContent += `"Programme: ${this.currentResults.programme}"\n`;
            csvContent += `"Date: ${this.currentResults.resultDate}"\n\n`;
            
            // Add CSV header
            csvContent += '"Reg. No.","Name","Father\'s Name","Result"\n';
            
            // Add data rows
            this.filteredStudents.forEach(student => {
                csvContent += `"${student.regNo}","${student.name}","${student.fatherName}","${student.finalResult}"\n`;
            });
            
            // Create and download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'student-results.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccessMessage('CSV file downloaded successfully!');
        } catch (error) {
            this.showError('Failed to export CSV: ' + error.message);
        }
    }

    async copyResults() {
        if (!this.currentResults) return;

        const text = this.generateResultsText();
        
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccessMessage('Results copied to clipboard!');
        } catch (error) {
            this.showError('Failed to copy to clipboard');
        }
    }

    async copyRawText() {
        if (!this.currentResults) return;

        try {
            await navigator.clipboard.writeText(this.currentResults.rawText);
            this.showSuccessMessage('Raw text copied to clipboard!');
        } catch (error) {
            this.showError('Failed to copy to clipboard');
        }
    }

    showDebugInfo() {
        if (!this.currentResults) return;

        const debugDiv = document.getElementById('debug-info');
        const debugContent = document.getElementById('debug-content');
        
        if (debugDiv.classList.contains('hidden')) {
            // Show debug info
            const rawText = this.currentResults.rawText;
            const lines = rawText.split('\n');
            
            let debugText = `Total text length: ${rawText.length}\n`;
            debugText += `Total lines: ${lines.length}\n\n`;
            
            debugText += `First 20 lines:\n`;
            lines.slice(0, 20).forEach((line, index) => {
                debugText += `${(index + 1).toString().padStart(3)}: "${line}"\n`;
            });
            
            debugText += `\nStudent regex test:\n`;
            const studentRegex = /(\d+)\s+(\d+(?:CE|ME|EC|CS|EE)\d+)\s+(.+?)\s*\[\s*S\(D\)\s*\/\s*o\s*:\s*(.+?)\s*\]/;
            let studentMatches = [];
            
            lines.forEach((line, index) => {
                const match = line.match(studentRegex);
                if (match) {
                    studentMatches.push(`Line ${index + 1}: ${match[2]} - ${match[3]} [${match[4]}]`);
                }
            });
            
            debugText += studentMatches.length > 0 ? studentMatches.join('\n') : 'No student matches found';
            
            debugText += `\n\nParsed students: ${this.currentResults.students.length}\n`;
            this.currentResults.students.forEach((student, index) => {
                debugText += `${index + 1}. ${student.regNo} - ${student.name} (Result: ${student.finalResult})\n`;
            });
            
            debugContent.textContent = debugText;
            debugDiv.classList.remove('hidden');
            document.getElementById('debug-btn').textContent = 'Hide Debug Info';
        } else {
            // Hide debug info
            debugDiv.classList.add('hidden');
            document.getElementById('debug-btn').textContent = 'Show Debug Info';
        }
    }

    generateResultsText() {
        let text = `Student Results Report\n`;
        text += `Institute: ${this.currentResults.institute}\n`;
        text += `Programme: ${this.currentResults.programme}\n`;
        text += `Date: ${this.currentResults.resultDate}\n\n`;
        
        text += `${'Reg. No.'.padEnd(15)} ${'Name'.padEnd(25)} ${'Father\'s Name'.padEnd(20)} Result\n`;
        text += '-'.repeat(75) + '\n';
        
        this.filteredStudents.forEach(student => {
            text += `${student.regNo.padEnd(15)} ${student.name.padEnd(25)} ${student.fatherName.padEnd(20)} ${student.finalResult}\n`;
        });
        
        return text;
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Initialize the app
const app = new StudentResultsApp();