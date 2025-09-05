import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { PDFParser } from './services/pdfParser';
import { ApiResponse } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/api/results', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      const response: ApiResponse = {
        success: false,
        error: 'No PDF file uploaded'
      };
      return res.status(400).json(response);
    }

    const parsedResults = await PDFParser.parsePDF(req.file.buffer);
    
    const response: ApiResponse = {
      success: true,
      data: parsedResults
    };

    res.json(response);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse PDF'
    };

    res.status(500).json(response);
  }
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB.'
      });
    }
  }

  const response: ApiResponse = {
    success: false,
    error: error instanceof Error ? error.message : 'Internal server error'
  };

  res.status(500).json(response);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});