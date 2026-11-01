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
import { useTelemetryEvents, useExecutionStatus } from '../../lib/executionStore';

export interface TraceColumnProps {
  events?: TelemetryEvent[];
  currentStage?: string;
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

export const TraceColumn: React.FC<TraceColumnProps> = React.memo(({ 
  events: propEvents, 
  currentStage: propCurrentStage 
}) => {
  const streamEvents = useTelemetryEvents();
  const { currentStage: streamStage } = useExecutionStatus();

  const events = propEvents !== undefined ? propEvents : streamEvents;
  const currentStage = propCurrentStage !== undefined ? propCurrentStage : streamStage;

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
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'FORM_POPULATED':
        return <GitCommit className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'DOCUMENT_ATTACHED':
        return <FileCheck2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'SELF_REFLECTION_VERIFIED':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'AWAITING_CITIZEN_SIGNATURE':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'APPLICATION_SUBMITTED':
      case 'RECEIPT_EXTRACTED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#141C27] border border-[#263244] rounded-xl overflow-hidden shadow-xs font-sans">
      {/* Column Header */}
      <div className="px-4 py-3 border-b border-[#263244] bg-[#101720] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            3
          </span>
          <h2 className="font-semibold text-sm text-[#F1F5F9] truncate">Execution Trace</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 shrink-0">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span>{events.length} Events</span>
        </div>
      </div>

      {/* State Machine DAG / Progress Track */}
      <div className="p-2.5 border-b border-[#263244] bg-[#101720]/60">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {STAGES.map((s, idx) => {
            const isCompleted = idx < activeStageIdx;
            const isCurrent = idx === activeStageIdx;
            return (
              <div key={s.id} className="flex items-center gap-1 min-w-fit">
                <div
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : isCompleted
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : 'bg-[#141C27] text-slate-500 border border-[#263244]'
                  }`}
                >
                  {isCompleted && '✓ '}
                  {s.label}
                </div>
                {idx < STAGES.length - 1 && (
                  <span className={`text-xs ${isCompleted ? 'text-emerald-500' : 'text-slate-600'}`}>
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Timeline Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-2.5 font-sans bg-[#0B0F14]">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Layers className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
            <p className="text-xs font-medium text-slate-300">Execution Feed Standby</p>
            <p className="text-xs text-[#94A3B8] max-w-[220px] mt-1">
              Actions and verification steps taken by the autonomous agent will appear here in real time.
            </p>
          </div>
        ) : (
          events.map((evt, index) => {
            const timeStr = new Date(evt.timestamp).toLocaleTimeString();
            return (
              <div
                key={index}
                className="p-3 rounded-lg border border-[#263244] bg-[#141C27] hover:border-slate-600 transition-colors space-y-1.5 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getActionIcon(evt.action)}
                    <span className="font-semibold text-[#F1F5F9] uppercase tracking-wide truncate">
                      {evt.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="font-mono text-slate-500 text-xs shrink-0">{timeStr}</span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed pl-5 break-words">
                  {evt.details}
                </p>

                {evt.step && (
                  <div className="pl-5 pt-0.5 flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span>Wizard Step {evt.step}</span>
                    {evt.fields_filled !== undefined && evt.fields_filled > 0 && (
                      <span>• {evt.fields_filled} Fields Filled</span>
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
});

TraceColumn.displayName = 'TraceColumn';
