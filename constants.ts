
import { KLevel, TemplateSlot } from './types';

export const INITIAL_TEMPLATE_SLOTS: TemplateSlot[] = [
  // Part A (2 Marks each)
  { slotId: 'Q1', part: 'A', coReq: 'CO1', kReq: KLevel.K2, marks: 2, isMCQ: false, label: '1.' },
  { slotId: 'Q2', part: 'A', coReq: 'CO1', kReq: KLevel.K3, marks: 2, isMCQ: true, label: '2.', subLabel: '(MCQ)' },
  { slotId: 'Q3', part: 'A', coReq: 'CO1', kReq: KLevel.K1, marks: 2, isMCQ: false, label: '3.' },
  { slotId: 'Q4', part: 'A', coReq: 'CO2', kReq: KLevel.K3, marks: 2, isMCQ: true, label: '4.', subLabel: '(MCQ)' },
  { slotId: 'Q5', part: 'A', coReq: 'CO2', kReq: KLevel.K2, marks: 2, isMCQ: false, label: '5.' },

  // Part B (8 Marks)
  { slotId: 'Q6A1', part: 'B', coReq: 'CO1', kReq: KLevel.K2, marks: 8, isMCQ: false, label: '6 (a) (i)' },
  { slotId: 'Q6B1', part: 'B', coReq: 'CO1', kReq: KLevel.K2, marks: 8, isMCQ: false, label: '6 (b) (i)' },

  // Part C (16 Marks Total each)
  { slotId: 'Q7A1', part: 'C', coReq: 'CO1', kReq: KLevel.K3, marks: 10, isMCQ: false, label: '7 (a) (i)' },
  { slotId: 'Q7A2', part: 'C', coReq: 'CO1', kReq: KLevel.K3, marks: 6, isMCQ: false, label: '7 (a) (ii)' },
  { slotId: 'Q7B1', part: 'C', coReq: 'CO1', kReq: KLevel.K3, marks: 10, isMCQ: false, label: '7 (b) (i)' },
  { slotId: 'Q7B2', part: 'C', coReq: 'CO1', kReq: KLevel.K3, marks: 6, isMCQ: false, label: '7 (b) (ii)' },
  
  { slotId: 'Q8A1', part: 'C', coReq: 'CO2', kReq: KLevel.K3, marks: 16, isMCQ: false, label: '8 (a) (i)' },
  { slotId: 'Q8B1', part: 'C', coReq: 'CO2', kReq: KLevel.K3, marks: 16, isMCQ: false, label: '8 (b) (i)' },
];
