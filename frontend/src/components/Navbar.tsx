import React from 'react';
import { ShieldCheck, Activity, Database, Sparkles, UserCheck, User, LogOut, Award, Terminal } from 'lucide-react';
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
}

export const Navbar: React.FC<NavbarProps> = ({ 
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
}) => {
  const getActorBadge = () => {
    switch (activeActor) {
      case 'STUDENT_INTAKE':
        return { label: 'Student Intake Phase', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'AUTONOMOUS_AGENT':
        return { label: 'Agent in Browser Control', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse' };
      case 'CITIZEN_HITL':
        return { label: 'Citizen HITL Gate Active', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-bounce' };
      case 'GOVERNMENT_AUTHORITY':
        return { label: 'Government Portal Confirmed', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
  };

  const badge = getActorBadge();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                CivicAgent
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                Autonomous Cockpit
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Autonomous Higher Education Grant & Bureaucracy Execution Platform
            </p>
          </div>
        </div>

        {/* Live Badges & Actor Persona */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Custody Persona Badge */}
          <div className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 ${badge.color}`}>
            <UserCheck className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>

          {/* Live Data.gov.in Sync Button */}
          {onSyncLiveData && (
            <button
              type="button"
              onClick={onSyncLiveData}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-slate-300 transition-colors cursor-pointer"
              title="Click to perform live Data.gov.in API catalog sync"
            >
              <Database className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Data.gov.in</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">LIVE SYNC</span>
            </button>
          )}

          {/* AI Reasoning & Audit Inspector Button (Judge Toggle) */}
          {onToggleInspector && (
            <button
              type="button"
              onClick={onToggleInspector}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isInspectorOpen
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-indigo-500/30'
                  : 'bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300'
              }`}
              title="Toggle AI Reasoning & Execution Telemetry Inspector (Judge View)"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Inspector</span>
              {eventCount > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-200 text-[10px] rounded-full font-mono">
                  {eventCount}
                </span>
              )}
            </button>
          )}

          {/* Telemetry Stream Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Activity className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">Telemetry:</span>
            <span className={wsConnected ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
              {wsConnected ? 'Connected' : 'Standby'}
            </span>
          </div>

          {/* Reset / New Session */}
          <button
            onClick={onReset}
            className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Reset session and load new applicant"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Case</span>
          </button>

          {/* Applied Scholarships Registry Button */}
          {onOpenApplied && (
            <button
              onClick={onOpenApplied}
              className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="View all filed scholarship applications & receipts"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Applied ({appliedCount})</span>
            </button>
          )}

          {/* Authenticated Citizen Profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-1.5 border-l border-slate-800">
              <button
                type="button"
                onClick={onEditProfile}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-xs text-blue-300 transition-colors cursor-pointer"
                title="Click to view and edit your Citizen Profile"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-white max-w-[120px] truncate">{currentUser.fullName}</span>
                <span className="text-[10px] text-blue-400/80 hidden lg:inline">({currentUser.username})</span>
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1 rounded-md bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
                  title="Switch Citizen User / Sign Out"
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
};
