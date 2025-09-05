export interface Subject {
  qpCode: string;
  subjectName: string;
  marks: {
    IA: number;
    Tr: number;
    Pr: number;
  };
  result: string;
  credits: number;
  grade: string;
}

export interface SemesterResult {
  semester: string;
  subjects: Subject[];
}

export interface Student {
  regNo: string;
  name: string;
  fatherName: string;
  semesterResults: SemesterResult[];
  cgpa: string;
  sgpa: { [semester: string]: number };
  finalResult: string;
}

export interface ParsedResults {
  institute: string;
  programme: string;
  resultDate: string;
  students: Student[];
  rawText: string;
}

export interface ApiResponse {
  success: boolean;
  data?: ParsedResults;
  error?: string;
}