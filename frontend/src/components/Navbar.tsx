import React from 'react';
import { ShieldCheck, Activity, Database, Sparkles, UserCheck } from 'lucide-react';
import type { ActorRole } from '../types';

interface NavbarProps {
  wsConnected: boolean;
  activeActor: ActorRole;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ wsConnected, activeActor, onReset }) => {
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
                Split-Screen Cockpit
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

          {/* Zero Dummy Data Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live <strong className="text-white">data.gov.in</strong> Catalog</span>
          </div>

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
        </div>
      </div>
    </header>
  );
};
