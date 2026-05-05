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
  const { data: section, error: sectionError } = await client
    .from('sections')
    .select('id')
    .eq('name', input.className)
    .maybeSingle<{ id: string }>();

  if (sectionError) {
    throw sectionError;
  }

  if (!section) {
    return [];
  }

  const [classTeacherRes, assignmentsRes] = await Promise.all([
    client
      .from('teachers')
      .select('profile_id, name, subject, subjects, category_id')
      .eq('home_section_id', section.id)
      .maybeSingle(),
    client
      .from('section_teacher_assignments')
      .select('role, subject, teachers!inner(profile_id, name, subject, subjects, category_id)')
      .eq('section_id', section.id)
      .eq('role', 'Subject Teacher')
      .order('subject', { ascending: true }),
  ]);

  if (classTeacherRes.error) {
    throw classTeacherRes.error;
  }

  if (assignmentsRes.error) {
    throw assignmentsRes.error;
  }

  const deduped = new Map<string, TeacherOption>();
  const classTeacher = classTeacherRes.data;

  if (classTeacher?.profile_id) {
    deduped.set(classTeacher.profile_id, {
      id: classTeacher.profile_id,
      name: classTeacher.name,
      subject: classTeacher.subject || 'General',
      subjects: classTeacher.subjects?.length ? classTeacher.subjects : [classTeacher.subject || 'General'],
      classes: [input.className],
      department: classTeacher.category_id,
    });
  }

  (assignmentsRes.data || []).forEach((assignment: any) => {
      const row = Array.isArray(assignment.teachers) ? assignment.teachers[0] : assignment.teachers;
      if (!row?.profile_id) {
        return;
      }

      const existing = deduped.get(row.profile_id);
      const subjects = Array.from(new Set([
        ...(existing?.subjects || []),
        assignment.subject,
        ...(row.subjects || (row.subject ? [row.subject] : [])),
      ].filter(Boolean)));

      deduped.set(row.profile_id, {
        id: row.profile_id as string,
        name: row.name as string,
        subject: row.subject as string,
        subjects,
        classes: [input.className],
        department: row.category_id as string,
      });
    });

  return Array.from(deduped.values());
};

export const fetchStudentLeaveRequests = async () => {
  const client = assertSupabase();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw authError;
  }

  const { data, error } = await client
    .from('leave_requests')
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, recipient_type, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
    .eq('student_profile_id', user?.id || '')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapLeaveRow);
};

export const fetchTeacherLeaveRequests = async () => {
  const client = assertSupabase();
  const [authRes, profileRes] = await Promise.all([
    client.auth.getUser(),
    client.auth.getUser().then(async ({ data, error }) => {
      if (error) {
        throw error;
      }

      if (!data.user) {
        return null;
      }

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle<{ role: string | null }>();

      if (profileError) {
        throw profileError;
      }

      return {
        id: data.user.id,
        role: profile?.role || null,
      };
    }),
  ]);

  if (authRes.error) {
    throw authRes.error;
  }

  const currentUser = profileRes;
  let query = client
    .from('leave_requests')
    .select('id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, recipient_type, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (currentUser?.role === 'Teacher') {
    query = query.eq('teacher_profile_id', currentUser.id);
  }

  const { data, error } = await query;

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
  const { data, error } = await client.rpc('submit_leave_request', {
    target_teacher_profile_id: request.teacherId,
    target_teacher_name: request.teacherName,
    target_recipient_type: request.recipientType,
    target_start_date: request.startDate,
    target_end_date: request.endDate,
    target_reason: request.reason,
  });

  if (error) {
    throw error;
  }

  return mapLeaveRow(data);
};

export const updateLeaveRequestStatus = async (id: string, status: LeaveRequestRecord['status'], remarks?: string) => {
  const client = assertSupabase();
  const { data, error } = await client.rpc('resolve_leave_request', {
    target_request_id: id,
    next_status: status,
    next_remarks: remarks || null,
  });

  if (error) {
    throw error;
  }

  return mapLeaveRow(data);
};
