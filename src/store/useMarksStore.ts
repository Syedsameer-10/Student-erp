import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExamType = 'Internal' | 'Semester' | 'Assignment';

export interface Mark {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  subject: string;
  marks: number;
  maxMarks: number;
  examType: ExamType;
  teacherId: string;
  timestamp: string;
}

interface MarksState {
  marks: Mark[];
  addMark: (mark: Omit<Mark, 'id' | 'timestamp'>) => void;
  updateMark: (id: string, updatedMark: Partial<Mark>) => void;
  deleteMark: (id: string) => void;
}

export const useMarksStore = create<MarksState>()(
  persist(
    (set) => ({
      marks: [
        {
          id: 'm1',
          studentId: 's101',
          studentName: 'Arjun Kumar',
          class: '10-A',
          subject: 'Mathematics',
          marks: 85,
          maxMarks: 100,
          examType: 'Semester',
          teacherId: 't1',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'm2',
          studentId: 's102',
          studentName: 'Priya Sharma',
          class: '10-A',
          subject: 'Mathematics',
          marks: 92,
          maxMarks: 100,
          examType: 'Semester',
          teacherId: 't1',
          timestamp: new Date().toISOString(),
        }
      ],
      addMark: (mark) => set((state) => ({
        marks: [...state.marks, { ...mark, id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString() }]
      })),
      updateMark: (id, updatedMark) => set((state) => ({
        marks: state.marks.map((m) => (m.id === id ? { ...m, ...updatedMark } : m))
      })),
      deleteMark: (id) => set((state) => ({
        marks: state.marks.filter((m) => m.id !== id)
      })),
    }),
    { name: 'marks-storage' }
  )
);
