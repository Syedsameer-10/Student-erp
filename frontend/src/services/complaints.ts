import { supabase } from '../lib/supabase';
import type {
  Complaint,
  ComplaintDivision,
  ComplaintPriority,
  ComplaintType,
} from '../store/useComplaintStore';

interface ComplaintRow {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  section: string;
  division: ComplaintDivision;
  title: string;
  description: string;
  type: ComplaintType;
  target_id: string;
  target_role: Complaint['targetRole'];
  target_type: NonNullable<Complaint['targetType']> | null;
  priority: ComplaintPriority;
  status: Complaint['status'];
  created_at: string;
  response: string | null;
  resolved_at: string | null;
}

type ComplaintFilters = {
  studentId?: string;
  targetRole?: Complaint['targetRole'];
  targetId?: string;
};

type CreateComplaintInput = Omit<Complaint, 'id' | 'status' | 'createdAt' | 'response' | 'resolvedAt'>;

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

const mapComplaintRow = (row: ComplaintRow): Complaint => ({
  id: row.id,
  studentId: row.student_id,
  studentName: row.student_name,
  class: row.class_name,
  section: row.section,
  division: row.division,
  title: row.title,
  description: row.description,
  type: row.type,
  targetId: row.target_id,
  targetRole: row.target_role,
  targetType: row.target_type || undefined,
  priority: row.priority,
  status: row.status,
  createdAt: row.created_at,
  response: row.response || undefined,
  resolvedAt: row.resolved_at || undefined,
});

export const fetchComplaints = async (filters: ComplaintFilters = {}) => {
  const client = assertSupabase();
  let query = client
    .from('complaints')
    .select('id, student_id, student_name, class_name, section, division, title, description, type, target_id, target_role, target_type, priority, status, created_at, response, resolved_at')
    .order('created_at', { ascending: false });

  if (filters.studentId) {
    query = query.eq('student_id', filters.studentId);
  }

  if (filters.targetRole) {
    query = query.eq('target_role', filters.targetRole);
  }

  if (filters.targetId) {
    query = query.eq('target_id', filters.targetId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(mapComplaintRow);
};

export const createComplaint = async (complaint: CreateComplaintInput) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('complaints')
    .insert({
      student_id: complaint.studentId,
      student_name: complaint.studentName,
      class_name: complaint.class,
      section: complaint.section,
      division: complaint.division,
      title: complaint.title,
      description: complaint.description,
      type: complaint.type,
      target_id: complaint.targetId,
      target_role: complaint.targetRole,
      target_type: complaint.targetType || null,
      priority: complaint.priority,
    })
    .select('id, student_id, student_name, class_name, section, division, title, description, type, target_id, target_role, target_type, priority, status, created_at, response, resolved_at')
    .single<ComplaintRow>();

  if (error) {
    throw error;
  }

  return mapComplaintRow(data);
};

export const resolveComplaint = async (complaintId: string, response?: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('complaints')
    .update({
      status: 'RESOLVED',
      response: response || null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', complaintId)
    .select('id, student_id, student_name, class_name, section, division, title, description, type, target_id, target_role, target_type, priority, status, created_at, response, resolved_at')
    .single<ComplaintRow>();

  if (error) {
    throw error;
  }

  return mapComplaintRow(data);
};
