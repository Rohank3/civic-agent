import React, { useState } from 'react';
import { X, PlusCircle, Globe, User, KeyRound, Sparkles } from 'lucide-react';
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
    setName('');
    setPortalUrl('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs font-sans">
      <div className="bg-white border border-[#e4e4e7] rounded-lg max-w-lg w-full max-h-[92vh] flex flex-col shadow-xl overflow-hidden text-[#09090b]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e4e4e7] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-[#f4f4f5] text-[#18181b] flex items-center justify-center border border-[#e4e4e7]">
              <PlusCircle className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[#09090b]">Add Custom Portal / Scheme</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
                  User Scoped
                </span>
              </div>
              <p className="text-xs text-[#71717a]">
                Connect your state, institutional, or university financial aid website
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 text-xs">
          {/* Privacy Isolation Notice */}
          <div className="p-3 rounded-md bg-[#fafafa] border border-[#e4e4e7] text-xs flex items-center gap-2">
            <Sparkles className="size-3.5 text-amber-500 shrink-0" />
            <span className="text-[#71717a]">
              <strong className="text-[#09090b] font-medium">User Privacy:</strong> Custom URLs and credentials are saved locally for your account session (<code>{userId}</code>).
            </span>
          </div>

          {/* Scheme Name */}
          <div>
            <label className="text-[#71717a] font-medium block mb-1">
              Scholarship / Grant Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. State Post-Matric Merit Scholarship"
              className="h-8 w-full bg-white border border-[#e4e4e7] rounded-md px-3 text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#18181b]"
            />
          </div>

          {/* Target Website URL */}
          <div>
            <label className="text-[#71717a] font-medium block mb-1">
              Target Portal URL *
            </label>
            <div className="relative">
              <Globe className="size-3.5 text-[#a1a1aa] absolute left-2.5 top-2.5" />
              <input
                type="text"
                required
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                placeholder="https://scholarships.gov.in"
                className="h-8 w-full bg-white border border-[#e4e4e7] rounded-md pl-8 pr-3 text-[#09090b] font-mono placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#18181b]"
              />
            </div>
          </div>

          {/* Login Mode Selector */}
          <div>
            <label className="text-[#71717a] font-medium block mb-1.5">
              Portal Authentication Mode *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLoginMode('fresh_registration')}
                className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                  loginMode === 'fresh_registration'
                    ? 'border-[#18181b] bg-[#f4f4f5] text-[#18181b]'
                    : 'border-[#e4e4e7] bg-white text-[#71717a] hover:bg-[#fafafa]'
                }`}
              >
                <div className="font-medium text-xs">Fresh Form</div>
                <div className="text-[10px] text-[#a1a1aa] mt-0.5">Direct registration</div>
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('credentials')}
                className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                  loginMode === 'credentials'
                    ? 'border-[#18181b] bg-[#f4f4f5] text-[#18181b]'
                    : 'border-[#e4e4e7] bg-white text-[#71717a] hover:bg-[#fafafa]'
                }`}
              >
                <div className="font-medium text-xs">Login First</div>
                <div className="text-[10px] text-[#a1a1aa] mt-0.5">Existing account</div>
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('sso')}
                className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                  loginMode === 'sso'
                    ? 'border-[#18181b] bg-[#f4f4f5] text-[#18181b]'
                    : 'border-[#e4e4e7] bg-white text-[#71717a] hover:bg-[#fafafa]'
                }`}
              >
                <div className="font-medium text-xs">National SSO</div>
                <div className="text-[10px] text-[#a1a1aa] mt-0.5">MeriPehchaan</div>
              </button>
            </div>
          </div>

          {/* Conditional Credentials Input */}
          {loginMode === 'credentials' && (
            <div className="p-3 rounded-md border border-[#e4e4e7] bg-[#fafafa] space-y-2.5 animate-in fade-in">
              <div>
                <label className="text-[#71717a] font-medium block mb-1">
                  Portal Login ID / Username
                </label>
                <div className="relative">
                  <User className="size-3.5 text-[#a1a1aa] absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter student portal username"
                    className="h-8 w-full bg-white border border-[#e4e4e7] rounded-md pl-7 pr-3 text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#18181b]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#71717a] font-medium block mb-1">
                  Portal Password
                </label>
                <div className="relative">
                  <KeyRound className="size-3.5 text-[#a1a1aa] absolute left-2.5 top-2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter student portal password"
                    className="h-8 w-full bg-white border border-[#e4e4e7] rounded-md pl-7 pr-3 text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#18181b]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ministry / Authority */}
          <div>
            <label className="text-[#71717a] font-medium block mb-1">
              Issuing Ministry or Authority
            </label>
            <input
              type="text"
              value={ministry}
              onChange={(e) => setMinistry(e.target.value)}
              placeholder="e.g. State Higher Education Department"
              className="h-8 w-full bg-white border border-[#e4e4e7] rounded-md px-3 text-[#09090b] placeholder-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-[#18181b]"
            />
          </div>

          {/* Cutoff criteria grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[#71717a] font-medium block mb-1">Max Income (₹)</label>
              <input
                type="number"
                value={incomeCeiling}
                onChange={(e) => setIncomeCeiling(e.target.value)}
                className="h-8 w-full bg-white border border-[#e4e4e7] rounded-md px-2.5 text-[#09090b] font-mono focus:outline-none focus:ring-1 focus:ring-[#18181b]"
              />
            </div>
            <div>
              <label className="text-[#71717a] font-medium block mb-1">Min Marks (%)</label>
              <input
                type="number"
                value={minPercentage}
                onChange={(e) => setMinPercentage(e.target.value)}
                className="h-8 w-full bg-white border border-[#e4e4e7] rounded-md px-2.5 text-[#09090b] font-mono focus:outline-none focus:ring-1 focus:ring-[#18181b]"
              />
            </div>
            <div>
              <label className="text-[#71717a] font-medium block mb-1">Grant (₹/yr)</label>
              <input
                type="number"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="h-8 w-full bg-white border border-[#e4e4e7] rounded-md px-2.5 text-[#09090b] font-mono focus:outline-none focus:ring-1 focus:ring-[#18181b]"
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="pt-3 border-t border-[#e4e4e7] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-md border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] px-3 text-[#71717a] hover:text-[#09090b] font-medium text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-md bg-[#18181b] hover:bg-[#27272a] text-white font-medium text-xs px-3.5 transition-colors cursor-pointer shadow-xs"
            >
              Save Custom Scheme
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
