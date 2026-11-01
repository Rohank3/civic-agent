import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  ShieldAlert, 
  GitCommit, 
  FileCheck2, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Copy, 
  Check, 
  Layers, 
  Cpu, 
  Activity,
  ArrowRight
} from 'lucide-react';
import type { TelemetryEvent, ActorRole } from '../../types';
import { useTelemetryEvents, useExecutionStatus } from '../../lib/executionStore';

export interface InspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events?: TelemetryEvent[];
  currentStage?: string;
  activeActor?: ActorRole;
  wsConnected?: boolean;
}

const STAGES = [
  { id: 'PREFLIGHT', label: 'Pre-flight' },
  { id: 'SPINNING_BROWSER', label: 'Browser Init' },
  { id: 'SOLVING_OBSTACLES', label: 'Obstacle Check' },
  { id: 'POPULATING_FORM', label: 'Form Fill' },
  { id: 'SELF_REFLECTION', label: 'Audit Review' },
  { id: 'AWAITING_CITIZEN_REVIEW', label: 'Citizen Sign' },
  { id: 'SUBMITTED', label: 'Confirmed' },
];

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  isOpen,
  onClose,
  events: propEvents,
  currentStage: propCurrentStage,
  activeActor: propActiveActor,
  wsConnected: propWsConnected,
}) => {
  const streamEvents = useTelemetryEvents();
  const status = useExecutionStatus();

  const events = propEvents !== undefined ? propEvents : streamEvents;
  const currentStage = propCurrentStage !== undefined ? propCurrentStage : status.currentStage;
  const activeActor = propActiveActor !== undefined ? propActiveActor : status.activeActor;
  const wsConnected = propWsConnected !== undefined ? propWsConnected : status.wsConnected;

  const [filter, setFilter] = useState<'ALL' | 'AGENT' | 'OBSTACLE' | 'REFLECTION' | 'COMPLIANCE'>('ALL');
  const [copied, setCopied] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest event
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isOpen]);

  if (!isOpen) return null;

  const getStageIndex = (stage: string) => {
    const idx = STAGES.findIndex((s) => s.id === stage);
    return idx >= 0 ? idx : 0;
  };

  const activeStageIdx = getStageIndex(currentStage);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'OBSTACLE_RESOLVED':
        return <ShieldAlert className="size-3.5 text-amber-500" />;
      case 'FORM_POPULATED':
        return <GitCommit className="size-3.5 text-blue-500" />;
      case 'DOCUMENT_ATTACHED':
        return <FileCheck2 className="size-3.5 text-emerald-500" />;
      case 'SELF_REFLECTION_VERIFIED':
        return <Sparkles className="size-3.5 text-sky-500" />;
      case 'AWAITING_CITIZEN_SIGNATURE':
        return <AlertTriangle className="size-3.5 text-amber-500" />;
      case 'APPLICATION_SUBMITTED':
      case 'RECEIPT_EXTRACTED':
        return <CheckCircle className="size-3.5 text-emerald-500" />;
      default:
        return <Clock className="size-3.5 text-[#a1a1aa]" />;
    }
  };

  const filteredEvents = events.filter((evt) => {
    if (filter === 'AGENT') return evt.actor === 'AUTONOMOUS_AGENT';
    if (filter === 'OBSTACLE') return evt.action === 'OBSTACLE_RESOLVED' || evt.stage === 'SOLVING_OBSTACLES';
    if (filter === 'REFLECTION') return evt.action === 'SELF_REFLECTION_VERIFIED' || evt.stage === 'SELF_REFLECTION';
    return true;
  });

  const handleCopyTelemetry = () => {
    navigator.clipboard.writeText(JSON.stringify(events, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel (Efferd / Shadcn Sheet Style) */}
      <aside 
        className="relative z-10 w-full max-w-xl bg-white border-l border-[#e4e4e7] shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-200 text-[#09090b]"
        aria-label="AI Reasoning & Telemetry Inspector"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e4e4e7] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-[#f4f4f5] text-[#18181b] flex items-center justify-center border border-[#e4e4e7]">
              <Cpu className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-[#09090b]">System Reasoning & Audit Inspector</h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
                  Technical View
                </span>
              </div>
              <p className="text-xs text-[#71717a]">
                Live execution trajectory, state machine, and provenance audits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyTelemetry}
              disabled={events.length === 0}
              className="p-1.5 rounded-md border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#09090b] transition-colors cursor-pointer disabled:opacity-40"
              title="Copy Raw Telemetry JSON"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
              title="Close Inspector"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Live Metrics Bar */}
        <div className="px-5 py-3 bg-[#fafafa] border-b border-[#e4e4e7] grid grid-cols-3 gap-3 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#71717a] uppercase tracking-wider">WebSocket</span>
            <span className={`font-medium flex items-center gap-1 mt-0.5 ${wsConnected ? 'text-emerald-700' : 'text-amber-600'}`}>
              <Activity className="size-3" />
              {wsConnected ? 'CONNECTED' : 'STANDBY'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Active Custody</span>
            <span className="text-[#09090b] font-medium truncate mt-0.5">{activeActor.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Total Events</span>
            <span className="text-[#09090b] font-semibold mt-0.5">{events.length}</span>
          </div>
        </div>

        {/* State Machine DAG / Progress Stepper */}
        <div className="p-3 border-b border-[#e4e4e7] bg-white">
          <span className="text-[10px] text-[#71717a] uppercase tracking-wider block mb-2 font-mono">
            Execution State Machine
          </span>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, idx) => {
              const isCompleted = idx < activeStageIdx;
              const isCurrent = idx === activeStageIdx;
              return (
                <div key={s.id} className="flex items-center gap-1 min-w-fit">
                  <div
                    className={`h-6 px-2 rounded text-[11px] font-medium flex items-center transition-colors ${
                      isCurrent
                        ? 'bg-[#18181b] text-white'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-white text-[#71717a] border border-[#e4e4e7]'
                    }`}
                  >
                    {isCompleted && '✓ '}
                    {s.label}
                  </div>
                  {idx < STAGES.length - 1 && (
                    <ArrowRight className={`size-3 ${isCompleted ? 'text-emerald-600' : 'text-[#d4d4d8]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 py-2.5 border-b border-[#e4e4e7] bg-[#fafafa] flex items-center gap-1.5 overflow-x-auto text-xs">
          {(['ALL', 'AGENT', 'OBSTACLE', 'REFLECTION', 'COMPLIANCE'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`h-7 px-2.5 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                filter === f
                  ? 'bg-[#18181b] text-white shadow-xs'
                  : 'bg-white text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5] border border-[#e4e4e7]'
              }`}
            >
              {f === 'ALL' && 'All Events'}
              {f === 'AGENT' && 'Agent Actions'}
              {f === 'OBSTACLE' && 'Obstacles'}
              {f === 'REFLECTION' && 'Audits'}
              {f === 'COMPLIANCE' && 'Technical Proofs'}
            </button>
          ))}
        </div>

        {/* Event Timeline Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2.5 font-sans bg-white">
          {filter === 'COMPLIANCE' ? (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-md bg-[#fafafa] border border-[#e4e4e7] space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-700 font-medium text-xs">
                  <CheckCircle className="size-4" />
                  <span>Statutory Data & Registry Provenance</span>
                </div>
                <p className="text-xs text-[#71717a] leading-relaxed">
                  All active statutory entitlement programs are loaded dynamically from verified open government data feeds and persistent SQLite WAL tables with continuous SHA-256 state digests.
                </p>
                <div className="pt-2 border-t border-[#e4e4e7] grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-white p-2.5 rounded border border-[#e4e4e7]">
                    <span className="text-[#71717a] block text-[10px]">OGD Gateway:</span>
                    <span className="text-[#09090b]">api.data.gov.in</span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-[#e4e4e7]">
                    <span className="text-[#71717a] block text-[10px]">Database Mode:</span>
                    <span className="text-emerald-700 font-semibold">SQLite WAL</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-md bg-[#fafafa] border border-[#e4e4e7] space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-[#09090b] font-medium text-xs">
                  <Sparkles className="size-4 text-[#71717a]" />
                  <span>Multimodal Reasoning Engine</span>
                </div>
                <p className="text-xs text-[#71717a] leading-relaxed">
                  Form navigation combines DOM inspection with Gemini vision coordinate grounding and human-paced micro-cadence jitter to prevent portal rate limits.
                </p>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#a1a1aa]">
              <Layers className="size-8 mb-2 stroke-1 text-[#d4d4d8]" />
              <p className="text-xs font-medium text-[#09090b]">No Telemetry Recorded</p>
              <p className="text-xs text-[#71717a] max-w-[240px] mt-0.5">
                Select an eligible scholarship and launch an application session to stream real-time events.
              </p>
            </div>
          ) : (
            filteredEvents.map((evt, index) => {
              const timeStr = new Date(evt.timestamp).toLocaleTimeString();
              return (
                <div
                  key={index}
                  className="p-3 rounded-md border border-[#e4e4e7] bg-[#fafafa] hover:border-[#a1a1aa] transition-colors space-y-1.5 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {getActionIcon(evt.action)}
                      <span className="font-medium text-[#09090b] uppercase tracking-wide font-mono text-[11px]">
                        {evt.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-mono text-[#71717a] text-[11px]">{timeStr}</span>
                  </div>

                  <p className="text-[#09090b] text-xs leading-relaxed pl-5 font-mono">
                    {evt.details}
                  </p>

                  <div className="pl-5 pt-1.5 flex items-center justify-between text-xs text-[#71717a] font-mono">
                    <div className="flex items-center gap-2">
                      {evt.step !== undefined && <span>Step {evt.step}</span>}
                      {evt.fields_filled !== undefined && evt.fields_filled > 0 && (
                        <span>• {evt.fields_filled} Inputs Filled</span>
                      )}
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-[#e4e4e7] text-[10px] text-[#71717a]">
                      {evt.actor}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e4e4e7] bg-white flex items-center justify-between text-xs text-[#71717a]">
          <div className="flex items-center gap-2 font-mono">
            <Terminal className="size-3.5 text-[#71717a]" />
            <span>Playwright CDP • Session Verified</span>
          </div>
          <button
            type="button"
            onClick={handleCopyTelemetry}
            className="text-[#18181b] hover:text-black font-medium transition-colors cursor-pointer"
          >
            Export JSON
          </button>
        </div>
      </aside>
    </div>
  );
};
