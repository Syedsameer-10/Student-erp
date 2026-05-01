import { supabase } from '../lib/supabase';
import { fetchStudentRoutingContext, type RecipientRouteType } from './recipientRouting';

export interface LeaveRequestRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  rollNumber: string;
  teacherId: string;
  teacherName: string;
  recipientType: RecipientRouteType;
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
  department?: string;
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
  recipientType: (row.recipient_type || 'Class Teacher') as RecipientRouteType,
  startDate: row.start_date,
  endDate: row.end_date,
  reason: row.reason,
  status: row.status,
  teacherRemarks: row.teacher_remarks || undefined,
  timestamp: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchStudentLeaveContext = async (profileId: string) => {
  return fetchStudentRoutingContext(profileId);
};

export const fetchTeachersForClass = async (input: { className: string; categoryId?: string; classTeacher?: string }) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('teachers')
    .select('profile_id, name, subject, subjects, standards, assigned_class, category_id')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  const normalizedClass = input.className.trim().toLowerCase();
  const normalizedTeacher = input.classTeacher?.trim().toLowerCase();

  const scoredTeachers = (data || [])
    .filter((row: any) => row.profile_id)
    .map((row: any) => {
      const standards = ((row.standards || []) as string[]).filter(Boolean);
      const assignedClass = String(row.assigned_class || '').trim();
      const categoryId = String(row.category_id || '').trim();
      const matchesStandard = standards.some((value) => value.trim().toLowerCase() === normalizedClass);
      const matchesAssignedClass = assignedClass.toLowerCase() === normalizedClass;
      const matchesCategory = Boolean(input.categoryId && categoryId === input.categoryId);
      const matchesClassTeacher = Boolean(normalizedTeacher && String(row.name || '').trim().toLowerCase() === normalizedTeacher);
      const score =
        (matchesStandard ? 4 : 0) +
        (matchesAssignedClass ? 3 : 0) +
        (matchesClassTeacher ? 2 : 0) +
        (matchesCategory ? 1 : 0);

      return {
        row,
        score,
      };
    })
    .filter(({ score }) => score > 0);

  const fallbackTeachers = scoredTeachers.length
    ? scoredTeachers
    : (data || [])
        .filter((row: any) => row.profile_id)
        .filter((row: any) => !input.categoryId || row.category_id === input.categoryId)
        .map((row: any) => ({ row, score: 0 }));

  const deduped = new Map<string, TeacherOption>();

  fallbackTeachers
    .sort((left, right) => right.score - left.score || String(left.row.name).localeCompare(String(right.row.name)))
    .forEach(({ row }: any) => {
      if (deduped.has(row.profile_id)) {
        return;
      }

      deduped.set(row.profile_id, {
      id: row.profile_id as string,
      name: row.name as string,
      subject: row.subject as string,
      subjects: (row.subjects || (row.subject ? [row.subject] : [])) as string[],
      classes: ([...(row.standards || []), row.assigned_class].filter(Boolean)) as string[],
      department: row.category_id as string,
    });
    });

  return Array.from(deduped.values());
};

export const fetchStudentLeaveRequests = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('leave_requests')
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, recipient_type, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
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
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, recipient_type, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
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
  recipientType: RecipientRouteType;
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
      recipient_type: request.recipientType,
      start_date: request.startDate,
      end_date: request.endDate,
      reason: request.reason,
    })
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, recipient_type, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
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
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, recipient_type, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return mapLeaveRow(data);
};
