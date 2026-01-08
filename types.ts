
export enum KLevel {
  K1 = 'K1',
  K2 = 'K2',
  K3 = 'K3',
  K4 = 'K4'
}

export interface Question {
  id: string;
  text: string;
  co: string;
  kLevel: KLevel;
  marks: number;
  unit: number;
  isMCQ: boolean;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
}

export interface COStatement {
  index: string;
  description: string;
}

export interface BankMetadata {
  department: string;
  courseCode: string;
  courseName: string;
  subjectIncharge: string;
  subjectExpert: string;
  semester: string;
  year: string;
  coStatements: COStatement[];
}

export interface TemplateSlot {
  slotId: string;
  part: 'A' | 'B' | 'C';
  coReq: string;
  kReq: KLevel;
  marks: number;
  isMCQ: boolean;
  label: string;
  subLabel?: string;
  question?: Question;
}

export interface AppState {
  isProcessing: boolean;
  error: string | null;
  bankMetadata: BankMetadata | null;
  allQuestions: Question[];
  templateSlots: TemplateSlot[];
}
