import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, FileText, Send, User, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  createLeaveRequest,
  fetchStudentLeaveContext,
  fetchStudentLeaveRequests,
  fetchTeachersForClass,
  type LeaveRequestRecord,
  type TeacherOption,
} from '../../services/leave';

const LeaveRequestForm = () => {
  const { user } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentContext, setStudentContext] = useState<{ id: string; name: string; rollNo: string; className: string } | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    teacherId: '',
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const context = await fetchStudentLeaveContext(user.id);
        if (!active) {
          return;
        }

        setStudentContext(context);

        const [teacherRows, leaveRows] = await Promise.all([
          context ? fetchTeachersForClass(context.className) : Promise.resolve([]),
          fetchStudentLeaveRequests(),
        ]);

        if (!active) {
          return;
        }

        setTeachers(teacherRows);
        setRequests(leaveRows);
        setFormData((current) => ({
          ...current,
          teacherId: current.teacherId || teacherRows[0]?.id || '',
        }));
      } catch (loadError: any) {
        if (active) {
          setError(loadError?.message || 'Unable to load leave request data.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const filteredRequests = useMemo(
    () =>
      requests
        .filter((request) => filterStatus === 'All' || request.status === filterStatus)
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()),
    [requests, filterStatus]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !studentContext || !formData.teacherId) {
      return;
    }

    const selectedTeacher = teachers.find((teacher) => teacher.id === formData.teacherId);
    if (!selectedTeacher) {
      setError('Please choose a valid teacher.');
      return;
    }

    setError(null);

    try {
      const created = await createLeaveRequest({
        studentId: user.id,
        studentName: studentContext.name,
        className: studentContext.className,
        rollNumber: studentContext.rollNo,
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });

      setRequests((current) => [created, ...current]);
      setSubmitted(true);
      window.setTimeout(() => setSubmitted(false), 3000);
      setFormData((current) => ({ ...current, startDate: '', endDate: '', reason: '' }));
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to submit leave request.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText size={24} />
            Submit Leave Request
          </h2>
          <p className="text-indigo-100 text-sm mt-1">Only your own leave requests and your assigned teachers are shown here.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {submitted && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-3 border border-emerald-100 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={20} />
              <p className="text-sm font-bold">Leave request submitted successfully!</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} /> Student Name
              </label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                {studentContext?.name || user?.name || 'Loading...'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} /> Class / Section
              </label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                {studentContext?.className || user?.class || 'Loading...'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Teacher / Department
            </label>
            <select
              value={formData.teacherId}
              onChange={(event) => setFormData({ ...formData, teacherId: event.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
              disabled={isLoading || !teachers.length}
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.subjects.join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} /> Start Date
              </label>
              <input
                required
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} /> End Date
              </label>
              <input
                required
                type="date"
                value={formData.endDate}
                onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Reason for Leave
            </label>
            <textarea
              required
              rows={4}
              value={formData.reason}
              onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none resize-none"
              placeholder="Please explain why you need leave..."
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !teachers.length}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={18} />
            Submit Application
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Leave History</h2>
          <div className="flex gap-2">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === status
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading && (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500">
              Loading leave requests...
            </div>
          )}

          {!isLoading && filteredRequests.map((request) => (
            <div key={request.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Calendar size={18} />
                  <span className="font-bold text-sm">{request.startDate} - {request.endDate}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  request.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                  request.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  {request.status}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Reason</p>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">{request.reason}</p>
              </div>

              {request.teacherRemarks && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">Teacher Remarks</p>
                  <p className="text-sm text-slate-600 italic">"{request.teacherRemarks}"</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span>To: {request.teacherName}</span>
                <span>{new Date(request.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}

          {!isLoading && filteredRequests.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-medium uppercase tracking-widest">No matching leave requests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestForm;
