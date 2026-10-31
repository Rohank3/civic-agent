import React, { useState } from 'react';
import { X, PlusCircle, Globe, Lock, User, KeyRound, Sparkles } from 'lucide-react';
import type { ScholarshipScheme } from '../../types';

interface AddSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddScheme: (schemeData: Partial<ScholarshipScheme>) => void;
  userId: string;
}

export const AddSchemeModal: React.FC<AddSchemeModalProps> = ({
  isOpen,
  onClose,
  onAddScheme,
  userId,
}) => {
  const [name, setName] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [ministry, setMinistry] = useState('State Higher Education Department');
  const [loginMode, setLoginMode] = useState<'fresh_registration' | 'credentials' | 'sso'>('fresh_registration');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [incomeCeiling, setIncomeCeiling] = useState('350000');
  const [minPercentage, setMinPercentage] = useState('60');
  const [grantAmount, setGrantAmount] = useState('30000');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !portalUrl.trim()) return;

    onAddScheme({
      name: name.trim(),
      portal_url: portalUrl.trim().startsWith('http') ? portalUrl.trim() : `https://${portalUrl.trim()}`,
      ministry: ministry.trim(),
      login_mode: loginMode,
      credentials_username: loginMode === 'credentials' ? username.trim() : undefined,
      credentials_password: loginMode === 'credentials' ? password : undefined,
      max_family_income: parseFloat(incomeCeiling) || 350000,
      min_gpa_or_percentage: parseFloat(minPercentage) || 60,
      grant_amount_annual: parseFloat(grantAmount) || 30000,
      level: 'undergraduate',
      target_category: ['ALL'],
      description: `User-added portal target: ${name.trim()}`,
      active: true,
      is_custom: true,
      user_id: userId,
    });

    onClose();
    // Reset fields
    setName('');
    setPortalUrl('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Add Custom Portal / Scheme</h3>
                <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Private to You
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Connect your state, institutional, or university financial aid website
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 font-sans text-xs">
          {/* Privacy Isolation Notice */}
          <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-[11px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>User Isolation Guarantee:</strong> This custom URL and credentials are encrypted and scoped
              strictly to your session (<code>{userId}</code>). No other user can access or view it.
            </span>
          </div>

          {/* Scheme Name */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Scholarship / Grant Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Karnataka Post-Matric E-PASS Scholarship"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            />
          </div>

          {/* Target Website URL */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Target Portal URL *
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                placeholder="https://karepass.cgg.gov.in"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Works with any <code>.gov.in</code>, <code>.nic.in</code>, <code>.edu</code>, <code>.edu.in</code> or university portal.
            </span>
          </div>

          {/* Login Mode Selector */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Portal Authentication / Login Mode *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLoginMode('fresh_registration')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-95 ${
                  loginMode === 'fresh_registration'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Fresh Form</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">No login needed</p>
              </button>

              <button
                type="button"
                onClick={() => setLoginMode('credentials')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95 ${
                  loginMode === 'credentials'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-blue-400" />
                  <span>Credentials</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">User & Password</p>
              </button>

              <button
                type="button"
                onClick={() => setLoginMode('sso')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 active:scale-95 ${
                  loginMode === 'sso'
                    ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-purple-400" />
                  <span>SSO / Digilocker</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">State Identity</p>
              </button>
            </div>
          </div>

          {/* Conditional Credentials Input */}
          {loginMode === 'credentials' && (
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-950/20 space-y-2.5">
              <span className="font-semibold text-[11px] text-blue-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Portal Account Credentials</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Username / Roll #</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. 2024CS-1092"
                      className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400/50"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Credentials are only held in memory during the execution session to log into the portal.
              </p>
            </div>
          )}

          {/* Criteria: Income & GPA */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-slate-400 block mb-1">Max Income (₹)</label>
              <input
                type="number"
                value={incomeCeiling}
                onChange={(e) => setIncomeCeiling(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-medium focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Min Marks (%)</label>
              <input
                type="number"
                value={minPercentage}
                onChange={(e) => setMinPercentage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-medium focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Grant Value (₹)</label>
              <input
                type="number"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-400 font-bold focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              />
            </div>
          </div>

          {/* Ministry / Authority */}
          <div>
            <label className="text-slate-400 block mb-1">Administering Department / University</label>
            <input
              type="text"
              value={ministry}
              onChange={(e) => setMinistry(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Save & Connect Portal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
