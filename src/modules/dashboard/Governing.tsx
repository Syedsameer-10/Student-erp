import { useEffect, useMemo, useState } from 'react';
import {
  Users, Award, CheckCircle, TrendingUp,
  BarChart3, FileText, Search, Shield,
  Eye, GraduationCap
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart as RechartsPie, Pie, Cell, Tooltip, CartesianGrid,
  XAxis, YAxis, ResponsiveContainer, Legend
} from 'recharts';
import { useClassStore } from '../../store/useClassStore';
import { fetchAttendanceOverview } from '../../services/attendance';

const StatCard = ({ title, value, icon: Icon, bg, color, subtitle }: any) => (
  <div className="bg-white p-5 sm:p-6 rounded-[24px] shadow-sm border border-slate-100 flex items-center gap-4">
    <div className={`${bg} ${color} p-3 sm:p-4 rounded-2xl shrink-0`}>
      <Icon size={22} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">{title}</p>
      <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p>}
    </div>
  </div>
);

const SectionTag = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 mb-6">
    <div className="w-1.5 h-6 rounded-full bg-teal-500" />
    <h2 className="text-lg sm:text-xl font-black text-slate-800">{label}</h2>
    <span className="ml-auto px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
      <Eye size={10} /> View Only
    </span>
  </div>
);

type Tab = 'OVERVIEW' | 'TEACHERS' | 'STUDENTS' | 'ATTENDANCE' | 'MARKS' | 'HOMEWORK';

const PIE_COLORS = ['#14b8a6', '#f43f5e'];

export default function GoverningDashboard() {
  const store = useClassStore();
  const [tab, setTab] = useState<Tab>('OVERVIEW');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [attendanceTrend, setAttendanceTrend] = useState<Array<{ day: string; present: number; absent: number }>>([]);
  const [classAttendance, setClassAttendance] = useState<Array<{ class: string; pct: number }>>([]);
  const [pieData, setPieData] = useState([{ name: 'Present', value: 0 }, { name: 'Absent', value: 0 }]);

  const navItems: { id: Tab; label: string; icon: any }[] = [
    { id: 'OVERVIEW', label: 'Overview', icon: BarChart3 },
    { id: 'TEACHERS', label: 'Teachers', icon: Users },
    { id: 'STUDENTS', label: 'Students', icon: GraduationCap },
    { id: 'ATTENDANCE', label: 'Attendance', icon: CheckCircle },
    { id: 'MARKS', label: 'Marks', icon: Award },
    { id: 'HOMEWORK', label: 'Homework', icon: FileText },
  ];

  const filteredTeachers = useMemo(() =>
    store.teachers.filter((teacher) =>
      (filterClass === 'ALL' || teacher.category === filterClass) &&
      teacher.name.toLowerCase().includes(teacherSearch.toLowerCase())
    ), [store.teachers, filterClass, teacherSearch]);

  const filteredStudents = useMemo(() =>
    store.students.filter((student) =>
      (filterClass === 'ALL' || student.categoryId === filterClass) &&
      student.name.toLowerCase().includes(studentSearch.toLowerCase())
    ), [store.students, filterClass, studentSearch]);

  const sectionLookup = useMemo(() => new Map(store.sections.map((section) => [section.id, section])), [store.sections]);

  useEffect(() => {
    void fetchAttendanceOverview(7)
      .then((overview) => {
        setAttendanceTrend(
          overview.trend.map((point) => ({
            day: point.label,
            present: point.present,
            absent: point.absent,
          }))
        );
        setClassAttendance(
          overview.classBreakdown.map((point) => ({
            class: point.classId,
            pct: point.pct,
          }))
        );
        setPieData([
          { name: 'Present', value: overview.presentCount },
          { name: 'Absent', value: overview.absentCount },
        ]);
      })
      .catch(console.error);
  }, []);

  const marksData = store.categories.map((category, index) => ({
    subject: category.name.length > 9 ? `${category.name.slice(0, 8)}.` : category.name,
    avg: 72 + index * 4,
  }));

  const hwData = store.categories.map((category, index) => ({
    class: category.name.length > 6 ? category.name.slice(0, 6) : category.name,
    done: 76 + index * 4,
    pending: 24 - index * 4,
  }));

  const studentHighlights = useMemo(() => store.students.slice(0, 6), [store.students]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 sm:w-72 h-48 sm:h-72 bg-teal-500/10 rounded-full translate-x-16 -translate-y-16 pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3 py-1 bg-teal-500 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] mb-3 sm:mb-4 block w-fit">
            Governing Body Portal
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-2">Governance Analytics</h1>
          <p className="text-slate-400 font-medium text-sm sm:text-base">
            Monitoring institution-wide academic and operational performance. <span className="text-teal-400 font-bold">View-Only Access</span>
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max sm:min-w-0 flex-wrap">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${tab === item.id
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 border border-slate-100 hover:border-teal-200 hover:text-teal-600'
                }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'OVERVIEW' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard title="Total Students" value={store.students.length} icon={GraduationCap} bg="bg-teal-50" color="text-teal-600" subtitle="Across all sections" />
            <StatCard title="Faculty Members" value={store.teachers.length} icon={Users} bg="bg-blue-50" color="text-blue-600" subtitle="All departments" />
            <StatCard title="Sections" value={store.sections.length} icon={CheckCircle} bg="bg-emerald-50" color="text-emerald-600" subtitle="Live school directory" />
            <StatCard title="Academic Levels" value={store.categories.length} icon={TrendingUp} bg="bg-amber-50" color="text-amber-600" subtitle="Synced from database" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Attendance Trend (This Week)" />
              <div className="h-64 sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrend}>
                    <defs>
                      <linearGradient id="gb-teal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="present" stroke="#14b8a6" strokeWidth={3} fill="url(#gb-teal)" name="Present %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Present vs Absent" />
              <div className="h-52 sm:h-[260px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Class-Wise Attendance" />
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classAttendance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="class" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} domain={[60, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="pct" fill="#14b8a6" radius={[8, 8, 0, 0]} barSize={36} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Student Registry Snapshot" />
              <div className="space-y-3">
                {studentHighlights.map((student, i) => (
                  <div key={student.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{student.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        Roll {student.rollNo} · {sectionLookup.get(student.sectionId)?.name || 'Section'}
                      </p>
                    </div>
                    <span className="font-black text-teal-600 text-sm shrink-0">{student.gender}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'TEACHERS' && (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <SectionTag label="Faculty Directory" />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
              <option value="ALL">All Classes</option>
              {store.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="text-left p-4">#</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Subject</th>
                  <th className="text-left p-4">Experience</th>
                  <th className="text-left p-4">Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.slice(0, 50).map((teacher, i) => (
                  <tr key={teacher.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-slate-300 font-black">{i + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 font-black flex items-center justify-center text-base shrink-0">{teacher.name[0]}</div>
                        <span className="font-bold text-slate-800">{teacher.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-500">{teacher.subject}</td>
                    <td className="p-4 font-bold text-slate-500">{teacher.experience}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest capitalize">{teacher.category.replace('-', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 font-medium text-center">Showing {Math.min(filteredTeachers.length, 50)} of {filteredTeachers.length} faculty records · Read-Only</p>
        </div>
      )}

      {tab === 'STUDENTS' && (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <SectionTag label="Student Registry" />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
              <option value="ALL">All Classes</option>
              {store.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="text-left p-4">Roll</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Class</th>
                  <th className="text-left p-4">Section</th>
                  <th className="text-left p-4">Gender</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.slice(0, 60).map((student) => (
                  <tr key={student.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-black text-slate-300">{student.rollNo}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 font-black flex items-center justify-center shrink-0">{student.name[0]}</div>
                        <span className="font-bold text-slate-800">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-500 capitalize">{student.categoryId.replace('-', ' ')}</td>
                    <td className="p-4 font-bold text-slate-500">{sectionLookup.get(student.sectionId)?.name || student.sectionId}</td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${student.gender === 'Male' ? 'bg-blue-50 text-blue-500' : student.gender === 'Female' ? 'bg-pink-50 text-pink-500' : 'bg-slate-100 text-slate-500'}`}>
                        {student.gender}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 font-medium text-center">Showing {Math.min(filteredStudents.length, 60)} of {filteredStudents.length} student records · Read-Only</p>
        </div>
      )}

      {tab === 'ATTENDANCE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Weekly Attendance Trend" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#14b8a6" strokeWidth={3} dot={{ r: 5 }} name="Present %" />
                    <Line type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={3} dot={{ r: 5 }} name="Absent %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Class-Wise Attendance %" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classAttendance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis dataKey="class" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} width={110} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="pct" fill="#14b8a6" radius={[0, 8, 8, 0]} barSize={28} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <SectionTag label="Present vs Absent Distribution" />
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'MARKS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Subject-Wise Performance" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marksData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="avg" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={36} name="Avg Marks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Class Average Comparison" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marksData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} domain={[60, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Line type="monotone" dataKey="avg" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5, fill: '#8b5cf6' }} name="Class Avg" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <SectionTag label="Student Academic Snapshot" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentHighlights.map((student, i) => (
                <div key={student.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{student.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {sectionLookup.get(student.sectionId)?.name || 'Section'} · Roll {student.rollNo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'HOMEWORK' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Class-Wise Completion Rate" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hwData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="class" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Legend />
                    <Bar dataKey="done" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} name="Completed %" barSize={36} />
                    <Bar dataKey="pending" stackId="a" fill="#fbbf24" radius={[8, 8, 0, 0]} name="Pending %" barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <SectionTag label="Overall Completion vs Pending" />
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={[{ name: 'Completed', value: 80 }, { name: 'Pending', value: 20 }]} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value">
                      <Cell fill="#14b8a6" /><Cell fill="#fbbf24" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="py-4 text-center">
        <span className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
          <Shield size={12} /> Governing Body · Certified Read-Only Access · EduSync ERP v2.0
        </span>
      </div>
    </div>
  );
}
