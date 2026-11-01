import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  Sparkles, 
  User, 
  LogOut, 
  Award, 
  Terminal, 
  Languages 
} from 'lucide-react';
import type { ActorRole, CitizenUser } from '../types';

interface NavbarProps {
  wsConnected: boolean;
  activeActor: ActorRole;
  onReset: () => void;
  currentUser?: CitizenUser | null;
  onLogout?: () => void;
  onEditProfile?: () => void;
  appliedCount?: number;
  onOpenApplied?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  eventCount?: number;
  onSyncLiveData?: () => void;
  isSyncing?: boolean;
  lang?: 'en' | 'hi';
  onToggleLang?: () => void;
  onOpenWalkthrough?: () => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({ 
  wsConnected, 
  activeActor, 
  onReset,
  currentUser,
  onLogout,
  onEditProfile,
  appliedCount = 0,
  onOpenApplied,
  isInspectorOpen = false,
  onToggleInspector,
  eventCount = 0,
  onSyncLiveData,
  isSyncing = false,
  lang = 'en',
  onToggleLang,
  onOpenWalkthrough,
}) => {
  const getActorBadge = () => {
    switch (activeActor) {
      case 'STUDENT_INTAKE':
        return { 
          label: 'Student Intake Phase', 
          dotColor: 'bg-amber-400', 
          badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/25' 
        };
      case 'AUTONOMOUS_AGENT':
        return { 
          label: 'Agent Browser Session Active', 
          dotColor: 'bg-blue-400 animate-pulse', 
          badgeStyle: 'bg-blue-500/10 text-blue-400 border-blue-500/25' 
        };
      case 'CITIZEN_HITL':
        return { 
          label: 'Citizen Review & Consent Required', 
          dotColor: 'bg-indigo-400', 
          badgeStyle: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-semibold' 
        };
      case 'GOVERNMENT_AUTHORITY':
        return { 
          label: 'Government Portal Confirmed', 
          dotColor: 'bg-emerald-400', 
          badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
        };
    }
  };

  const badge = getActorBadge();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5EAEF] px-4 py-2.5 shadow-xs">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5D87FF] flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[#2A3547]">
                CivicAgent
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#5D87FF]/15 text-[#5D87FF] border border-[#5D87FF]/30">
                Citizen Portal
              </span>
            </div>
            <p className="text-xs text-[#5A6A85] hidden sm:block">
              Public Benefit & Higher Education Scholarship Execution Platform
            </p>
          </div>
        </div>

        {/* Action Controls & Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Lifecycle Status */}
          <div className={`px-2.5 py-1 rounded-xl text-xs font-medium border flex items-center gap-2 ${badge.badgeStyle}`}>
            <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
            <span>{badge.label}</span>
          </div>

          {/* Data.gov.in Live Sync */}
          {onSyncLiveData && (
            <button
              type="button"
              onClick={onSyncLiveData}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-[#F4F7FB] border border-[#E5EAEF] text-xs font-medium text-[#5A6A85] hover:text-[#2A3547] transition-colors cursor-pointer disabled:opacity-50"
              title="Synchronize schemes with national registry"
            >
              <Database className={`w-3.5 h-3.5 text-[#5D87FF] ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Portal Data</span>
            </button>
          )}

          {/* Evaluator / User Walkthrough */}
          {onOpenWalkthrough && (
            <button
              type="button"
              onClick={onOpenWalkthrough}
              className="px-2.5 py-1 rounded-xl text-xs font-medium bg-white hover:bg-[#F4F7FB] border border-[#E5EAEF] text-[#5A6A85] hover:text-[#2A3547] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Platform Walkthrough & Architecture Tour"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFAE1F]" />
              <span>Tour Guide</span>
            </button>
          )}

          {/* System Telemetry & Reasoning Inspector */}
          {onToggleInspector && (
            <button
              type="button"
              onClick={onToggleInspector}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isInspectorOpen
                  ? 'bg-[#5D87FF] text-white border-[#5D87FF] shadow-xs'
                  : 'bg-white hover:bg-[#F4F7FB] text-[#5A6A85] hover:text-[#2A3547] border-[#E5EAEF]'
              }`}
              title="Toggle Telemetry & Audit Inspector"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>System Inspector</span>
              {eventCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                  isInspectorOpen ? 'bg-[#4a75ee] text-white' : 'bg-[#F8FAFC] text-[#5A6A85] border border-[#E5EAEF]'
                }`}>
                  {eventCount}
                </span>
              )}
            </button>
          )}

          {/* WebSocket Connection State */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#E5EAEF] text-xs text-[#5A6A85]">
            <Activity className={`w-3.5 h-3.5 ${wsConnected ? 'text-[#13DEB9]' : 'text-[#FFAE1F]'}`} />
            <span className="hidden sm:inline font-medium">Gateway:</span>
            <span className={`font-semibold ${wsConnected ? 'text-[#13DEB9]' : 'text-[#FFAE1F]'}`}>
              {wsConnected ? 'Online' : 'Standby'}
            </span>
          </div>

          {/* Reset / New Session */}
          <button
            onClick={onReset}
            className="px-2.5 py-1 rounded-xl bg-[#5D87FF]/15 hover:bg-[#5D87FF]/25 border border-[#5D87FF]/30 text-xs font-semibold text-[#5D87FF] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Start a new application session"
          >
            <span>New Application</span>
          </button>

          {/* Vernacular Language Switcher */}
          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F4F7FB] border border-[#E5EAEF] text-xs font-medium text-[#5A6A85] hover:text-[#2A3547] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Switch language interface"
            >
              <Languages className="w-3.5 h-3.5 text-[#7C8FAC]" />
              <span>{lang === 'hi' ? 'हिंदी' : 'English'}</span>
            </button>
          )}

          {/* Applied Scholarships Registry Button */}
          {onOpenApplied && (
            <button
              onClick={onOpenApplied}
              className="px-2.5 py-1 rounded-xl bg-[#13DEB9]/15 hover:bg-[#13DEB9]/25 border border-[#13DEB9]/30 text-xs font-semibold text-[#13DEB9] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="View filed scholarship records"
            >
              <Award className="w-3.5 h-3.5 text-[#13DEB9]" />
              <span>Submitted ({appliedCount})</span>
            </button>
          )}

          {/* Authenticated Citizen Profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E5EAEF]">
              <button
                type="button"
                onClick={onEditProfile}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-[#F4F7FB] border border-[#E5EAEF] text-xs text-[#2A3547] transition-colors cursor-pointer"
                title="View & update your verified citizen profile"
              >
                <User className="w-3.5 h-3.5 text-[#5D87FF]" />
                <span className="font-semibold text-[#2A3547] max-w-[120px] truncate">{currentUser.fullName}</span>
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1 rounded-xl text-[#7C8FAC] hover:text-[#2A3547] hover:bg-[#E5EAEF]/60 border border-transparent transition-colors cursor-pointer"
                  title="Sign out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
