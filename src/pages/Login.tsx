import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronRight, Shield, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEED_USERS } from '../data/seedData';
import type { User } from '../types';

const DEMO_ACCOUNTS = [
  { user: SEED_USERS[4], label: 'Admin',  desc: 'Grace Park — Full system access',       color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
  { user: SEED_USERS[0], label: 'Doctor', desc: 'Dr. Sarah Chen — Clinical workflows',   color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { user: SEED_USERS[2], label: 'Nurse',  desc: 'Priya Nair — Temperature & bed tasks', color: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
];

export default function Login() {
  const { login, users } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = (user: User) => {
    login(user);
    navigate('/dashboard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
    if (found) {
      login(found);
      navigate('/dashboard');
    } else {
      setError('No active account found with that email. Use a demo login below.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2038] via-[#162d4a] to-[#0d9488] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">

        {/* Left — branding */}
        <div className="text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">CareTrack</h1>
              <p className="text-teal-300 text-sm">Patient Monitoring System</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-white/80 text-lg leading-relaxed">
              Coordinating care for a 74-bed quarantine facility — temperature tracking, doctor visits, discharge management, and outcomes.
            </p>
            <div className="flex flex-col gap-2 mt-4">
              {['Real-time daily task tracking', 'Role-based clinical workflows', 'Fever-free discharge eligibility', 'Outcome & mortality reporting'].map(f => (
                <div key={f} className="flex items-center gap-2 text-teal-200 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-amber-300 mb-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Demo Mode</span>
            </div>
            <p className="text-white/70 text-xs">This is a demo using localStorage. No real patient data. For production, connect Supabase auth.</p>
          </div>
        </div>

        {/* Right — form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-[#0f2038] mb-1">Sign in to CareTrack</h2>
          <p className="text-gray-500 text-sm mb-6">Use your email or a demo account below</p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@caretrack.demo"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="demo — any password works"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" className="w-full bg-[#0f2038] hover:bg-[#162d4a] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
              Sign In
            </button>
          </form>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
            <div className="relative text-center"><span className="bg-white px-3 text-xs text-gray-400">or sign in as</span></div>
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map(({ user, label, desc, color }) => (
              <button
                key={user.id}
                onClick={() => handleDemoLogin(user)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${color}`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
