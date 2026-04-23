import { supabase } from '../lib/supabase';
import { fetchStudentByProfile } from './schoolData';

export type ExamType = 'Quarterly' | 'Half Yearly' | 'Annual';

export const MARK_EXAMS: ExamType[] = ['Quarterly', 'Half Yearly', 'Annual'];

export interface StudentMarkRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  sectionId: string;
  subject: string;
  marks: number;
  maxMarks: number;
  examType: ExamType;
  teacherProfileId?: string | null;
}

export interface TeacherMarkSheetRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  sectionId: string;
  className: string;
  markId?: string;
  marks?: number;
  maxMarks: number;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

export const fetchSubjectsForClass = async (className: string) => {
  const client = assertSupabase();
  const { data: section, error: sectionError } = await client
    .from('sections')
    .select('category_id')
    .eq('name', className)
    .single();

  if (sectionError) {
    throw sectionError;
  }

  const { data, error } = await client
    .from('subjects')
    .select('name')
    .eq('category_id', (section as any).category_id)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row: any) => row.name as string);
};

export const fetchTeacherMarkSheet = async (className: string, subject: string, examType: ExamType) => {
  const client = assertSupabase();
  const { data: students, error: studentsError } = await client
    .from('students')
    .select('id, name, roll_no, section_id, sections!inner(name)')
    .eq('sections.name', className)
    .order('roll_no', { ascending: true });

  if (studentsError) {
    throw studentsError;
  }

  const { data: marks, error: marksError } = await client
    .from('student_marks')
    .select('id, student_id, marks, max_marks')
    .eq('class_name', className)
    .eq('subject_name', subject)
    .eq('exam_type', examType);

  if (marksError) {
    throw marksError;
  }

  const markMap = new Map((marks || []).map((mark: any) => [mark.student_id, mark]));

  return (students || []).map((student: any) => ({
    studentId: student.id,
    studentName: student.name,
    rollNo: student.roll_no,
    sectionId: student.section_id,
    className,
    markId: markMap.get(student.id)?.id,
    marks: markMap.get(student.id)?.marks,
    maxMarks: markMap.get(student.id)?.max_marks || 100,
  })) as TeacherMarkSheetRow[];
};

export const upsertStudentMark = async (row: {
  studentId: string;
  studentName: string;
  sectionId: string;
  className: string;
  subject: string;
  examType: ExamType;
  marks: number;
  maxMarks: number;
  teacherProfileId?: string;
}) => {
  const client = assertSupabase();
  const { error } = await client
    .from('student_marks')
    .upsert({
      student_id: row.studentId,
      student_name: row.studentName,
      section_id: row.sectionId,
      class_name: row.className,
      subject_name: row.subject,
      exam_type: row.examType,
      marks: row.marks,
      max_marks: row.maxMarks,
      teacher_profile_id: row.teacherProfileId || null,
    }, { onConflict: 'student_id,subject_name,exam_type' });

  if (error) {
    throw error;
  }
};

export const fetchStudentMarksByProfile = async (profileId: string, examType?: ExamType) => {
  const student = await fetchStudentByProfile(profileId);
  if (!student) {
    return [];
  }

  const client = assertSupabase();
  let query = client
    .from('student_marks')
    .select('id, student_id, student_name, class_name, section_id, subject_name, marks, max_marks, exam_type, teacher_profile_id')
    .eq('student_id', student.id)
    .order('subject_name', { ascending: true });

  if (examType) {
    query = query.eq('exam_type', examType);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    className: row.class_name,
    sectionId: row.section_id,
    subject: row.subject_name,
    marks: row.marks,
    maxMarks: row.max_marks,
    examType: row.exam_type,
    teacherProfileId: row.teacher_profile_id,
  })) as StudentMarkRecord[];
};

export const fetchInstitutionMarks = async (filters?: { className?: string; examType?: ExamType | 'All'; search?: string }) => {
  const client = assertSupabase();
  let query = client
    .from('student_marks')
    .select('id, student_id, student_name, class_name, section_id, subject_name, marks, max_marks, exam_type, teacher_profile_id')
    .order('class_name', { ascending: true });

  if (filters?.className && filters.className !== 'All') {
    query = query.eq('class_name', filters.className);
  }

  if (filters?.examType && filters.examType !== 'All') {
    query = query.eq('exam_type', filters.examType);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const records = (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    className: row.class_name,
    sectionId: row.section_id,
    subject: row.subject_name,
    marks: row.marks,
    maxMarks: row.max_marks,
    examType: row.exam_type,
    teacherProfileId: row.teacher_profile_id,
  })) as StudentMarkRecord[];

  if (!filters?.search) {
    return records;
  }

  const search = filters.search.toLowerCase();
  return records.filter((record) =>
    record.studentName.toLowerCase().includes(search) ||
    record.subject.toLowerCase().includes(search)
  );
};
