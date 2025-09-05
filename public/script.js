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
        document.getElementById('search-input').addEventListener('input', () => this.filterResults());
        document.getElementById('result-filter').addEventListener('change', () => this.filterResults());
        
        // Tab navigation
        document.getElementById('structured-tab').addEventListener('click', () => this.switchTab('structured'));
        document.getElementById('raw-tab').addEventListener('click', () => this.switchTab('raw'));
        
        // Export and copy buttons
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportToPDF());
        document.getElementById('copy-results-btn').addEventListener('click', () => this.copyResults());
        document.getElementById('copy-raw-btn').addEventListener('click', () => this.copyRawText());
        
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

    displayResults() {
        if (!this.currentResults) {
            console.log('No current results to display');
            return;
        }

        console.log('Displaying results:', this.currentResults);
        console.log('Students to display:', this.currentResults.students);

        // Show results container
        document.getElementById('results-container').classList.remove('hidden');
        
        // Display raw text
        document.getElementById('raw-text').textContent = this.currentResults.rawText;
        
        // Filter and display students
        this.filteredStudents = [...this.currentResults.students];
        console.log('Filtered students:', this.filteredStudents);
        this.renderStudentsTable();
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
                student.finalResult.toUpperCase() === resultFilter;

            return matchesSearch && matchesFilter;
        });

        this.renderStudentsTable();
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
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${student.regNo}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${student.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${student.fatherName}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${resultClass}">
                            ${student.finalResult}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

        student.semesterResults.forEach(semResult => {
            semResult.subjects.forEach(subject => {
                const row = document.createElement('tr');
                row.innerHTML = `
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

        document.getElementById('subject-modal').classList.remove('hidden');
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
    }

    async exportToPDF() {
        if (!this.currentResults) return;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Title
            doc.setFontSize(16);
            doc.text('Student Results Report', 20, 20);
            
            // Institute info
            doc.setFontSize(10);
            doc.text(`Institute: ${this.currentResults.institute}`, 20, 35);
            doc.text(`Programme: ${this.currentResults.programme}`, 20, 42);
            doc.text(`Date: ${this.currentResults.resultDate}`, 20, 49);
            
            // Table headers
            let y = 65;
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