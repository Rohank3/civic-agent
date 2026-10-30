import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  Sparkles, 
  Fingerprint, 
  ArrowRight, 
  CheckCircle2, 
  Globe,
  Loader2
} from 'lucide-react';
import type { CitizenUser } from '../../types';
import { SAMPLE_PRESETS } from '../../lib/presets';

interface LoginPageProps {
  onLogin: (user: CitizenUser) => void;
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onContinueAsGuest }) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'digilocker' | 'demo'>('credentials');
  const [username, setUsername] = useState('rohankumar_7');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your username or registered email');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const user: CitizenUser = {
        id: `user_${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        username: username,
        fullName: username === 'rohankumar_7' ? 'Rohan Kumar' : username,
        email: `${username}@gmail.com`,
        role: 'applicant',
        authMethod: 'password',
      };
      onLogin(user);
    }, 700);
  };

  const handleQuickDemoSelect = (presetIndex: number) => {
    setIsLoading(true);
    const preset = SAMPLE_PRESETS[presetIndex];
    setTimeout(() => {
      setIsLoading(false);
      const user: CitizenUser = {
        id: `user_${preset.profile.national_id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        username: preset.profile.full_name.toLowerCase().replace(/\s+/g, '_'),
        fullName: preset.profile.full_name,
        email: preset.profile.email,
        role: 'applicant',
        authMethod: 'demo',
        profile: preset.profile,
      };
      onLogin(user);
    }, 500);
  };

  const handleDigiLockerLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: CitizenUser = {
        id: 'user_digilocker_9481',
        username: 'rohan_verified',
        fullName: 'Rohan Kumar (DigiLocker Verified)',
        email: 'rohank30766@gmail.com',
        role: 'applicant',
        authMethod: 'digilocker',
      };
      onLogin(user);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-xl shadow-blue-500/25 mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            CivicAgent Citizen Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous Higher Education Grant & Bureaucracy Execution Platform
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeTab === 'credentials'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Citizen Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('demo')}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeTab === 'demo'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1-Click Demo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('digilocker')}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeTab === 'digilocker'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DigiLocker SSO
          </button>
        </div>

        {/* Form Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Tab 1: Standard Citizen Credentials Login */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Citizen ID / Registered Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rohankumar_7 or rohan@gmail.com"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Password / Access Passkey
                </label>
                <span className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer">
                  Forgot?
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-800 text-blue-600 focus:ring-blue-500 bg-slate-950"
                />
                <span>Remember this device</span>
              </label>
              <span className="text-[11px] text-slate-500">256-bit Encrypted</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Citizen Profile...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In & Open Cockpit</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: 1-Click Demo Profiles */}
        {activeTab === 'demo' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-2">
              Select a pre-configured student applicant profile for instant evaluation:
            </p>
            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleQuickDemoSelect(idx)}
                disabled={isLoading}
                className="w-full p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-blue-500/50 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {preset.profile.full_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      GPA {preset.profile.attributes.gpa || preset.profile.attributes.percentage}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {preset.profile.attributes.major} • Income: ₹{(preset.profile.income_annual).toLocaleString()}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}

        {/* Tab 3: DigiLocker National SSO */}
        {activeTab === 'digilocker' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Fingerprint className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">MeriPehchaan / DigiLocker SSO</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Authenticate securely using India's National Single Sign-On with verified digital document vaults.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDigiLockerLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to MeriPehchaan Gateway...</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Continue with MeriPehchaan</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer Links & Guest Mode */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Continue as Guest</span>
          </button>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Gov Cloud Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
