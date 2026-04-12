import { useState } from 'react';
import { useLeaveStore } from '../../store/useLeaveStore';
import type { LeaveRequest } from '../../store/useLeaveStore';
import { 
  CheckCircle2, XCircle, Clock, 
  Search, Calendar, FileText
} from 'lucide-react';
import { cn } from '../../components/layout/Sidebar';
import { format } from 'date-fns';

const LeaveRequestList = () => {
  const { requests, updateStatus } = useLeaveStore();
  const [filterStatus, setFilterStatus] = useState<LeaveRequest['status'] | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = requests.filter(r => {
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    const matchesSearch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Requests</h2>
          <p className="text-slate-500 text-sm">Review student applications and historical data</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-sm w-full md:w-64"
            />
          </div>
          
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(status => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filterStatus === status 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <div 
              key={request.id} 
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                        {request.studentName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{request.studentName}</h3>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                          Class {request.class} • Roll No: {request.rollNumber}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      request.status === 'Pending' ? "bg-amber-50 text-amber-600" :
                      request.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {request.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Duration</p>
                      <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                        <Calendar size={14} className="text-indigo-500" />
                        {request.startDate} to {request.endDate}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Applied On</p>
                      <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                        <Clock size={14} className="text-indigo-500" />
                        {format(new Date(request.timestamp), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reason</p>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{request.reason}</p>
                  </div>
                </div>

                {request.status === 'Pending' && (
                  <div className="lg:w-64 flex flex-col gap-3 justify-center">
                    <textarea 
                      id={`remarks-${request.id}`}
                      placeholder="Add remarks (optional)..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const remarks = (document.getElementById(`remarks-${request.id}`) as HTMLTextAreaElement)?.value;
                          updateStatus(request.id, 'Approved', remarks);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all text-xs"
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </button>
                      <button 
                        onClick={() => {
                          const remarks = (document.getElementById(`remarks-${request.id}`) as HTMLTextAreaElement)?.value;
                          updateStatus(request.id, 'Rejected', remarks);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-white text-rose-600 border border-rose-100 font-bold rounded-xl hover:bg-rose-50 transition-all text-xs"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No applications found</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">Either no leave requests have been submitted yet or they don't match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveRequestList;
