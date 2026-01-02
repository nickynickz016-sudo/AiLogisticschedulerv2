
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { USERS } from '../mockData';
import { User, Lock, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate network delay for better UX
    setTimeout(() => {
      const user = USERS.find(u => u.username === username && u.password === password);
      
      if (user) {
        onLogin(user.profile);
      } else {
        setError('Invalid username or password.');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center rotate-45 transform">
              <span className="text-white font-black text-4xl -rotate-45">W</span>
            </div>
          </div>
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
            
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

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
        <div className="text-center text-xs text-slate-400 mt-6 space-y-2">
            <p className="font-bold">Demo Accounts:</p>
            <p><span className="font-semibold">Admin:</span> Admin / Admin</p>
            <p><span className="font-semibold">Users:</span> User1/User1 ... User5/User5</p>
        </div>
      </div>
    </div>
  );
};
