import { useEffect, useMemo, useState } from 'react';
import { BookMarked, Plus, Download, CheckCircle, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../../components/common/Modal';
import { useAuthStore } from '../../store/useAuthStore';
import { createAssignment, fetchAssignments, submitAssignment, type Assignment } from '../../services/erpContent';

const Assignments = () => {
  const { user } = useAuthStore();
  const teacherSubjects = user?.subjects?.length ? user.subjects : (user?.subject ? [user.subject] : []);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsgn, setSelectedAsgn] = useState<Assignment | null>(null);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const visibleClasses = useMemo(() => {
    if (user?.role === 'Teacher') {
      return user.classes || [];
    }

    return user?.class ? [user.class] : [];
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadAssignments = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAssignments(user?.role === 'Teacher' ? undefined : visibleClasses);
        if (isMounted) {
          setAssignments(data);
        }
      } catch (error) {
        console.error('Failed to load assignments:', error);
        if (isMounted) {
          setNotification('Unable to load assignments right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAssignments();

    return () => {
      isMounted = false;
    };
  }, [user?.role, visibleClasses]);

  const showToast = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3000);
  };

  const handleAddAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const created = await createAssignment({
        title: formData.get('title') as string,
        subject: (formData.get('subject') as string) || teacherSubjects[0] || 'General',
        class: formData.get('class') as string,
        deadline: formData.get('deadline') as string,
        description: formData.get('description') as string,
        teacher_id: user?.id,
      });

      setAssignments((current) => [created, ...current]);
      setIsModalOpen(false);
      showToast('Assignment created and published!');
    } catch (error) {
      console.error('Failed to create assignment:', error);
      showToast('Could not create the assignment.');
    }
  };

  const handleDownloadSubmissionsReport = (asgn: Assignment) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Submission Report: ${asgn.title}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Subject: ${asgn.subject} | Deadline: ${asgn.deadline}`, 14, 22);

    const tableData = asgn.submissions.map((submission, idx) => [
      idx + 1,
      submission.student_email,
      submission.submitted_at,
      submission.file_name,
      'Accepted',
    ]);

    autoTable(doc, {
      head: [['Sr.', 'Student Email', 'Date Submitted', 'File Name', 'Status']],
      body: tableData.length ? tableData : [['-', 'No submissions yet', '-', '-', '-']],
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`${asgn.title}_submissions.pdf`);
  };

  const handleSubmitAssignment = async (asgn: Assignment) => {
    if (!user?.email) {
      showToast('Student profile is missing an email address.');
      return;
    }

    try {
      const submission = await submitAssignment(asgn.id, user.id, user.email, 'my_submission.pdf');
      setAssignments((current) =>
        current.map((item) =>
          item.id === asgn.id
            ? { ...item, submissions: [...item.submissions, submission] }
            : item
        )
      );
      showToast('Your assignment has been submitted successfully!');
    } catch (error) {
      console.error('Failed to submit assignment:', error);
      showToast('Could not submit the assignment.');
    }
  };

  return (
    <div className="space-y-6 lg:pb-12 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Assignments</h1>
          <p className="text-slate-500 mt-1">Track deadlines and manage coursework submissions.</p>
        </div>
        {user?.role === 'Teacher' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <Plus size={16} /> Create Assignment
          </button>
        )}
      </div>

      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
            <CheckCircle size={20} />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-sm text-slate-500 shadow-sm">
          Loading assignments from Supabase...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {assignments.map((asgn) => {
            const hasSubmitted = asgn.submissions.some((submission) => submission.student_email === user?.email);
            return (
              <div key={asgn.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100/80 hover:shadow-md transition-all group overflow-hidden relative">
                {hasSubmitted && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white px-8 py-1 text-[10px] font-bold uppercase rotate-45 translate-x-6 translate-y-3 z-10">
                    Submitted
                  </div>
                )}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <BookMarked size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{asgn.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">Published in {asgn.subject} · {asgn.class}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="flex items-center gap-1 text-rose-600 text-xs font-bold uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                      <Clock size={12} /> {asgn.deadline}
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed mb-6 bg-slate-50 p-3 rounded-xl min-h-[60px]">
                  {asgn.description}
                </p>

                <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {user?.role === 'Teacher' ? (
                      <button
                        onClick={() => { setSelectedAsgn(asgn); setIsSubmissionsOpen(true); }}
                        className="text-indigo-600 text-sm font-bold hover:underline"
                      >
                        View {asgn.submissions.length} Submissions
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Stored in the live assignments database</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {user?.role === 'Teacher' ? (
                      <button
                        onClick={() => handleDownloadSubmissionsReport(asgn)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <Download size={14} /> Export Submissions
                      </button>
                    ) : (
                      <button
                        disabled={hasSubmitted}
                        onClick={() => void handleSubmitAssignment(asgn)}
                        className={`px-6 py-2 ${hasSubmitted ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20'} rounded-xl font-bold text-xs transition-all active:scale-95`}
                      >
                        {hasSubmitted ? 'Submission Uploaded' : 'Submit Assignment'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && assignments.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-sm text-slate-500 shadow-sm">
          No assignments are available for this profile yet.
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Coursework">
        <form onSubmit={handleAddAssignment} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Assignment Title</label>
            <input name="title" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Select Class</label>
              <select name="class" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm">
                {visibleClasses.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Subject</label>
              <select name="subject" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm">
                {teacherSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Submission Deadline</label>
              <input name="deadline" type="date" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Instructions / Guidelines</label>
            <textarea name="description" rows={4} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all resize-none" />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">Discard</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Launch Assignment</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSubmissionsOpen} onClose={() => setIsSubmissionsOpen(false)} title="Submission Tracking">
        {selectedAsgn && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">{selectedAsgn.title}</h4>
            <div className="space-y-2">
              {selectedAsgn.submissions.length > 0 ? selectedAsgn.submissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{submission.student_email}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{submission.submitted_at}</p>
                  </div>
                  <button
                    onClick={() => showToast(`Recorded file: ${submission.file_name}`)}
                    className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                  >
                    <Download size={14} />
                  </button>
                </div>
              )) : (
                <div className="py-8 text-center text-slate-500 text-sm">No submissions received yet.</div>
              )}
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => handleDownloadSubmissionsReport(selectedAsgn)}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm"
              >
                Download Full PDF Report
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Assignments;
