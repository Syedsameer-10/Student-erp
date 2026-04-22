import { supabase } from '../lib/supabase';

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  class: string;
  deadline: string;
  description: string;
  teacher_id?: string | null;
  submissions: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_email: string;
  submitted_at: string;
  file_name: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  class: string;
  uploadDate: string;
  file: string;
}

export interface SchoolEvent {
  id: string;
  name: string;
  date: string;
  description: string;
  type: string;
  targetAudience: string;
  status: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  status: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentEmail: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  type: string;
  status: string;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

export const fetchAssignments = async (classNames?: string[]) => {
  const client = assertSupabase();
  let query = client
    .from('assignments')
    .select('id, title, subject, class_name, deadline, description, teacher_id, assignment_submissions(id, assignment_id, student_email, submitted_at, file_name)')
    .order('deadline', { ascending: true });

  if (classNames?.length) {
    query = query.in('class_name', classNames);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    class: row.class_name,
    deadline: row.deadline,
    description: row.description,
    teacher_id: row.teacher_id,
    submissions: (row.assignment_submissions || []).map((submission: any) => ({
      id: submission.id,
      assignment_id: submission.assignment_id,
      student_email: submission.student_email,
      submitted_at: submission.submitted_at,
      file_name: submission.file_name,
    })),
  })) as Assignment[];
};

export const createAssignment = async (assignment: Omit<Assignment, 'id' | 'submissions'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('assignments')
    .insert({
      title: assignment.title,
      subject: assignment.subject,
      class_name: assignment.class,
      deadline: assignment.deadline,
      description: assignment.description,
      teacher_id: assignment.teacher_id || null,
    })
    .select('id, title, subject, class_name, deadline, description, teacher_id')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    subject: data.subject,
    class: data.class_name,
    deadline: data.deadline,
    description: data.description,
    teacher_id: data.teacher_id,
    submissions: [],
  } as Assignment;
};

export const submitAssignment = async (assignmentId: string, studentEmail: string, fileName: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('assignment_submissions')
    .insert({
      assignment_id: assignmentId,
      student_email: studentEmail,
      submitted_at: new Date().toISOString().split('T')[0],
      file_name: fileName,
    })
    .select('id, assignment_id, student_email, submitted_at, file_name')
    .single();

  if (error) throw error;
  return data as AssignmentSubmission;
};

export const fetchStudyMaterials = async (classNames?: string[]) => {
  const client = assertSupabase();
  let query = client
    .from('study_materials')
    .select('id, title, subject, class_name, upload_date, file_name')
    .order('upload_date', { ascending: false });

  if (classNames?.length) {
    query = query.in('class_name', classNames);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    class: row.class_name,
    uploadDate: row.upload_date,
    file: row.file_name,
  })) as StudyMaterial[];
};

export const createStudyMaterial = async (material: Omit<StudyMaterial, 'id' | 'uploadDate'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('study_materials')
    .insert({
      title: material.title,
      subject: material.subject,
      class_name: material.class,
      upload_date: new Date().toISOString().split('T')[0],
      file_name: material.file,
    })
    .select('id, title, subject, class_name, upload_date, file_name')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    subject: data.subject,
    class: data.class_name,
    uploadDate: data.upload_date,
    file: data.file_name,
  } as StudyMaterial;
};

export const fetchEvents = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('events')
    .select('id, name, date, description, type, target_audience, status')
    .order('date', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    description: row.description,
    type: row.type,
    targetAudience: row.target_audience,
    status: row.status,
  })) as SchoolEvent[];
};

export const createEvent = async (event: Omit<SchoolEvent, 'id'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('events')
    .insert({
      name: event.name,
      date: event.date,
      description: event.description,
      type: event.type,
      target_audience: event.targetAudience,
      status: event.status,
    })
    .select('id, name, date, description, type, target_audience, status')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    date: data.date,
    description: data.description,
    type: data.type,
    targetAudience: data.target_audience,
    status: data.status,
  } as SchoolEvent;
};

export const fetchBooks = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('library_books')
    .select('id, title, author, category, isbn, total_copies, available_copies, status')
    .order('title', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    isbn: row.isbn,
    totalCopies: row.total_copies,
    availableCopies: row.available_copies,
    status: row.status,
  })) as LibraryBook[];
};

export const createBook = async (book: Omit<LibraryBook, 'id' | 'status'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('library_books')
    .insert({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      total_copies: book.totalCopies,
      available_copies: book.availableCopies,
      status: 'Available',
    })
    .select('id, title, author, category, isbn, total_copies, available_copies, status')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    author: data.author,
    category: data.category,
    isbn: data.isbn,
    totalCopies: data.total_copies,
    availableCopies: data.available_copies,
    status: data.status,
  } as LibraryBook;
};

export const issueBook = async (id: string) => {
  const client = assertSupabase();
  const { data: current, error: currentError } = await client
    .from('library_books')
    .select('available_copies')
    .eq('id', id)
    .single();

  if (currentError) throw currentError;
  if ((current.available_copies || 0) <= 0) throw new Error('No copies available.');

  const { error } = await client
    .from('library_books')
    .update({ available_copies: current.available_copies - 1 })
    .eq('id', id);

  if (error) throw error;
};

export const fetchFeeRecords = async (studentEmail?: string) => {
  const client = assertSupabase();
  let query = client
    .from('fee_records')
    .select('id, student_id, student_email, total_amount, paid_amount, pending_amount, due_date, type, status')
    .order('due_date', { ascending: true });

  if (studentEmail) {
    query = query.eq('student_email', studentEmail);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentEmail: row.student_email,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    pendingAmount: row.pending_amount,
    dueDate: row.due_date,
    type: row.type,
    status: row.status,
  })) as FeeRecord[];
};
