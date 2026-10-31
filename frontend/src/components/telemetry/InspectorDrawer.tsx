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

interface InspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: TelemetryEvent[];
  currentStage: string;
  activeActor: ActorRole;
  wsConnected: boolean;
}

const STAGES = [
  { id: 'PREFLIGHT', label: 'Pre-flight' },
  { id: 'SPINNING_BROWSER', label: 'Stealth Browser' },
  { id: 'SOLVING_OBSTACLES', label: 'Obstacle Solver' },
  { id: 'POPULATING_FORM', label: 'Form Populate' },
  { id: 'SELF_REFLECTION', label: 'Self-Reflection' },
  { id: 'AWAITING_CITIZEN_REVIEW', label: 'HITL Sign-off' },
  { id: 'SUBMITTED', label: 'Confirmed' },
];

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  isOpen,
  onClose,
  events,
  currentStage,
  activeActor,
  wsConnected,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'AGENT' | 'OBSTACLE' | 'REFLECTION'>('ALL');
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
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
      case 'FORM_POPULATED':
        return <GitCommit className="w-3.5 h-3.5 text-blue-400" />;
      case 'DOCUMENT_ATTACHED':
        return <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'SELF_REFLECTION_VERIFIED':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'AWAITING_CITIZEN_SIGNATURE':
        return <AlertTriangle className="w-3.5 h-3.5 text-pink-400 animate-pulse" />;
      case 'APPLICATION_SUBMITTED':
      case 'RECEIPT_EXTRACTED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <aside 
        className="relative z-10 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
        aria-label="AI Reasoning & Telemetry Inspector"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white">AI Reasoning & Audit Inspector</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Judge Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-time Playwright state machine, tool calls & multimodal audits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTelemetry}
              disabled={events.length === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy Raw Telemetry JSON"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Metrics Bar */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 grid grid-cols-3 gap-2 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">WebSocket</span>
            <span className={`font-semibold flex items-center gap-1 ${wsConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              <Activity className="w-3 h-3" />
              {wsConnected ? 'LIVE FEED' : 'STANDBY'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Active Custody</span>
            <span className="text-slate-200 font-semibold truncate">{activeActor.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Events</span>
            <span className="text-indigo-300 font-bold">{events.length}</span>
          </div>
        </div>

        {/* State Machine DAG / Progress Stepper */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
            Execution State Machine
          </span>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, idx) => {
              const isCompleted = idx < activeStageIdx;
              const isCurrent = idx === activeStageIdx;
              return (
                <div key={s.id} className="flex items-center gap-1 min-w-fit">
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-semibold'
                        : isCompleted
                        ? 'bg-slate-800 text-emerald-400 font-mono'
                        : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    {isCompleted && '✓ '}
                    {s.label}
                  </div>
                  {idx < STAGES.length - 1 && (
                    <ArrowRight className={`w-2.5 h-2.5 ${isCompleted ? 'text-emerald-500/60' : 'text-slate-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          {(['ALL', 'AGENT', 'OBSTACLE', 'REFLECTION'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'ALL' && 'All Telemetry'}
              {f === 'AGENT' && 'Agent Loop'}
              {f === 'OBSTACLE' && 'Obstacles'}
              {f === 'REFLECTION' && 'Self-Reflection'}
            </button>
          ))}
        </div>

        {/* Event Timeline Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2.5 font-sans">
          {filteredEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Layers className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
              <p className="text-xs font-medium text-slate-400">No Telemetry Recorded</p>
              <p className="text-[11px] text-slate-500 max-w-[240px] mt-1">
                Select an eligible scholarship scheme and initiate &quot;Auto-Apply&quot; to begin streaming real-time browser actions.
              </p>
            </div>
          ) : (
            filteredEvents.map((evt, index) => {
              const timeStr = new Date(evt.timestamp).toLocaleTimeString();
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800/70 transition-colors space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {getActionIcon(evt.action)}
                      <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono">
                        {evt.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-mono text-slate-500">{timeStr}</span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed pl-5 font-mono">
                    {evt.details}
                  </p>

                  <div className="pl-5 pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <div className="flex items-center gap-3">
                      {evt.step !== undefined && <span>Step {evt.step}</span>}
                      {evt.fields_filled !== undefined && evt.fields_filled > 0 && (
                        <span>• {evt.fields_filled} Inputs Filled</span>
                      )}
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-[9px] text-slate-400">
                      {evt.actor}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>Playwright CDP • Session Verified</span>
          </div>
          <button
            type="button"
            onClick={handleCopyTelemetry}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
          >
            Export Audit Payload
          </button>
        </div>
      </aside>
    </div>
  );
};
