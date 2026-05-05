import { useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle, AlertCircle, Users, BookOpen, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchSubjectsForClass, fetchTeacherMarkScopes, fetchTeacherMarkSheet, MARK_EXAMS, upsertStudentMark, type ExamType, type TeacherMarkScope, type TeacherMarkSheetRow } from '../../services/marks';

const MarksEntry = () => {
  const { user } = useAuthStore();
  const [markScopes, setMarkScopes] = useState<TeacherMarkScope[]>([]);
  const allowedClasses = useMemo(
    () => user?.role === 'Teacher'
      ? Array.from(new Set(markScopes.map((scope) => scope.className)))
      : (user?.classes || []),
    [markScopes, user?.classes, user?.role]
  );
  const allowedSubjects = useMemo(
    () => user?.subjects?.length ? user.subjects : (user?.subject ? [user.subject] : []),
    [user?.subject, user?.subjects]
  );
  const [selectedClass, setSelectedClass] = useState(allowedClasses[0] || '');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(allowedSubjects[0] || '');
  const [examType, setExamType] = useState<ExamType>('Quarterly');
  const [rows, setRows] = useState<TeacherMarkSheetRow[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'Teacher' || !user.id) {
      return;
    }

    void fetchTeacherMarkScopes(user.id)
      .then(setMarkScopes)
      .catch(console.error);
  }, [user?.id, user?.role]);

  useEffect(() => {
    setSelectedClass((current) => current && allowedClasses.includes(current) ? current : (allowedClasses[0] || ''));
  }, [allowedClasses]);

  useEffect(() => {
    if (!selectedClass) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }

    if (user?.role === 'Teacher') {
      const scopedSubjects = markScopes
        .filter((scope) => scope.className === selectedClass)
        .map((scope) => scope.subject);
      const uniqueSubjects = Array.from(new Set(scopedSubjects));
      setSubjects(uniqueSubjects);
      setSelectedSubject((current) => current && uniqueSubjects.includes(current) ? current : (uniqueSubjects[0] || ''));
      return;
    }

    void fetchSubjectsForClass(selectedClass)
      .then((items) => {
        const filtered = allowedSubjects.length ? items.filter((item) => allowedSubjects.includes(item)) : items;
        setSubjects(filtered);
        setSelectedSubject((current) => current && filtered.includes(current) ? current : (filtered[0] || allowedSubjects[0] || ''));
      })
      .catch(console.error);
  }, [allowedSubjects, markScopes, selectedClass, user?.role]);

  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setRows([]);
      return;
    }

    void fetchTeacherMarkSheet(selectedClass, selectedSubject, examType)
      .then(setRows)
      .catch(console.error);
  }, [examType, selectedClass, selectedSubject]);

  const handleSaveMarks = async (studentId: string, studentName: string, sectionId: string, value: string) => {
    const markValue = parseInt(value, 10);
    if (isNaN(markValue) || markValue < 0 || markValue > 100 || !selectedSubject) {
      return;
    }
    const canEditSelectedPair = user?.role !== 'Teacher' || markScopes.some((scope) =>
      scope.className === selectedClass &&
      scope.sectionId === sectionId &&
      scope.subject.toLowerCase() === selectedSubject.toLowerCase()
    );

    if (!canEditSelectedPair) {
      setNotification('You can enter marks only for the subject you handle in this class.');
      setTimeout(() => setNotification(null), 2500);
      return;
    }

    await upsertStudentMark({
      studentId,
      studentName,
      sectionId,
      className: selectedClass,
      subject: selectedSubject,
      examType,
      marks: markValue,
      maxMarks: 100,
      teacherProfileId: user?.id,
    });

    setRows((current) => current.map((row) => row.studentId === studentId ? { ...row, marks: markValue } : row));
    setNotification(`Marks updated for ${studentName}`);
    setTimeout(() => setNotification(null), 2000);
  };

  const visibleRows = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marks Entry</h2>
          <p className="text-slate-500 text-sm">Update and manage student grades only for your assigned classes and subject.</p>
        </div>

        {notification && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
            <CheckCircle size={16} />
            <span className="text-sm font-bold">{notification}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Users size={14} /> Select Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-slate-50/50"
          >
            {allowedClasses.map((className) => (
              <option key={className} value={className}>Class {className}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={14} /> Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-slate-50/50"
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <GraduationCap size={14} /> Exam Type
          </label>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value as ExamType)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-slate-50/50"
          >
            {MARK_EXAMS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
            <Search size={18} /> Load Students
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-8 py-4">Student Name</th>
              <th className="px-8 py-4">Roll No</th>
              <th className="px-8 py-4">Marks Obtained (Max 100)</th>
              <th className="px-8 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visibleRows.map((student) => (
              <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                      {student.studentName.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-900">{student.studentName}</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-slate-500 font-medium">#{student.rollNo}</td>
                <td className="px-8 py-4">
                  <div className="relative max-w-[120px]">
                    <input
                      type="number"
                      defaultValue={student.marks ?? ''}
                      onBlur={(e) => void handleSaveMarks(student.studentId, student.studentName, student.sectionId, e.target.value)}
                      className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-900"
                      placeholder="00"
                      min="0"
                      max="100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">/ 100</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-center">
                  {typeof student.marks === 'number' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle size={10} /> Saved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                      <AlertCircle size={10} /> Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center text-slate-500 font-medium">
                  No students or marks found for your assigned class/subject selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarksEntry;
