import { useEffect, useMemo, useState } from 'react';
import { Users, AlertTriangle, CalendarDays, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useClassStore } from '../../store/useClassStore';
import {
  fetchAttendanceSheet,
  fetchStudentAttendanceSummary,
  upsertManualAttendance,
  type AttendanceSheetRow,
} from '../../services/attendance';
import { fetchStudentByProfile } from '../../services/schoolData';

const AttendanceDashboard = () => {
  const { user } = useAuthStore();
  const initialize = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const teacherOwnedClass = user?.role === 'Teacher' ? user?.class : undefined;
  const selectableClasses = user?.role === 'Teacher'
    ? (teacherOwnedClass ? [teacherOwnedClass] : [])
    : sections.map((section) => section.name);
  const [selectedClass, setSelectedClass] = useState(teacherOwnedClass || user?.class || '10-A');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceSheetRow[]>([]);
  const [studentSummary, setStudentSummary] = useState<{
    records: Array<{ attendance_date: string; status: 'Present' | 'Absent'; class_id: string }>;
    presentCount: number;
    absentCount: number;
    totalCount: number;
    attendanceRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (user?.role === 'Teacher') {
      setSelectedClass(teacherOwnedClass || '');
    }
  }, [teacherOwnedClass, user?.role]);

  useEffect(() => {
    if (user?.role === 'Student' && user.id) {
      void (async () => {
        const student = await fetchStudentByProfile(user.id);
        if (student) {
          const summary = await fetchStudentAttendanceSummary(student.id);
          setStudentSummary(summary);
        }
      })();
      return;
    }

    if (user?.role === 'Teacher' && !teacherOwnedClass) {
      setAttendanceRows([]);
      return;
    }

    if (user?.role === 'Admin' || user?.role === 'Teacher') {
      setIsLoading(true);
      void fetchAttendanceSheet(selectedClass, attendanceDate)
        .then((rows) => setAttendanceRows(rows))
        .finally(() => setIsLoading(false));
    }
  }, [attendanceDate, selectedClass, teacherOwnedClass, user?.id, user?.role]);

  const handleMark = (id: string, status: 'Present' | 'Absent') => {
    if (user?.role === 'Teacher' && selectedClass !== teacherOwnedClass) {
      setNotice('Only the class teacher can edit attendance for this class.');
      return;
    }

    setAttendanceRows((current) =>
      current.map((student) => (student.id === id ? { ...student, attendanceStatus: status } : student))
    );
  };

  const handleBulk = (status: 'Present' | 'Absent') => {
    if (user?.role === 'Teacher' && selectedClass !== teacherOwnedClass) {
      setNotice('Only the class teacher can edit attendance for this class.');
      return;
    }

    setAttendanceRows((current) => current.map((student) => ({ ...student, attendanceStatus: status })));
  };

  const submitAttendance = async () => {
    if (user?.role === 'Teacher' && selectedClass !== teacherOwnedClass) {
      setNotice('Only the class teacher can submit attendance for this class.');
      return;
    }

    setIsSaving(true);
    try {
      await upsertManualAttendance(selectedClass, attendanceDate, attendanceRows);
      setNotice(`Attendance saved for ${selectedClass} on ${attendanceDate}.`);
      setTimeout(() => setNotice(null), 2500);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      setNotice('Could not save attendance. Please verify attendance permissions and selected class data.');
      setTimeout(() => setNotice(null), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = attendanceRows.filter((student) => student.attendanceStatus === 'Present').length;
  const absentCount = attendanceRows.filter((student) => student.attendanceStatus === 'Absent').length;
  const presentRate = attendanceRows.length ? Math.round((presentCount / attendanceRows.length) * 100) : 0;

  const studentRecords = useMemo(() => studentSummary?.records.slice(0, 10) || [], [studentSummary]);

  if (user?.role === 'Student') {
    return (
      <div className="space-y-6 lg:pb-12 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Academic Presence</h1>
            <p className="text-slate-500 mt-1">Live attendance summary powered by your recorded attendance entries.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100 shadow-sm">
            <TrendingUp size={16} /> {studentSummary?.attendanceRate || 0}% Attendance Rate
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Recorded Days" value={(studentSummary?.totalCount || 0).toString()} color="bg-indigo-600" icon={CalendarDays} />
          <StatCard title="Present Days" value={(studentSummary?.presentCount || 0).toString()} color="bg-emerald-500" icon={CheckCircle2} />
          <StatCard title="Absent Days" value={(studentSummary?.absentCount || 0).toString()} color="bg-rose-500" icon={XCircle} />
          <StatCard title="Current Class" value={user?.class || '-'} color="bg-blue-500" icon={Users} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Recent Attendance Records</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 uppercase text-slate-500 text-xs font-bold tracking-widest">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-100">Date</th>
                  <th className="px-4 py-3 border-b border-slate-100">Class</th>
                  <th className="px-4 py-3 border-b border-slate-100">Status</th>
                </tr>
              </thead>
              <tbody>
                {studentRecords.map((record) => (
                  <tr key={`${record.attendance_date}-${record.class_id}`} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{record.attendance_date}</td>
                    <td className="px-4 py-2.5 text-slate-600">{record.class_id}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${record.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!studentRecords.length && <div className="p-8 text-sm font-medium text-slate-500">No attendance records found yet.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
          <p className="text-slate-500 mt-1">Mark and monitor daily attendance patterns from the live school database.</p>
        </div>
      </div>

      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Overall Present Today" value={`${presentRate}%`} icon={Users} color="bg-emerald-500" />
        <StatCard title="Absent Alert" value={`${absentCount} Students`} icon={AlertTriangle} color="bg-amber-500" />
        <StatCard title="Working Days Logged" value={attendanceRows.length.toString()} icon={CalendarDays} color="bg-blue-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-12">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-200 outline-none"
            >
              {selectableClasses.map((className) => (
                <option key={className} value={className}>Class {className}</option>
              ))}
            </select>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => handleBulk('Present')} disabled={user?.role === 'Teacher' && selectedClass !== teacherOwnedClass} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
              Mark All Present
            </button>
            <button onClick={() => handleBulk('Absent')} disabled={user?.role === 'Teacher' && selectedClass !== teacherOwnedClass} className="flex-1 sm:flex-none px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
              Mark All Absent
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 uppercase text-slate-500 text-xs font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b border-slate-100 w-24">Roll</th>
                <th className="px-4 py-3 border-b border-slate-100">Student</th>
                <th className="px-4 py-3 border-b border-slate-100 text-right w-48">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-slate-500 align-top">{student.rollNo}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] text-indigo-700 font-bold border border-indigo-200 shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 block leading-tight">{student.name}</span>
                        <span className="text-[11px] text-slate-500 leading-tight">
                          {student.gender} · {student.contact}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-medium whitespace-nowrap">
                      <button
                        onClick={() => handleMark(student.id, 'Present')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                          student.attendanceStatus === 'Present'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 size={14} className={student.attendanceStatus === 'Present' ? 'text-emerald-600' : ''} />
                        <span className="hidden sm:inline">Present</span>
                        <span className="sm:hidden">P</span>
                      </button>
                      <button
                        onClick={() => handleMark(student.id, 'Absent')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                          student.attendanceStatus === 'Absent'
                            ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <XCircle size={14} className={student.attendanceStatus === 'Absent' ? 'text-rose-600' : ''} />
                        <span className="hidden sm:inline">Absent</span>
                        <span className="sm:hidden">A</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && attendanceRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-bold">No students found for the selected class.</td>
                </tr>
              )}
            </tbody>
          </table>
          {isLoading && <div className="px-6 py-4 text-sm font-medium text-slate-500">Loading attendance sheet...</div>}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button onClick={() => void submitAttendance()} disabled={isSaving || isLoading || attendanceRows.length === 0 || (user?.role === 'Teacher' && selectedClass !== teacherOwnedClass)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Submit Attendance Log'}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string; icon: typeof Users; color: string }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-xl ${color} text-white shadow-md shrink-0`}>
      <Icon size={24} />
    </div>
    <div>
      <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  </div>
);

export default AttendanceDashboard;
