const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xfjkbhaimsgimmbyzaxt.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
}

const jsonHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

const restHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

const request = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const fetchStudents = async () => {
  const url = `${SUPABASE_URL}/rest/v1/students?select=id,name,email,roll_no,profile_id,section_id,sections!inner(name)&order=roll_no.asc&limit=1000`;
  return request(url, { headers: restHeaders });
};

const fetchTeachers = async () => {
  const url = `${SUPABASE_URL}/rest/v1/teachers?select=id,name,email,profile_id,subject,subjects,assigned_class,standards&order=name.asc&limit=1000`;
  return request(url, { headers: restHeaders });
};

const createAuthUser = async (student) => {
  const payload = {
    email: student.email,
    password: 'password',
    email_confirm: true,
    user_metadata: {
      name: student.name,
      role: student.role,
    },
  };

  return request(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
};

const getAuthUserId = (response) => response?.user?.id || response?.id || null;

const upsertProfiles = async (profiles) => {
  if (!profiles.length) {
    return;
  }

  const url = `${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`;
  await request(url, {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(profiles),
  });
};

const updateStudentProfileLink = async (studentId, profileId) => {
  const url = `${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}`;
  await request(url, {
    method: 'PATCH',
    headers: {
      ...jsonHeaders,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ profile_id: profileId }),
  });
};

const updateTeacherProfileLink = async (teacherId, profileId) => {
  const url = `${SUPABASE_URL}/rest/v1/teachers?id=eq.${teacherId}`;
  await request(url, {
    method: 'PATCH',
    headers: {
      ...jsonHeaders,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ profile_id: profileId }),
  });
};

const normalizeSection = (sectionName) => {
  const parts = sectionName.split('-');
  return {
    className: sectionName,
    standard: parts[0] || sectionName,
    section: parts[1] || sectionName,
  };
};

const main = async () => {
  const [students, teachers] = await Promise.all([fetchStudents(), fetchTeachers()]);
  const grouped = new Map();

  for (const student of students) {
    const sectionName = student.sections?.name;
    if (!sectionName) {
      continue;
    }

    if (!grouped.has(sectionName)) {
      grouped.set(sectionName, []);
    }

    grouped.get(sectionName).push(student);
  }

  const targets = [];
  for (const [sectionName, rows] of grouped.entries()) {
    const topTwo = rows
      .slice()
      .sort((left, right) => left.roll_no.localeCompare(right.roll_no, undefined, { numeric: true }))
      .slice(0, 2);

    for (const row of topTwo) {
      targets.push({
        id: row.id,
        name: row.name,
        email: row.email,
        rollNo: row.roll_no,
        sectionName,
        profileId: row.profile_id,
      });
    }
  }

  const createdTeachers = [];
  const createdStudents = [];
  const profileRows = [];

  for (const teacher of teachers) {
    let profileId = teacher.profile_id;
    if (!profileId) {
      const authUser = await createAuthUser({
        email: teacher.email,
        name: teacher.name,
        role: 'Teacher',
      });
      profileId = getAuthUserId(authUser);
      if (!profileId) {
        throw new Error(`Could not determine auth user id for teacher ${teacher.email}.`);
      }
      createdTeachers.push(teacher.email);
      await updateTeacherProfileLink(teacher.id, profileId);
    }

    profileRows.push({
      id: profileId,
      name: teacher.name,
      email: teacher.email,
      role: 'Teacher',
      standard: teacher.assigned_class,
      class_name: teacher.assigned_class,
      section: teacher.assigned_class.split('-')[1] || teacher.assigned_class,
      standards: teacher.standards || [],
      classes: teacher.standards || [],
      subject: teacher.subject || null,
      subjects: teacher.subjects || (teacher.subject ? [teacher.subject] : []),
    });
  }

  for (const student of targets) {
    let profileId = student.profileId;
    if (!profileId) {
      const authUser = await createAuthUser({
        email: student.email,
        name: student.name,
        role: 'Student',
      });
      profileId = getAuthUserId(authUser);
      if (!profileId) {
        throw new Error(`Could not determine auth user id for student ${student.email}.`);
      }
      createdStudents.push(student.email);
      await updateStudentProfileLink(student.id, profileId);
    }

    const { className, standard, section } = normalizeSection(student.sectionName);
    profileRows.push({
      id: profileId,
      name: student.name,
      email: student.email,
      role: 'Student',
      standard,
      class_name: className,
      section,
      standards: [standard],
      classes: [className],
      subject: null,
      subjects: [],
    });
  }

  await upsertProfiles(profileRows);

  console.log(JSON.stringify({
    teacherCount: teachers.length,
    targetCount: targets.length,
    createdTeacherCount: createdTeachers.length,
    createdStudentCount: createdStudents.length,
    createdTeacherEmails: createdTeachers,
    createdStudentEmails: createdStudents,
  }, null, 2));
};

await main();
