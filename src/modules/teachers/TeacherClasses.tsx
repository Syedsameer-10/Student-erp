import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Trash2, Users } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useClassStore } from '../../store/useClassStore';

const TeacherClasses = () => {
  const user = useAuthStore((state) => state.user);
  const initialize = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const students = useClassStore((state) => state.students);
  const addStudent = useClassStore((state) => state.addStudent);
  const deleteStudent = useClassStore((state) => state.deleteStudent);
  const isLoading = useClassStore((state) => state.isLoading);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const allowedClasses = useMemo(
    () => Array.from(new Set([...(user?.classes || []), ...(user?.standards || [])])),
    [user?.classes, user?.standards]
  );

  const visibleSections = useMemo(
    () => sections.filter((section) => allowedClasses.includes(section.name)),
    [sections, allowedClasses]
  );

  useEffect(() => {
    if (!visibleSections.length) {
      setActiveSectionId(null);
      return;
    }

    if (!activeSectionId || !visibleSections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(visibleSections[0].id);
    }
  }, [activeSectionId, visibleSections]);

  const activeSection = visibleSections.find((section) => section.id === activeSectionId) ?? null;

  const visibleStudents = useMemo(
    () => students.filter((student) => student.sectionId === activeSectionId),
    [students, activeSectionId]
  );

  const handleAddStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeSection) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    setError(null);

    try {
      await addStudent({
        name: String(formData.get('name') || ''),
        rollNo: String(formData.get('rollNo') || ''),
        categoryId: activeSection.categoryId,
        sectionId: activeSection.id,
        gender: String(formData.get('gender') || 'Male') as 'Male' | 'Female' | 'Other',
        dob: String(formData.get('dob') || ''),
        contact: String(formData.get('contact') || ''),
        parentName: String(formData.get('parentName') || ''),
        parentContact: String(formData.get('parentContact') || ''),
        address: String(formData.get('address') || ''),
        email: String(formData.get('email') || ''),
      });
      event.currentTarget.reset();
      setShowForm(false);
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to add student.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setError(null);

    try {
      await deleteStudent(studentId);
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Failed to remove student.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Teacher Access</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">My Class Roster</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            You can view and manage only the sections assigned to your teacher profile.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Allowed Classes</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            {allowedClasses.length ? allowedClasses.join(', ') : 'No classes assigned yet'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm">
          Loading teacher roster...
        </div>
      )}

      {!isLoading && !visibleSections.length && (
        <div className="rounded-[2rem] border border-slate-100 bg-white px-8 py-10 text-center shadow-sm">
          <BookOpen size={36} className="mx-auto text-slate-200" />
          <h2 className="mt-4 text-xl font-black text-slate-900">No classes assigned</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add class names to this teacher&apos;s `profiles.classes` or `profiles.standards` arrays in Supabase.
          </p>
        </div>
      )}

      {!!visibleSections.length && (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleSections.map((section) => {
              const sectionStudents = students.filter((student) => student.sectionId === section.id);
              const isActive = section.id === activeSectionId;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`rounded-[2rem] border p-6 text-left shadow-sm transition-all ${
                    isActive
                      ? 'border-emerald-200 bg-emerald-50/60 shadow-emerald-100'
                      : 'border-slate-100 bg-white hover:-translate-y-1 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Section</p>
                      <h2 className="mt-2 text-2xl font-black text-slate-900">{section.name}</h2>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                      <p className="text-lg font-black text-slate-900">{sectionStudents.length}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Students</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2 text-sm text-slate-600">
                    <p>Teacher: <span className="font-semibold text-slate-900">{section.classTeacher}</span></p>
                    <p>Room: <span className="font-semibold text-slate-900">{section.roomNumber || 'TBD'}</span></p>
                  </div>
                </button>
              );
            })}
          </div>

          {activeSection && (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Roster</p>
                  <h2 className="mt-2 text-3xl font-black text-slate-900">{activeSection.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Student records in this section are editable only for the assigned teacher scope.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition-colors hover:bg-emerald-700"
                >
                  {showForm ? <ArrowLeft size={16} /> : <Plus size={16} />}
                  {showForm ? 'Close Form' : 'Add Student'}
                </button>
              </div>

              {showForm && (
                <form onSubmit={handleAddStudent} className="mt-6 grid grid-cols-1 gap-4 rounded-[2rem] border border-slate-100 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-3">
                  <input name="name" required placeholder="Student name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="rollNo" required placeholder="Roll number" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="email" placeholder="Email (optional)" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <select name="gender" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <input name="dob" type="date" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="contact" required placeholder="Student contact" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="parentName" required placeholder="Parent name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="parentContact" required placeholder="Parent contact" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="address" required placeholder="Address" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300 md:col-span-2 xl:col-span-3" />
                  <div className="md:col-span-2 xl:col-span-3">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={16} />
                      {isSaving ? 'Saving...' : 'Create Student Record'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {visibleStudents.map((student) => (
                  <div key={student.id} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{student.rollNo}</p>
                        <h3 className="mt-2 text-xl font-black text-slate-900">{student.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {student.gender} • DOB {student.dob}
                        </p>
                      </div>
                      <button
                        onClick={() => void handleDeleteStudent(student.id)}
                        className="rounded-2xl bg-rose-50 p-3 text-rose-500 transition-colors hover:bg-rose-100"
                        title="Remove student"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-slate-600">
                      <p>Parent: <span className="font-semibold text-slate-900">{student.parentName}</span></p>
                      <p>Parent Contact: <span className="font-semibold text-slate-900">{student.parentContact}</span></p>
                      <p>Student Contact: <span className="font-semibold text-slate-900">{student.contact}</span></p>
                      <p>Address: <span className="font-semibold text-slate-900">{student.address}</span></p>
                    </div>
                  </div>
                ))}

                {!visibleStudents.length && (
                  <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center xl:col-span-2">
                    <Users size={32} className="mx-auto text-slate-200" />
                    <p className="mt-4 text-sm font-medium text-slate-500">No students found in this section yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherClasses;
