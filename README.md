# Student Results Parser Web Application

A comprehensive web application for extracting and analyzing student results from PDF files. Built with Node.js, Express, TypeScript, and Tailwind CSS.

## Features

### 🎨 **Modern UI/UX**
- Clean, responsive design that works on all device sizes
- Dark/Light theme toggle with localStorage persistence
- Smooth animations and transitions
- Mobile-first responsive layout

### 📄 **PDF Processing**
- Upload PDF files via drag-and-drop or file selection
- Supports files up to 10MB
- Real-time file validation and preview
- Advanced PDF parsing using pdf-parse library

### 📊 **Data Visualization**
- **Structured Results View**: Clean tabular format with sortable columns
- **Plain Text View**: Raw extracted text for verification
- Expandable rows showing detailed subject-wise marks
- Color-coded result statuses (Pass/Fail/Distinction)

### 🔍 **Search & Filter**
- Real-time search by register number, student name, or father's name
- Filter results by overall status (Pass/Fail/Distinction)
- Instant results highlighting and filtering

### 📤 **Export Options**
- Export structured results to PDF with clean formatting
- Copy results to clipboard (structured text format)
- Copy raw text to clipboard
- Single student or full batch export support

### 🛡️ **Error Handling**
- Comprehensive error handling for invalid files
- Loading states with progress indicators
- Graceful fallbacks for parsing failures
- User-friendly error messages

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for CDN resources)

### Local Development

1. **Serve the files using any static file server:**
   ```bash
   npx serve public
   ```

2. **Or use Python:**
   ```bash
   cd public
   python -m http.server 8000
   ```

3. **Or use Node.js http-server:**
   ```bash
   npm install -g http-server
   cd public
   http-server
   ```

4. **Open your browser**
   Navigate to the localhost URL shown in terminal

### Netlify Deployment

This application is configured for static hosting on Netlify:

1. **Connect Repository**
   - Link your GitHub repository to Netlify

2. **Configure Build Settings**
   - Build command: Leave empty
   - Publish directory: `public`

3. **Deploy**
   - The site will be automatically deployed
   - Uses client-side PDF parsing with PDF.js

## Usage Guide

### 1. **Upload PDF File**
   - Click the upload area or drag-and-drop your PDF file
   - Ensure the file is a valid PDF and under 10MB
   - Supported formats: `.pdf`

### 2. **Extract Results**
   - Click the "Extract Results" button
   - Wait for processing (loading indicator will appear)
   - Results will be displayed automatically

### 3. **View Results**
   - **Structured View**: Sortable table with student details
   - **Raw Text View**: Original extracted text from PDF
   - Switch between tabs as needed

### 4. **Search & Filter**
   - Use the search box for real-time filtering
   - Apply result filters (Pass/Fail/Distinction)
   - Click "View Details" to see subject-wise marks

### 5. **Export Data**
   - **Export to PDF**: Clean formatted report
   - **Copy Results**: Structured text to clipboard
   - **Copy Raw Text**: Original text to clipboard

## Data Structure

The application extracts and structures the following information:

```json
{
  "institute": "Institution Name",
  "programme": "Programme Name", 
  "resultDate": "Result Date",
  "students": [
    {
      "regNo": "308CE20004",
      "name": "STUDENT NAME",
      "fatherName": "FATHER NAME",
      "semesterResults": [
        {
          "semester": "V",
          "subjects": [
            {
              "qpCode": "20CE53I",
              "subjectName": "Subject Name",
              "marks": {"IA": 17, "Tr": 4, "Pr": 50},
              "result": "Pass/Fail",
              "credits": 4,
              "grade": "A/B/C/D/F"
            }
          ]
        }
      ],
      "cgpa": "7.45",
      "sgpa": {"sem1": 7.11, "sem2": 5.64},
      "finalResult": "PASS/FAILS/DISTINCTION"
    }
  ]
}
```

## API Endpoints

### `GET /`
Serves the main HTML application

### `POST /api/results`
Uploads and processes PDF file

**Request:**
- Content-Type: `multipart/form-data`
- Field: `pdf` (PDF file)

**Response:**
```json
{
  "success": true,
  "data": { /* ParsedResults object */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## File Structure

```
├── src/
│   ├── services/
│   │   └── pdfParser.ts      # PDF parsing logic
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── server.ts             # Express server setup
├── public/
│   ├── index.html            # Frontend HTML
│   └── script.js             # Frontend JavaScript
├── uploads/                  # Temporary upload directory
├── package.json
├── tsconfig.json
└── README.md
```

## Technologies Used

- **Backend**: Node.js, Express.js, TypeScript
- **PDF Processing**: pdf-parse
- **File Upload**: Multer
- **Frontend**: HTML5, JavaScript ES6+, Tailwind CSS
- **PDF Export**: jsPDF
- **Build Tools**: TypeScript Compiler, Nodemon

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Sample Test

The application has been tested with the provided sample file:
- **File**: `c:\Users\Lekhana\Downloads\Results CE 1-4.pdf`
- **Size**: ~317KB
- **Status**: ✅ Compatible and parsed successfully

## Troubleshooting

### Common Issues

1. **"PDF file not found"**
   - Ensure the file path is correct
   - Check file permissions

2. **"File size too large"**
   - Maximum file size is 10MB
   - Compress PDF if needed

3. **"Failed to parse PDF"**
   - Ensure PDF is not password protected
   - Try with a different PDF file

4. **Server won't start**
   - Check if port 3000 is available
   - Run `npm install` to install dependencies

### Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (if available)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.

---

**Note**: This application is designed for educational and administrative use in processing student result ledgers from examination boards.