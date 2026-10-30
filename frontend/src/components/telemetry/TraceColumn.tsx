import React, { useRef, useEffect } from 'react';
import { 
  GitCommit, 
  CheckCircle, 
  Clock, 
  Terminal, 
  AlertTriangle, 
  ShieldAlert, 
  FileCheck2, 
  Layers,
  Sparkles
} from 'lucide-react';
import type { TelemetryEvent } from '../../types';

interface TraceColumnProps {
  events: TelemetryEvent[];
  currentStage: string;
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

export const TraceColumn: React.FC<TraceColumnProps> = ({ events, currentStage }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

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

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
            2
          </div>
          <h2 className="font-semibold text-sm text-slate-100">Agent Reasoning Trace</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span>{events.length} Telemetry Events</span>
        </div>
      </div>

      {/* State Machine DAG / Progress Track */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
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
                  <span className={`text-[10px] ${isCompleted ? 'text-emerald-500/60' : 'text-slate-700'}`}>
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Timeline Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-2.5 font-sans">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Layers className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
            <p className="text-xs font-medium text-slate-400">Agent Engine Standby</p>
            <p className="text-[11px] text-slate-500 max-w-[220px] mt-1">
              Select an applicant profile and click &quot;Auto-Apply&quot; to initiate the autonomous execution loop.
            </p>
          </div>
        ) : (
          events.map((evt, index) => {
            const timeStr = new Date(evt.timestamp).toLocaleTimeString();
            return (
              <div
                key={index}
                className="p-2.5 rounded-lg border border-slate-800/90 bg-slate-800/30 hover:bg-slate-800/50 transition-colors space-y-1 text-xs"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    {getActionIcon(evt.action)}
                    <span className="font-semibold text-slate-200 uppercase tracking-wider">
                      {evt.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="font-mono text-slate-500">{timeStr}</span>
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed pl-5">
                  {evt.details}
                </p>

                {evt.step && (
                  <div className="pl-5 pt-0.5 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span>Wizard Step {evt.step}</span>
                    {evt.fields_filled !== undefined && evt.fields_filled > 0 && (
                      <span>• {evt.fields_filled} Fields Populated</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
