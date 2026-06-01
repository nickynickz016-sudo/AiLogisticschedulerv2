import React, { useState } from 'react';
import { X, Lock, User, Eye, EyeOff, Loader2, CheckCircle, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { MockUser } from '../mockData';

interface ProfileUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allUsers: MockUser[];
  onSave: (newUsername: string, newPassword: string) => Promise<void> | void;
}

export const ProfileUpdateModal: React.FC<ProfileUpdateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onSave,
}) => {
  const currentCreds = allUsers.find(u => u.profile.id === currentUser.id);
  
  const [username, setUsername] = useState(currentCreds?.username || '');
  const [password, setPassword] = useState(currentCreds?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername) {
      setError('Username cannot be empty');
      return;
    }

    if (!trimmedPassword) {
      setError('Password cannot be empty');
      return;
    }

    if (trimmedPassword.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    // Check if username is already taken by another user
    const usernameExists = allUsers.some(
      u => u.profile.id !== currentUser.id && u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

    if (usernameExists) {
      setError('This username is already taken. Please choose another one.');
      return;
    }

    setLoading(true);

    try {
      // Small artificial timeout to show the loader & give a polished premium feedback feel
      await new Promise(resolve => setTimeout(resolve, 600));
      await onSave(trimmedUsername, trimmedPassword);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden relative flex flex-col border border-slate-100"
        role="document"
      >
        {/* Header decoration */}
        <div className="bg-slate-950 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-full"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-4 mt-2">
            <img 
              src={currentUser.avatar} 
              className="w-14 h-14 rounded-2xl border-2 border-white/20 shadow-md object-cover" 
              alt={currentUser.name} 
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-lg font-bold tracking-tight">{currentUser.name}</h3>
              <p className="text-xs text-slate-400 font-mono tracking-wider uppercase mt-0.5">{currentUser.employee_id} • {currentUser.role}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {success ? (
            <div className="py-10 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-100 mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Credentials Updated Successfully</h4>
              <p className="text-sm text-slate-500 mt-2">Your login details have been changed.</p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Security Credentials</h4>
                <p className="text-xs text-slate-500 font-medium">Update username and password for this device session.</p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 animate-in slide-in-from-top-2 duration-150">
                  {error}
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-950 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="Enter new username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-950 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-850 rounded-xl transition-colors shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
