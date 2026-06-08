
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { MockUser } from '../mockData';
import { User, Lock, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  onLogin: (user: UserProfile, latestUsers?: MockUser[]) => void;
  users: MockUser[];
  logo?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users, logo }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Direct real-time fetch from Supabase on login submission to prevent login with stale credentials
      let latestUsers = users;
      const { data, error: fetchErr } = await supabase
        .from('system_settings')
        .select('daily_job_limits')
        .eq('id', 1)
        .single();
        
      if (!fetchErr && data?.daily_job_limits?.__credentials) {
        latestUsers = data.daily_job_limits.__credentials;
      }

      const user = latestUsers.find(u => u.username === username && u.password === password);
      
      if (user) {
        if (user.profile.status === 'Disabled') {
          setError('This account has been disabled. Please contact an administrator.');
        } else {
          // Merge latest permissions from the central server source to handle updates instantly
          const latestUser = latestUsers.find(u => u.profile.employee_id === user.profile.employee_id);
          const finalProfile: UserProfile = latestUser ? { 
            ...user.profile, 
            permissions: latestUser.profile.permissions,
            role: latestUser.profile.role,
            username: latestUser.username,
            password: latestUser.password
          } : {
            ...user.profile,
            username: user.username,
            password: user.password
          };
          onLogin(finalProfile, latestUsers);
        }
      } else {
        setError('Invalid username or password.');
      }
    } catch (err: any) {
      console.error('Login verification error:', err);
      // Failover authentication using local memory credentials in case of network issues
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        if (user.profile.status === 'Disabled') {
          setError('This account has been disabled. Please contact an administrator.');
        } else {
          const finalProfile: UserProfile = {
            ...user.profile,
            username: user.username,
            password: user.password
          };
          onLogin(finalProfile);
        }
      } else {
        setError('Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {logo ? (
             <div className="mb-6 flex justify-center">
                <img src={logo} alt="Logo" className="h-20 w-auto object-contain" />
             </div>
          ) : (
            <div className="inline-block mb-4">
              <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center rotate-45 transform">
                <span className="text-white font-black text-4xl -rotate-45">W</span>
              </div>
            </div>
          )}
          <h1 className="text-3xl font-bold text-slate-900">Operations Login</h1>
          <p className="text-slate-700 mt-1">Please enter your credentials.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-500"
              />
            </div>
            
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 bg-slate-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
