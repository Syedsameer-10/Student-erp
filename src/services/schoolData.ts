import { supabase } from '../lib/supabase';
import type { IClassCategory, ISection, IStudent, ITeacher } from '../types/school';

interface CategoryRow {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface SectionRow {
  id: string;
  category_id: string;
  name: string;
  class_teacher: string;
  strength: number;
  room_number: string | null;
}

interface TeacherRow {
  id: string;
  profile_id: string | null;
  name: string;
  category_id: string;
  subject: string;
  qualification: string;
  experience: string;
  contact: string;
  email: string;
  assigned_class: string;
  standards: string[] | null;
}

interface StudentRow {
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  roll_no: string;
  category_id: string;
  section_id: string;
  gender: IStudent['gender'];
  dob: string;
  contact: string;
  parent_name: string;
  parent_contact: string;
  address: string;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

const mapCategory = (row: CategoryRow): IClassCategory => ({
  id: row.id,
  name: row.name,
  description: row.description,
  icon: row.icon,
});

const mapSection = (row: SectionRow): ISection => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  classTeacher: row.class_teacher,
  strength: row.strength,
  roomNumber: row.room_number || undefined,
});

const mapTeacher = (row: TeacherRow): ITeacher => ({
  id: row.id,
  profileId: row.profile_id,
  name: row.name,
  category: row.category_id,
  subject: row.subject,
  qualification: row.qualification,
  experience: row.experience,
  contact: row.contact,
  email: row.email,
  assignedClass: row.assigned_class,
  standards: row.standards || [],
});

const mapStudent = (row: StudentRow): IStudent => ({
  id: row.id,
  profileId: row.profile_id,
  name: row.name,
  email: row.email || undefined,
  rollNo: row.roll_no,
  categoryId: row.category_id,
  sectionId: row.section_id,
  gender: row.gender,
  dob: row.dob,
  contact: row.contact,
  parentName: row.parent_name,
  parentContact: row.parent_contact,
  address: row.address,
});

export const fetchSchoolData = async () => {
  const client = assertSupabase();
  const [categoriesRes, sectionsRes, teachersRes, studentsRes] = await Promise.all([
    client.from('class_categories').select('id, name, description, icon').order('id', { ascending: true }),
    client.from('sections').select('id, category_id, name, class_teacher, strength, room_number').order('name', { ascending: true }),
    client.from('teachers').select('id, profile_id, name, category_id, subject, qualification, experience, contact, email, assigned_class, standards').order('name', { ascending: true }),
    client.from('students').select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address').order('roll_no', { ascending: true }),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (studentsRes.error) throw studentsRes.error;

  return {
    categories: (categoriesRes.data || []).map((row) => mapCategory(row as CategoryRow)),
    sections: (sectionsRes.data || []).map((row) => mapSection(row as SectionRow)),
    teachers: (teachersRes.data || []).map((row) => mapTeacher(row as TeacherRow)),
    students: (studentsRes.data || []).map((row) => mapStudent(row as StudentRow)),
  };
};

export const createSectionRecord = async (section: Omit<ISection, 'id'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('sections')
    .insert({
      category_id: section.categoryId,
      name: section.name,
      class_teacher: section.classTeacher,
      strength: section.strength,
      room_number: section.roomNumber || null,
    })
    .select('id, category_id, name, class_teacher, strength, room_number')
    .single<SectionRow>();

  if (error) throw error;
  return mapSection(data);
};

export const deleteSectionRecord = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client.from('sections').delete().eq('id', id);
  if (error) throw error;
};

export const createTeacherRecord = async (teacher: Omit<ITeacher, 'id'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('teachers')
    .insert({
      profile_id: teacher.profileId || null,
      name: teacher.name,
      category_id: teacher.category,
      subject: teacher.subject,
      qualification: teacher.qualification,
      experience: teacher.experience,
      contact: teacher.contact,
      email: teacher.email,
      assigned_class: teacher.assignedClass,
      standards: teacher.standards || [],
    })
    .select('id, profile_id, name, category_id, subject, qualification, experience, contact, email, assigned_class, standards')
    .single<TeacherRow>();

  if (error) throw error;
  return mapTeacher(data);
};

export const deleteTeacherRecord = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client.from('teachers').delete().eq('id', id);
  if (error) throw error;
};

export const createStudentRecord = async (student: Omit<IStudent, 'id'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .insert({
      profile_id: student.profileId || null,
      name: student.name,
      email: student.email || null,
      roll_no: student.rollNo,
      category_id: student.categoryId,
      section_id: student.sectionId,
      gender: student.gender,
      dob: student.dob,
      contact: student.contact,
      parent_name: student.parentName,
      parent_contact: student.parentContact,
      address: student.address,
    })
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address')
    .single<StudentRow>();

  if (error) throw error;
  return mapStudent(data);
};

export const deleteStudentRecord = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client.from('students').delete().eq('id', id);
  if (error) throw error;
};

export const fetchStudentsByClass = async (className: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address, sections!inner(name)')
    .eq('sections.name', className)
    .order('roll_no', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) =>
    mapStudent({
      id: (row as any).id,
      profile_id: (row as any).profile_id,
      name: (row as any).name,
      email: (row as any).email,
      roll_no: (row as any).roll_no,
      category_id: (row as any).category_id,
      section_id: (row as any).section_id,
      gender: (row as any).gender,
      dob: (row as any).dob,
      contact: (row as any).contact,
      parent_name: (row as any).parent_name,
      parent_contact: (row as any).parent_contact,
      address: (row as any).address,
    })
  );
};

export const fetchTeacherByProfile = async (profileId: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('teachers')
    .select('id, profile_id, name, category_id, subject, qualification, experience, contact, email, assigned_class, standards')
    .eq('profile_id', profileId)
    .maybeSingle<TeacherRow>();

  if (error) throw error;
  return data ? mapTeacher(data) : null;
};

export const fetchStudentByProfile = async (profileId: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address')
    .eq('profile_id', profileId)
    .maybeSingle<StudentRow>();

  if (error) throw error;
  return data ? mapStudent(data) : null;
};
