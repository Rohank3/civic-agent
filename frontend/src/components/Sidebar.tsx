import React from 'react';
import { 
  LayoutDashboard, 
  Award, 
  FolderCheck, 
  FileCheck2, 
  User, 
  Monitor, 
  Terminal, 
  Database, 
  Sparkles, 
  Activity, 
  LogOut, 
  ShieldCheck,
  Languages
} from 'lucide-react';
import type { CitizenUser, ActorRole } from '../types';

export type DashboardView = 'overview' | 'scholarships' | 'documents' | 'applications' | 'profile' | 'workspace';

interface SidebarProps {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
  currentUser: CitizenUser | null;
  onLogout?: () => void;
  appliedCount: number;
  availableSchemesCount: number;
  isExecuting: boolean;
  isVaultActive: boolean;
  wsConnected: boolean;
  activeActor: ActorRole;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  eventCount: number;
  onSyncLiveData?: () => void;
  isSyncing?: boolean;
  onOpenWalkthrough?: () => void;
  lang?: 'en' | 'hi';
  onToggleLang?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  activeView,
  onNavigate,
  currentUser,
  onLogout,
  appliedCount,
  availableSchemesCount,
  isExecuting,
  isVaultActive,
  wsConnected,
  isInspectorOpen,
  onToggleInspector,
  eventCount,
  onSyncLiveData,
  isSyncing = false,
  onOpenWalkthrough,
  lang = 'en',
  onToggleLang,
}) => {
  const getInitials = (name?: string) => {
    if (!name) return 'CA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <aside className="w-64 min-w-[256px] max-w-[256px] bg-white border-r border-[#e4e4e7] flex flex-col h-screen shrink-0 font-sans select-none z-30">
      {/* Brand Header (Efferd App-Shell Header) */}
      <div className="h-14 px-4 border-b border-[#e4e4e7] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-[#18181b] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm tracking-tight text-[#09090b] truncate">
              CivicAgent
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]">
              Portal
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Section 1: Product / Hub */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-xs font-medium text-[#71717a]">
            Product
          </div>
          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className={`w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
              activeView === 'overview'
                ? 'bg-[#f4f4f5] text-[#18181b] font-semibold'
                : 'text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <LayoutDashboard className={`size-4 shrink-0 ${activeView === 'overview' ? 'text-[#18181b]' : 'text-[#71717a]'}`} />
              <span className="truncate">Dashboard</span>
            </div>
          </button>
        </div>

        {/* Section 2: Services & Aid */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-xs font-medium text-[#71717a]">
            Civic Services
          </div>

          {/* Scholarships */}
          <button
            type="button"
            onClick={() => onNavigate('scholarships')}
            className={`w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
              activeView === 'scholarships'
                ? 'bg-[#f4f4f5] text-[#18181b] font-semibold'
                : 'text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Award className={`size-4 shrink-0 ${activeView === 'scholarships' ? 'text-[#18181b]' : 'text-[#71717a]'}`} />
              <span className="truncate">Scholarships</span>
            </div>
            {availableSchemesCount > 0 && (
              <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-[#e4e4e7] text-[#09090b] font-medium">
                {availableSchemesCount}
              </span>
            )}
          </button>

          {/* Document Locker */}
          <button
            type="button"
            onClick={() => onNavigate('documents')}
            className={`w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
              activeView === 'documents'
                ? 'bg-[#f4f4f5] text-[#18181b] font-semibold'
                : 'text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <FolderCheck className={`size-4 shrink-0 ${activeView === 'documents' ? 'text-[#18181b]' : 'text-[#71717a]'}`} />
              <span className="truncate">Document Vault</span>
            </div>
            {isVaultActive && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 font-medium">
                Sealed
              </span>
            )}
          </button>

          {/* Applications */}
          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className={`w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
              activeView === 'applications'
                ? 'bg-[#f4f4f5] text-[#18181b] font-semibold'
                : 'text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <FileCheck2 className={`size-4 shrink-0 ${activeView === 'applications' ? 'text-[#18181b]' : 'text-[#71717a]'}`} />
              <span className="truncate">Applications</span>
            </div>
            {appliedCount > 0 && (
              <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-[#e4e4e7] text-[#09090b] font-medium">
                {appliedCount}
              </span>
            )}
          </button>
        </div>

        {/* Section 3: Identity & Account */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-xs font-medium text-[#71717a]">
            Identity
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
              activeView === 'profile'
                ? 'bg-[#f4f4f5] text-[#18181b] font-semibold'
                : 'text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <User className={`size-4 shrink-0 ${activeView === 'profile' ? 'text-[#18181b]' : 'text-[#71717a]'}`} />
              <span className="truncate">Citizen Profile</span>
            </div>
          </button>
        </div>

        {/* Section 4: Automation Workspace */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-xs font-medium text-[#71717a]">
            Execution Workspace
          </div>
          <button
            type="button"
            onClick={() => onNavigate('workspace')}
            className={`w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
              activeView === 'workspace'
                ? 'bg-[#f4f4f5] text-[#18181b] font-semibold'
                : isExecuting
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Monitor className={`size-4 shrink-0 ${activeView === 'workspace' ? 'text-[#18181b]' : isExecuting ? 'text-emerald-600' : 'text-[#71717a]'}`} />
              <span className="truncate">Live Agent Session</span>
            </div>
            {isExecuting && (
              <span className="flex size-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
            )}
          </button>
        </div>

        {/* Section 5: Evaluator & Governance */}
        <div className="space-y-1 pt-3 border-t border-[#e4e4e7]">
          <div className="px-3 pb-1 text-xs font-medium text-[#71717a]">
            System & Governance
          </div>

          {/* Toggle Inspector Drawer */}
          <button
            type="button"
            onClick={onToggleInspector}
            className={`w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
              isInspectorOpen
                ? 'bg-[#18181b] text-white font-semibold'
                : 'text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60'
            }`}
            title="Open AI Reasoning & Audit Inspector"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Terminal className="size-4 shrink-0" />
              <span className="truncate">System Inspector</span>
            </div>
            {eventCount > 0 && (
              <span className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-md font-medium ${
                isInspectorOpen ? 'bg-white/20 text-white' : 'bg-[#e4e4e7] text-[#09090b]'
              }`}>
                {eventCount}
              </span>
            )}
          </button>

          {/* Data.gov.in Sync Button */}
          {onSyncLiveData && (
            <button
              type="button"
              onClick={onSyncLiveData}
              disabled={isSyncing}
              className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm font-medium text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60 transition-colors cursor-pointer disabled:opacity-50 text-left"
              title="Synchronize schemes with Data.gov.in"
            >
              <Database className={`size-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="truncate">{isSyncing ? 'Syncing Feeds...' : 'Sync Data.gov.in'}</span>
            </button>
          )}

          {/* Tour Guide Button */}
          {onOpenWalkthrough && (
            <button
              type="button"
              onClick={onOpenWalkthrough}
              className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm font-medium text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60 transition-colors cursor-pointer text-left"
              title="Open Platform Walkthrough"
            >
              <Sparkles className="size-4 text-amber-500 shrink-0" />
              <span className="truncate">Platform Guide</span>
            </button>
          )}

          {/* Language Switcher */}
          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm font-medium text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]/60 transition-colors cursor-pointer text-left"
              title="Switch Language"
            >
              <Languages className="size-4 shrink-0" />
              <span className="truncate">{lang === 'hi' ? 'हिंदी (Hindi)' : 'English (India)'}</span>
            </button>
          )}

          {/* Gateway Status Indicator */}
          <div className="px-3 py-1.5 flex items-center justify-between text-xs font-mono text-[#71717a]">
            <span className="flex items-center gap-1.5">
              <Activity className={`size-3.5 ${wsConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span>Gateway:</span>
            </span>
            <span className={`font-semibold ${wsConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
              {wsConnected ? 'ONLINE 99.9%' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* NavUser Profile Footer (Exact Efferd NavUser Style) */}
      {currentUser && (
        <div className="border-t border-[#e4e4e7] p-2 bg-white">
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-[#f4f4f5] transition-colors">
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1"
              title="View Profile"
            >
              <div className="size-7 rounded-full bg-[#18181b] text-white flex items-center justify-center font-medium text-xs shrink-0">
                {getInitials(currentUser.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-[#09090b] truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-xs text-[#71717a] truncate">
                  {currentUser.email || `${currentUser.username}@citizen.gov.in`}
                </div>
              </div>
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-md text-[#71717a] hover:text-rose-600 hover:bg-[#e4e4e7]/60 transition-colors cursor-pointer shrink-0"
                title="Log out"
              >
                <LogOut className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
