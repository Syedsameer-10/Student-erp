import { supabase } from '../lib/supabase';
import type { IClassCategory, ISection, ISectionTeacher, IStudent, ITeacher } from '../types/school';

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
  strength: number;
  room_number: string | null;
}

interface TeacherRow {
  id: string;
  profile_id: string | null;
  home_section_id: string | null;
  name: string;
  category_id: string;
  subject: string;
  subjects: string[] | null;
  qualification: string;
  experience: string;
  contact: string;
  email: string;
  home_section?: { name: string | null } | Array<{ name: string | null }> | null;
}

interface TeacherAssignmentRow {
  section_id: string;
  teacher_id: string;
  role: 'Subject Teacher';
  subject: string;
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

const singleRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
};

const mapSection = (row: SectionRow, classTeacher: string, subjectTeachers: ISectionTeacher[] = []): ISection => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  classTeacher,
  subjectTeachers,
  strength: row.strength,
  roomNumber: row.room_number || undefined,
});

const mapTeacher = (row: TeacherRow, subjectTeacherSections: string[], classTeacherSection: string): ITeacher => ({
  id: row.id,
  profileId: row.profile_id,
  name: row.name,
  category: row.category_id,
  subject: row.subject,
  subjects: row.subjects || (row.subject ? [row.subject] : []),
  qualification: row.qualification,
  experience: row.experience,
  contact: row.contact,
  email: row.email,
  assignedClass: classTeacherSection || subjectTeacherSections[0] || '',
  standards: Array.from(new Set([classTeacherSection, ...subjectTeacherSections].filter(Boolean))),
  classTeacherOf: classTeacherSection || undefined,
  subjectTeacherSections,
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
  const [categoriesRes, sectionsRes, teachersRes, assignmentsRes, studentsRes] = await Promise.all([
    client.from('class_categories').select('id, name, description, icon').order('id', { ascending: true }),
    client.from('sections').select('id, category_id, name, strength, room_number').order('name', { ascending: true }),
    client.from('teachers').select('id, profile_id, home_section_id, name, category_id, subject, subjects, qualification, experience, contact, email, home_section:sections!teachers_home_section_id_fkey(name)').order('name', { ascending: true }),
    client.from('section_teacher_assignments').select('section_id, teacher_id, role, subject').eq('role', 'Subject Teacher'),
    client.from('students').select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address').order('roll_no', { ascending: true }),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (studentsRes.error) throw studentsRes.error;

  const sections = (sectionsRes.data || []) as SectionRow[];
  const teachers = (teachersRes.data || []) as TeacherRow[];
  const assignments = (assignmentsRes.data || []) as TeacherAssignmentRow[];

  const sectionNameById = new Map(sections.map((section) => [section.id, section.name]));
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const classTeacherBySectionId = new Map<string, string>();
  const subjectSectionsByTeacherId = new Map<string, string[]>();
  const subjectTeachersBySectionId = new Map<string, ISectionTeacher[]>();

  teachers.forEach((teacher) => {
    if (teacher.home_section_id) {
      classTeacherBySectionId.set(teacher.home_section_id, teacher.name);
    }
  });

  assignments.forEach((assignment) => {
    const sectionName = sectionNameById.get(assignment.section_id);
    const teacher = teacherById.get(assignment.teacher_id);

    if (!sectionName || !teacher) {
      return;
    }

    subjectSectionsByTeacherId.set(assignment.teacher_id, [
      ...(subjectSectionsByTeacherId.get(assignment.teacher_id) || []),
      sectionName,
    ]);

    subjectTeachersBySectionId.set(assignment.section_id, [
      ...(subjectTeachersBySectionId.get(assignment.section_id) || []),
      {
        id: teacher.id,
        name: teacher.name,
        subject: assignment.subject,
      },
    ]);
  });

  return {
    categories: (categoriesRes.data || []).map((row) => mapCategory(row as CategoryRow)),
    sections: sections.map((row) =>
      mapSection(row, classTeacherBySectionId.get(row.id) || 'Unassigned', subjectTeachersBySectionId.get(row.id) || [])
    ),
    teachers: teachers.map((row) =>
      mapTeacher(
        row,
        Array.from(new Set(subjectSectionsByTeacherId.get(row.id) || [])),
        singleRelation(row.home_section)?.name || ''
      )
    ),
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
      strength: section.strength,
      room_number: section.roomNumber || null,
    })
    .select('id, category_id, name, strength, room_number')
    .single<SectionRow>();

  if (error) throw error;
  return mapSection(data, section.classTeacher);
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
      subjects: teacher.subjects || (teacher.subject ? [teacher.subject] : []),
      qualification: teacher.qualification,
      experience: teacher.experience,
      contact: teacher.contact,
      email: teacher.email,
    })
    .select('id, profile_id, home_section_id, name, category_id, subject, subjects, qualification, experience, contact, email, home_section:sections!teachers_home_section_id_fkey(name)')
    .single<TeacherRow>();

  if (error) throw error;

  const assignedClassNames = Array.from(new Set([...(teacher.standards || []), teacher.assignedClass].filter(Boolean)));

  if (assignedClassNames.length) {
    const { data: sectionRows, error: sectionsError } = await client
      .from('sections')
      .select('id')
      .in('name', assignedClassNames);

    if (sectionsError) throw sectionsError;

      const assignmentRows = (sectionRows || []).map((section) => ({
        section_id: section.id,
        teacher_id: data.id,
        teacher_profile_id: data.profile_id,
        role: 'Subject Teacher',
        subject: teacher.subject,
      }));

    if (assignmentRows.length) {
      const { error: assignmentsError } = await client.from('section_teacher_assignments').insert(assignmentRows);
      if (assignmentsError) throw assignmentsError;
    }
  }

  return mapTeacher(data, assignedClassNames, singleRelation(data.home_section)?.name || '');
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
    .select('id, profile_id, home_section_id, name, category_id, subject, subjects, qualification, experience, contact, email, home_section:sections!teachers_home_section_id_fkey(name)')
    .eq('profile_id', profileId)
    .maybeSingle<TeacherRow>();

  if (error) throw error;
  if (!data) {
    return null;
  }

  const { data: assignments, error: assignmentsError } = await client
    .from('section_teacher_assignments')
    .select('section_id, role, sections!inner(name)')
    .eq('teacher_id', data.id)
    .eq('role', 'Subject Teacher');

  if (assignmentsError) throw assignmentsError;

  const assignedSections: string[] = [];

  (assignments || []).forEach((assignment: any) => {
    const sectionName = Array.isArray(assignment.sections) ? assignment.sections[0]?.name : assignment.sections?.name;
    if (!sectionName) {
      return;
    }

    assignedSections.push(sectionName);
  });

  return mapTeacher(data, Array.from(new Set(assignedSections)), singleRelation(data.home_section)?.name || '');
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
