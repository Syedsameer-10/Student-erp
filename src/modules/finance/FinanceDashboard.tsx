import { useEffect, useMemo, useState } from 'react';
import { IndianRupee, Activity, Plus, CheckCircle, Download, CreditCard, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '../../store/useAuthStore';
import { useClassStore } from '../../store/useClassStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { fetchFeeRecords, type FeeRecord } from '../../services/erpContent';

const FinanceDashboard = () => {
  const { user } = useAuthStore();
  const initializeSchoolData = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const [notification, setNotification] = useState<string | null>(null);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState('ALL');

  useEffect(() => {
    void initializeSchoolData();
  }, [initializeSchoolData]);

  useEffect(() => {
    let isMounted = true;

    const loadFees = async () => {
      try {
        const records = await fetchFeeRecords(user?.role === 'Student' ? user.email : undefined);
        if (isMounted) {
          setFeeRecords(records);
        }
      } catch (error) {
        console.error('Failed to load fee records:', error);
      }
    };

    void loadFees();

    return () => {
      isMounted = false;
    };
  }, [user?.email, user?.role]);

  const showToast = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3000);
  };

  const handleCollectFee = () => {
    showToast('Fee records are now read directly from Supabase. Add or update payment rows there to reflect collections.');
  };

  const handleDownloadBill = (fee: FeeRecord) => {
    const doc = new jsPDF();

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255);
    doc.setFontSize(24);
    doc.text('EduSync ERP - Fee Receipt', 14, 25);

    doc.setTextColor(50);
    doc.setFontSize(12);
    doc.text(`Receipt ID: ${fee.id.toUpperCase()}`, 14, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 58);
    doc.text(`Student: ${fee.studentName || user?.name || fee.studentEmail}`, 14, 66);
    doc.text(`Status: ${fee.status}`, 14, 74);

    const breakdown = [
      ['Paid Amount', formatCurrency(Number(fee.paidAmount).toFixed(2))],
      ['Pending Amount', formatCurrency(Number(fee.pendingAmount).toFixed(2))],
      ['Total Amount', formatCurrency(Number(fee.totalAmount).toFixed(2))],
    ];

    autoTable(doc, {
      head: [['Fee Description', 'Amount']],
      body: breakdown,
      startY: 85,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`Fee_Receipt_${fee.type}.pdf`);
    showToast('Bill downloaded successfully!');
  };

  const staffView = user?.role === 'Admin' || user?.role === 'Accountant';

  const visibleRecords = useMemo(() => {
    if (!staffView) {
      return feeRecords;
    }

    return feeRecords.filter((fee) => selectedClass === 'ALL' || fee.sectionName === selectedClass);
  }, [feeRecords, selectedClass, staffView]);

  const totalRevenue = visibleRecords.reduce((sum, fee) => sum + Number(fee.paidAmount), 0);
  const totalPending = visibleRecords.reduce((sum, fee) => sum + Number(fee.pendingAmount), 0);
  const paymentSuccessRate = visibleRecords.length
    ? Math.round((visibleRecords.filter((fee) => fee.status === 'Paid').length / visibleRecords.length) * 100)
    : 0;
  const studentPaidTotal = feeRecords.reduce((sum, fee) => sum + Number(fee.paidAmount), 0);
  const studentPendingTotal = feeRecords.reduce((sum, fee) => sum + Number(fee.pendingAmount), 0);

  return (
    <div className="space-y-6 lg:pb-12 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Records</h1>
          <p className="text-slate-500 mt-1">
            {staffView
              ? 'Track student fee payments, pending balances, and class-wise collection status.'
              : 'View your personal fee statements and download payment receipts.'}
          </p>
        </div>
        {staffView && (
          <button
            onClick={handleCollectFee}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm text-sm active:scale-95"
          >
            <Plus size={16} /> Payment Guidance
          </button>
        )}
      </div>

      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800">
            <CheckCircle size={20} className="text-emerald-400" />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      {staffView ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Total Revenue YTD', value: formatCurrency(totalRevenue.toFixed(2)), icon: IndianRupee, color: 'bg-emerald-500' },
            { title: 'Pending Receivables', value: formatCurrency(totalPending.toFixed(2)), icon: Clock, color: 'bg-amber-500' },
            { title: 'Success Rate', value: `${paymentSuccessRate}%`, icon: Activity, color: 'bg-blue-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md shrink-0`}>
                <stat.icon size={24} />
              </div>
              <div>
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-none mb-1">{stat.title}</h3>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><CreditCard size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Fee Paid</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(studentPaidTotal.toFixed(2))}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100"><Clock size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Pending Dues</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(studentPendingTotal.toFixed(2))}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">
            {staffView ? 'Student Fee Registry' : 'My Academic Fee Statement'}
          </h2>
          {staffView ? (
            <select
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-200 outline-none"
            >
              <option value="ALL">All Classes</option>
              {sections.map((section) => (
                <option key={section.id} value={section.name}>{section.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">2026 Academic Year</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white uppercase text-slate-500 text-[10px] font-bold tracking-widest">
              <tr>
                {staffView && (
                  <>
                    <th className="px-6 py-4 border-b border-slate-100">Student</th>
                    <th className="px-6 py-4 border-b border-slate-100">Class</th>
                  </>
                )}
                <th className="px-6 py-4 border-b border-slate-100">Fee Category & Type</th>
                <th className="px-6 py-4 border-b border-slate-100">Paid</th>
                <th className="px-6 py-4 border-b border-slate-100">Pending</th>
                <th className="px-6 py-4 border-b border-slate-100">Total Amount</th>
                <th className="px-6 py-4 border-b border-slate-100">Status</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Invoice Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 group">
                  {staffView && (
                    <>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-slate-900 block">{fee.studentName || fee.studentEmail}</span>
                          <span className="text-xs text-slate-500 font-medium">Roll: {fee.rollNo || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{fee.sectionName || '-'}</td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${fee.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {fee.type.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block text-base">{fee.type}</span>
                        <span className="text-xs text-slate-500 font-medium">Due: {fee.dueDate}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-emerald-700">{formatCurrency(Number(fee.paidAmount).toFixed(2))}</td>
                  <td className="px-6 py-4 font-semibold text-amber-700">{formatCurrency(Number(fee.pendingAmount).toFixed(2))}</td>
                  <td className="px-6 py-4">
                    <span className="font-extrabold text-slate-900 block text-base">{formatCurrency(Number(fee.totalAmount).toFixed(2))}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${
                      fee.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' :
                      fee.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' :
                      'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {fee.status === 'Paid' ? (
                      <button
                        onClick={() => handleDownloadBill(fee)}
                        className="px-4 py-2 flex items-center gap-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 text-[10px] uppercase active:scale-95"
                      >
                        <Download size={14} /> Download Bill
                      </button>
                    ) : (
                      <button
                        className="px-4 py-2 flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-[10px] uppercase transition-all shadow-sm active:scale-95"
                      >
                        <CreditCard size={14} /> Pending
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRecords.length === 0 && (
                <tr>
                  <td colSpan={staffView ? 8 : 6} className="px-6 py-10 text-center text-sm text-slate-500">
                    No fee records are available in Supabase for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
