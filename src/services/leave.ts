import { supabase } from '../lib/supabase';

export interface LeaveRequestRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  rollNumber: string;
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  teacherRemarks?: string;
  timestamp: string;
  updatedAt: string;
}

export interface TeacherOption {
  id: string;
  name: string;
  subject: string;
  subjects: string[];
  classes: string[];
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

const mapLeaveRow = (row: any): LeaveRequestRecord => ({
  id: row.id,
  studentId: row.student_profile_id,
  studentName: row.student_name,
  class: row.class_name,
  rollNumber: row.roll_number,
  teacherId: row.teacher_profile_id,
  teacherName: row.teacher_name,
  startDate: row.start_date,
  endDate: row.end_date,
  reason: row.reason,
  status: row.status,
  teacherRemarks: row.teacher_remarks || undefined,
  timestamp: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchStudentLeaveContext = async (profileId: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .select('id, name, roll_no, sections!inner(name)')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: (data as any).id as string,
    name: (data as any).name as string,
    rollNo: (data as any).roll_no as string,
    className: (data as any).sections?.name as string,
  };
};

export const fetchTeachersForClass = async (className: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('teachers')
    .select('profile_id, name, subject, subjects, standards')
    .contains('standards', [className])
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((row: any) => row.profile_id)
    .map((row: any) => ({
      id: row.profile_id as string,
      name: row.name as string,
      subject: row.subject as string,
      subjects: (row.subjects || (row.subject ? [row.subject] : [])) as string[],
      classes: (row.standards || []) as string[],
    })) as TeacherOption[];
};

export const fetchStudentLeaveRequests = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('leave_requests')
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapLeaveRow);
};

export const fetchTeacherLeaveRequests = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('leave_requests')
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapLeaveRow);
};

export const createLeaveRequest = async (request: {
  studentId: string;
  studentName: string;
  className: string;
  rollNumber: string;
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  reason: string;
}) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('leave_requests')
    .insert({
      student_profile_id: request.studentId,
      student_name: request.studentName,
      class_name: request.className,
      roll_number: request.rollNumber,
      teacher_profile_id: request.teacherId,
      teacher_name: request.teacherName,
      start_date: request.startDate,
      end_date: request.endDate,
      reason: request.reason,
    })
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return mapLeaveRow(data);
};

export const updateLeaveRequestStatus = async (id: string, status: LeaveRequestRecord['status'], remarks?: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('leave_requests')
    .update({
      status,
      teacher_remarks: remarks || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return mapLeaveRow(data);
};
