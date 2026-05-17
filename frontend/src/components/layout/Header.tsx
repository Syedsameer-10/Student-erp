import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Bell, Search, Menu, User, Mail, Shield, LogOut, CheckCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import Modal from '../common/Modal';
import { changeCurrentUserPassword } from '../../services/auth';

export const Header = ({ 
  collapsed, 
  setCollapsed 
}: { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void 
}) => {
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const teacherSubjects = user?.subjects?.length ? user.subjects.join(', ') : user?.subject;

  const resetPasswordForm = () => {
    setShowPasswordForm(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordMessage(null);
    setIsChangingPassword(false);
    setShowPasswordText(false);
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    resetPasswordForm();
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.email) {
      setPasswordMessage({ type: 'error', text: 'Email address is missing for this account.' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordMessage(null);
      await changeCurrentUserPassword(user.email, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordMessage({ type: 'success', text: 'Password updated. Use the new password for future logins.' });
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error?.message || 'Unable to change password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 transition-all duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden sm:flex items-center w-80 relative">
            <Search size={18} className="absolute left-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="h-10 w-full bg-slate-100 border-transparent rounded-xl pl-10 pr-4 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>
          
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 border-l border-slate-200 pl-4 sm:pl-6 cursor-pointer group hover:bg-slate-50 py-1 transition-colors rounded-lg"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{user?.name}</span>
              <span className="text-xs font-medium text-slate-500">{user?.role}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-md group-hover:scale-105 transition-transform">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </header>

      <Modal isOpen={isProfileOpen} onClose={closeProfile} title="My Profile">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 py-4">
             <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-2xl shadow-indigo-200 border-4 border-white">
                {user?.name?.charAt(0)}
             </div>
             <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">{user?.role}</p>
             </div>
             <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                   <CheckCircle size={10} /> Account Verified
                </span>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-sm"><User size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">User ID</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.id}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-emerald-600 rounded-xl shadow-sm"><Mail size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.email}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-violet-600 rounded-xl shadow-sm"><Shield size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Access Role</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.role}</p>
                </div>
             </div>
             {user?.role === 'Teacher' && (
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                   <div className="p-2.5 bg-white text-amber-600 rounded-xl shadow-sm"><Shield size={20} /></div>
                   <div>
                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Assigned Subject</p>
                     <p className="text-sm font-semibold text-slate-700">{teacherSubjects}</p>
                   </div>
                </div>
             )}
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white p-2.5 text-indigo-600 shadow-sm">
                  <KeyRound size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Password</p>
                  <p className="text-xs font-medium text-slate-500">Create a private password for future logins.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm((current) => !current);
                  setPasswordMessage(null);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                {showPasswordForm ? 'Close' : 'Change Password'}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} className="mt-4 space-y-3 border-t border-indigo-100 pt-4">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'currentPassword', label: 'Current Password', autoComplete: 'current-password' },
                    { key: 'newPassword', label: 'New Password', autoComplete: 'new-password' },
                    { key: 'confirmPassword', label: 'Confirm New Password', autoComplete: 'new-password' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{field.label}</label>
                      <div className="relative">
                        <input
                          type={showPasswordText ? 'text' : 'password'}
                          autoComplete={field.autoComplete}
                          value={passwordForm[field.key as keyof typeof passwordForm]}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, [field.key]: event.target.value }))}
                          required
                          minLength={field.key === 'currentPassword' ? undefined : 8}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordText((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label={showPasswordText ? 'Hide passwords' : 'Show passwords'}
                        >
                          {showPasswordText ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {passwordMessage && (
                  <div className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    passwordMessage.type === 'success'
                      ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'border border-rose-100 bg-rose-50 text-rose-700'
                  }`}>
                    {passwordMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>

           <div className="pt-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-100 transition-colors"
              >
                 <LogOut size={18} /> Sign Out Profile
              </button>
           </div>
        </div>
      </Modal>
    </>
  );
};
