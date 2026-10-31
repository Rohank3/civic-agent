import React from 'react';
import { 
  SkipForward, 
  Globe, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  FileCheck, 
  Play, 
  Pause, 
  Monitor, 
  StepForward, 
  ShieldAlert,
  Radio
} from 'lucide-react';
import type { ActorRole, ScholarshipScheme, TrackingReceipt } from '../../types';
import { useScreencastFrame } from '../../lib/executionStore';

export interface ViewportColumnProps {
  currentStage: string;
  activeActor: ActorRole;
  selectedScheme: ScholarshipScheme | null;
  isExecuting: boolean;
  screenshotBase64?: string | null;
  receipt?: TrackingReceipt | null;
  onOpenReceipt?: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onStepAdvance?: () => void;
  onSkipTyping: () => void;
}

export const ViewportColumn: React.FC<ViewportColumnProps> = React.memo(({
  currentStage,
  activeActor,
  selectedScheme,
  isExecuting,
  screenshotBase64,
  receipt,
  onOpenReceipt,
  isPaused = false,
  onTogglePause,
  onStepAdvance,
  onSkipTyping,
}) => {
  const streamScreenshot = useScreencastFrame();
  const displayScreenshot = screenshotBase64 !== undefined ? screenshotBase64 : streamScreenshot;

  const getActorTitle = () => {
    switch (activeActor) {
      case 'STUDENT_INTAKE':
        return 'Student Intake & Profile Verification';
      case 'AUTONOMOUS_AGENT':
        return 'Autonomous Agent Operating Headless Chromium';
      case 'CITIZEN_HITL':
        return 'Human-in-the-Loop Review & Legal Consent Gate';
      case 'GOVERNMENT_AUTHORITY':
        return 'State Scholarship Department Receipt Registry';
      default:
        return 'Autonomous Bureaucracy Agent';
    }
  };

  const isAwaitingIntervention = currentStage === 'AWAITING_HUMAN_INTERVENTION';

  return (
    <div className="h-full flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Top Header Bar */}
      <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Live Viewport Screencast</span>
              {isExecuting && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              Real-time Playwright Chromium execution frames
            </p>
          </div>
        </div>

        {/* Live Stepper & Stealth Cadence Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <span className="text-[10px] text-emerald-400 font-mono font-semibold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded hidden md:inline-flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>Stealth Cadence (40-85ms)</span>
          </span>

          {/* Pause / Resume Button */}
          {onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              disabled={!isExecuting || currentStage === 'SUBMITTED'}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
                isPaused
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 animate-pulse hover:bg-amber-400 active:bg-amber-600'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white'
              }`}
              title={isPaused ? 'Resume Agent Execution' : 'Pause Agent Execution'}
            >
              {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}

          {/* Step Next Button */}
          {onStepAdvance && (
            <button
              type="button"
              onClick={onStepAdvance}
              disabled={!isExecuting || currentStage === 'SUBMITTED'}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
              title="Advance one step in step-by-step mode"
            >
              <StepForward className="w-3 h-3" />
              <span className="hidden sm:inline">Step</span>
            </button>
          )}

          {/* Skip / Fast-Forward Typing Button */}
          <button
            type="button"
            onClick={onSkipTyping}
            disabled={!isExecuting || currentStage === 'SUBMITTED'}
            className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/60 active:bg-indigo-600/80 border border-indigo-500/40 text-indigo-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            title="Fast forward through typing cadence on current page"
          >
            <SkipForward className="w-3 h-3" />
            <span>Fast-Forward</span>
          </button>
        </div>
      </div>

      {/* Custody Persona Status Bar */}
      <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isExecuting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="font-medium text-slate-300 truncate">{getActorTitle()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono shrink-0">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-[260px]">
            {selectedScheme?.portal_url || 'https://scholarships.gov.in'}
          </span>
        </div>
      </div>

      {/* Security Challenge Banner (CAPTCHA / OTP) */}
      {isAwaitingIntervention && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 p-2.5 px-4 flex items-center justify-between flex-wrap gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span>
              <strong>Security Challenge (CAPTCHA / OTP) Detected:</strong> Please solve the challenge in the browser viewport or click Continue.
            </span>
          </div>
          <button
            type="button"
            onClick={onSkipTyping}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95"
          >
            I Solved It, Continue
          </button>
        </div>
      )}

      {/* Main Viewport Body */}
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col p-3">
        <div className="w-full flex-1 bg-slate-900 border border-slate-800 rounded-lg flex flex-col overflow-hidden shadow-inner">
          {/* Browser Address Bar */}
          <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" />
            </div>

            <div className="flex-1 max-w-md bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs flex items-center gap-1.5 font-mono min-w-0">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-slate-400 text-[11px] truncate">
                {selectedScheme?.portal_url || 'https://scholarships.gov.in'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 shrink-0 hidden sm:flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Chromium 1280×800</span>
            </div>
          </div>

          {/* Viewport Frame Area */}
          <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center">
            {displayScreenshot ? (
              /* Real Screencast Frame Received from Playwright */
              <div className="w-full h-full relative flex items-center justify-center p-2 bg-slate-950">
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur border border-emerald-500/50 rounded-full px-3 py-1 shadow-xl text-[11px] font-mono text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span className="font-bold">LIVE PLAYWRIGHT CHROMIUM</span>
                </div>
                <img
                  src={`data:image/jpeg;base64,${displayScreenshot}`}
                  alt="Live Playwright Browser Screencast"
                  className="max-w-full max-h-full object-contain rounded-md shadow-2xl border border-slate-800"
                />
              </div>
            ) : isExecuting ? (
              /* Active Execution Loading Frame */
              <div className="p-8 text-center space-y-4">
                <div className="relative mx-auto w-14 h-14">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                    <Globe className="w-7 h-7" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Launching Stealth Chromium Session</h4>
                  <p className="text-xs text-slate-400 font-mono break-all">{selectedScheme?.portal_url || 'https://scholarships.gov.in'}</p>
                  <p className="text-[11px] text-slate-500">Injecting human micro-jitter cadence & scanning inputs...</p>
                </div>
              </div>
            ) : (
              /* Standby Authentic Execution Ready State */
              <div className="p-4 sm:p-6 w-full h-full overflow-y-auto font-sans text-slate-200 flex flex-col justify-center items-center">
                <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-center">
                  <div className="relative mx-auto w-12 sm:w-14 h-12 sm:h-14">
                    <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <Monitor className="w-6 sm:w-7 h-6 sm:h-7" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Playwright Viewport Standby
                    </h3>
                    <p className="text-xs text-slate-400">
                      Stealth Headless Chromium Engine Initialized
                    </p>
                  </div>

                  {/* Portal Target Card */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-left space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-medium text-slate-400">Target Statutory Portal:</span>
                      <span className="text-emerald-400 font-mono font-bold">READY</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-blue-300 overflow-hidden">
                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">{selectedScheme?.portal_url || 'http://localhost:8000/portal/scholarship'}</span>
                    </div>
                    {selectedScheme && (
                      <div className="pt-1 text-[11px] text-slate-300">
                        <strong>Target Scheme:</strong> {selectedScheme.name}
                      </div>
                    )}
                  </div>

                  {/* Readiness Badges */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-left">
                    <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">Stealth Anti-Bot</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                      <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">HITL Signature Gate</span>
                    </div>
                  </div>

                  {/* External Portal Testbed Link */}
                  <div className="pt-1 flex items-center justify-center gap-2">
                    <a
                      href={selectedScheme?.portal_url || 'http://localhost:8000/portal/scholarship'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 active:text-blue-500 underline underline-offset-2 flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      <span>Open Target Portal in Browser Tab</span>
                      <Globe className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Receipt Status (if submitted) */}
                  {receipt && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-2 text-left animate-in fade-in">
                      <div className="flex items-center gap-2 font-semibold text-white text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Statutory Application Confirmed & Sealed</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Tracking ID: <strong className="font-mono text-emerald-300">{receipt.tracking_number}</strong>
                      </p>
                      {onOpenReceipt && (
                        <button
                          type="button"
                          onClick={onOpenReceipt}
                          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>View Official Tracking Receipt</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ViewportColumn.displayName = 'ViewportColumn';
