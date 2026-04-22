import { supabase } from '../lib/supabase';
import type { AttendanceValue } from '../types/attendance';
import type { IStudent } from '../types/school';

export interface AttendancePreviewRow {
  studentName: string;
  attendance: AttendanceValue[];
}

export interface AttendanceSaveInput {
  sectionId: string;
  attendanceDate: string;
  students: AttendancePreviewRow[];
}

export interface AttendanceSheetRow extends IStudent {
  attendanceStatus: 'Present' | 'Absent';
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

export const generateAttendancePreview = async (file: File) => {
  const client = assertSupabase();
  const formData = new FormData();
  formData.append('image', file);

  const { data, error } = await client.functions.invoke('ai-attendance', {
    body: formData,
  });

  if (error) {
    throw error;
  }

  return data as {
    preview: boolean;
    source: string;
    data: {
      students: AttendancePreviewRow[];
    };
  };
};

export const saveAttendanceConfirmation = async ({ sectionId, attendanceDate, students }: AttendanceSaveInput) => {
  const client = assertSupabase();
  const rows = students.map((student) => ({
    section_id: sectionId,
    class_id: sectionId,
    attendance_date: attendanceDate,
    student_id: student.studentName.toLowerCase().replace(/\s+/g, '-'),
    student_name: student.studentName,
    status: student.attendance[student.attendance.length - 1] === 'P' ? 'Present' : 'Absent',
    source: 'AI',
    confidence_score: 0.95,
    metadata: {
      attendanceDays: student.attendance,
      engine: 'Gemini AI',
    },
  }));

  const { data, error } = await client.from('attendance_records').insert(rows).select();

  if (error) {
    throw error;
  }

  return data;
};

export const fetchAttendanceSheet = async (classId: string, attendanceDate: string) => {
  const client = assertSupabase();
  const { data: students, error: studentsError } = await client
    .from('students')
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address, sections!inner(name)')
    .eq('sections.name', classId)
    .order('roll_no', { ascending: true });

  if (studentsError) {
    throw studentsError;
  }

  const studentRows = (students || []).map((student: any) => ({
    id: student.id,
    profileId: student.profile_id,
    name: student.name,
    email: student.email || undefined,
    rollNo: student.roll_no,
    categoryId: student.category_id,
    sectionId: student.section_id,
    gender: student.gender,
    dob: student.dob,
    contact: student.contact,
    parentName: student.parent_name,
    parentContact: student.parent_contact,
    address: student.address,
  })) as IStudent[];

  const { data: attendanceRows, error: attendanceError } = await client
    .from('attendance_records')
    .select('student_id, status')
    .eq('class_id', classId)
    .eq('attendance_date', attendanceDate);

  if (attendanceError) {
    throw attendanceError;
  }

  const attendanceMap = new Map((attendanceRows || []).map((row: any) => [row.student_id, row.status]));

  return studentRows.map((student) => ({
    ...student,
    attendanceStatus: (attendanceMap.get(student.id) as 'Present' | 'Absent') || 'Present',
  }));
};

export const upsertManualAttendance = async (classId: string, attendanceDate: string, students: AttendanceSheetRow[]) => {
  const client = assertSupabase();
  const payload = students.map((student) => ({
    class_id: classId,
    section_id: student.sectionId,
    attendance_date: attendanceDate,
    student_id: student.id,
    student_name: student.name,
    status: student.attendanceStatus,
    source: 'Manual',
    confidence_score: 1,
    metadata: {
      markedFrom: 'AttendanceDashboard',
    },
  }));

  const { error } = await client
    .from('attendance_records')
    .upsert(payload, { onConflict: 'attendance_date,class_id,student_id' });

  if (error) {
    throw error;
  }
};

export const fetchStudentAttendanceSummary = async (studentId: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('attendance_records')
    .select('attendance_date, status, class_id')
    .eq('student_id', studentId)
    .order('attendance_date', { ascending: false });

  if (error) {
    throw error;
  }

  const records = data || [];
  const presentCount = records.filter((record: any) => record.status === 'Present').length;
  const totalCount = records.length;
  const attendanceRate = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  return {
    records,
    presentCount,
    absentCount: totalCount - presentCount,
    totalCount,
    attendanceRate,
  };
};
