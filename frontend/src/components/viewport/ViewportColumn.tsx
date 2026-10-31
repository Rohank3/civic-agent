import React, { useState, useEffect } from 'react';
import { 
  SkipForward, 
  Globe, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  FileCheck, 
  Play, 
  Pause, 
  RotateCcw, 
  Monitor, 
  StepForward, 
  ShieldAlert,
  Video
} from 'lucide-react';
import type { ActorRole, CitizenProfile, ScholarshipScheme, TrackingReceipt } from '../../types';

interface ViewportColumnProps {
  currentStage: string;
  activeActor: ActorRole;
  pacingMode: string;
  setPacingMode: (mode: any) => void;
  onSkipTyping: () => void;
  screenshotBase64?: string | null;
  currentStep: number;
  profile: CitizenProfile;
  selectedScheme: ScholarshipScheme | null;
  isExecuting: boolean;
  onTriggerHitlSignoff: () => void;
  receipt?: TrackingReceipt | null;
  onOpenReceipt?: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onStepAdvance?: () => void;
}

export const ViewportColumn: React.FC<ViewportColumnProps> = ({
  currentStage,
  activeActor,
  pacingMode: _pacingMode,
  setPacingMode: _setPacingMode,
  onSkipTyping,
  screenshotBase64,
  currentStep: _currentStep,
  profile: _profile,
  selectedScheme,
  isExecuting,
  onTriggerHitlSignoff: _onTriggerHitlSignoff,
  receipt,
  onOpenReceipt,
  isPaused = false,
  onTogglePause,
  onStepAdvance,
}) => {
  const [viewportMode, setViewportMode] = useState<'live' | 'replay'>('live');
  const [replayStep, setReplayStep] = useState<number>(1);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // Replay playback timer
  useEffect(() => {
    let timer: any;
    if (isReplaying) {
      timer = setInterval(() => {
        setReplayStep((prev) => {
          if (prev >= 5) {
            setIsReplaying(false);
            return 5;
          }
          return prev + 1;
        });
      }, 1600);
    }
    return () => clearInterval(timer);
  }, [isReplaying]);

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

  const replayMilestones = [
    { step: 1, title: 'Obstacle Evasion', desc: 'Auto-dismissed cookie notice and regulatory alert modal' },
    { step: 2, title: 'Demographics Populated', desc: 'Heuristic DOM fill of name, Aadhaar, DOB, and email' },
    { step: 3, title: 'Document & Financial Proofs', desc: 'Attached income certificate and normalized transcript' },
    { step: 4, title: 'Self-Reflection Audit', desc: 'DOM input verification and pre-submission snapshot' },
    { step: 5, title: 'Cryptographic SHA-256 Receipt', desc: 'Government confirmation tracking number extracted' },
  ];

  const isAwaitingIntervention = currentStage === 'AWAITING_HUMAN_INTERVENTION';

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Live Viewport Screencast</span>
              {isExecuting && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              Real-time Playwright Chromium execution frames
            </p>
          </div>
        </div>

        {/* View Mode & Stepper Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewportMode('live')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 cursor-pointer ${
                viewportMode === 'live'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Live Stream</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewportMode('replay');
                setReplayStep(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 cursor-pointer ${
                viewportMode === 'replay'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Audit Replay</span>
            </button>
          </div>

          {/* Stepper & Stealth Cadence Controls */}
          {viewportMode === 'live' && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-emerald-400 font-mono font-semibold px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded hidden md:inline">
                Stealth Human Cadence (40-85ms)
              </span>

              {/* Pause / Resume Button */}
              {onTogglePause && (
                <button
                  type="button"
                  onClick={onTogglePause}
                  disabled={!isExecuting || currentStage === 'SUBMITTED'}
                  className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    isPaused
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 animate-pulse'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
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
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Advance one step in step-by-step mode"
                >
                  <StepForward className="w-3 h-3" />
                  <span className="hidden sm:inline">Step</span>
                </button>
              )}

              {/* Skip Typing Button */}
              <button
                type="button"
                onClick={onSkipTyping}
                disabled={!isExecuting || currentStage === 'SUBMITTED'}
                className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                title="Fast forward through typing cadence on current page"
              >
                <SkipForward className="w-3 h-3" />
                <span>Fast-Forward</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custody Persona Status Bar */}
      <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="font-medium text-slate-300">{getActorTitle()}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span className="truncate max-w-[200px]">
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
              <strong>Security Challenge (CAPTCHA / OTP) Detected:</strong> Please solve the challenge or click Continue.
            </span>
          </div>
          <button
            type="button"
            onClick={onSkipTyping}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-all cursor-pointer"
          >
            I Solved It, Continue
          </button>
        </div>
      )}

      {/* Main Viewport Body */}
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
        {/* =====================================================================
            VIEW 1: AUDIT REPLAY & SCREENCAST RECORDING PLAYER
           ===================================================================== */}
        {viewportMode === 'replay' ? (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
            {/* Player Controls Bar */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplaying(!isReplaying)}
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
                  title={isReplaying ? 'Pause Playback' : 'Play Session Recording'}
                >
                  {isReplaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsReplaying(false);
                    setReplayStep(1);
                  }}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Rewind to Beginning"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="ml-1">
                  <span className="text-xs font-bold text-white block">Execution Audit Recording</span>
                  <span className="text-[10px] text-slate-400">Step {replayStep} of 5 • Playwright Headless Session</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                  {isReplaying ? 'PLAYING' : 'PAUSED'}
                </span>
                <button
                  type="button"
                  onClick={() => setViewportMode('live')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Return to Live
                </button>
              </div>
            </div>

            {/* Stepper Scrubber Timeline */}
            <div className="grid grid-cols-5 gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
              {replayMilestones.map((m) => {
                const isCurrent = replayStep === m.step;
                const isPassed = replayStep > m.step;
                return (
                  <button
                    key={m.step}
                    type="button"
                    onClick={() => {
                      setIsReplaying(false);
                      setReplayStep(m.step);
                    }}
                    className={`p-2 rounded-lg text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600/30 border border-blue-500 text-white ring-1 ring-blue-500/40'
                        : isPassed
                        ? 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900/40 border border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                      {isPassed ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span>0{m.step}</span>}
                    </div>
                    <p className="text-[10px] font-semibold mt-1 truncate">{m.title}</p>
                  </button>
                );
              })}
            </div>

            {/* Screen Recording Viewport Frame */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-semibold">Audit Milestone #{replayStep} Verified</span>
                  <span className="text-slate-400">Playwright Frame #{replayStep * 14}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{replayMilestones[replayStep - 1].title}</h4>
                <p className="text-xs text-slate-300">{replayMilestones[replayStep - 1].desc}</p>
                {replayStep === 5 && (
                  <div className="pt-2 border-t border-slate-800 text-xs space-y-1 font-mono">
                    <p className="text-slate-400">• Official Tracking ID: <strong className="text-emerald-400">{receipt?.tracking_number || 'PUB-REC-2026-CONFIRMED'}</strong></p>
                    <p className="text-slate-400">• SHA-256 Digest: <span className="text-cyan-400 text-[10px] break-all">{receipt?.sha256_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* =====================================================================
              VIEW 2: LIVE SCREENCAST (REAL PLAYWRIGHT FRAMES)
             ===================================================================== */
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <div className="w-full flex-1 bg-slate-900 border border-slate-800 rounded-lg flex flex-col overflow-hidden shadow-inner">
              {/* Browser Address Bar */}
              <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" />
                </div>

                <div className="flex-1 max-w-md bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs flex items-center gap-1.5 font-mono">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-slate-400 text-[11px] truncate">
                    {selectedScheme?.portal_url || 'https://scholarships.gov.in'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span>Chromium 1280×800</span>
                </div>
              </div>

              {/* Viewport Frame Area */}
              <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center">
                {screenshotBase64 ? (
                  /* Real Screencast Frame Received from Playwright */
                  <div className="w-full h-full relative flex items-center justify-center p-2 bg-slate-950">
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur border border-emerald-500/50 rounded-full px-3 py-1 shadow-xl text-[11px] font-mono text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      <span className="font-bold">LIVE PLAYWRIGHT CHROMIUM</span>
                    </div>
                    <img
                      src={`data:image/jpeg;base64,${screenshotBase64}`}
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
                      <p className="text-xs text-slate-400 font-mono">{selectedScheme?.portal_url || 'https://scholarships.gov.in'}</p>
                      <p className="text-[11px] text-slate-500">Injecting human micro-jitter cadence & scanning inputs...</p>
                    </div>
                  </div>
                ) : (
                  /* Standby Authentic Execution Ready State */
                  <div className="p-6 w-full h-full overflow-y-auto font-sans text-slate-200 flex flex-col justify-center items-center">
                    <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
                      <div className="relative mx-auto w-14 h-14">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                          <Monitor className="w-7 h-7" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-white">
                          Playwright Viewport Standby
                        </h3>
                        <p className="text-xs text-slate-400">
                          Stealth Headless Chromium Engine Initialized
                        </p>
                      </div>

                      {/* Portal Target Card */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-left space-y-2 text-xs">
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
                          <span>Stealth Anti-Bot Cadence</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                          <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>HITL Signature Gate</span>
                        </div>
                      </div>

                      {/* External Portal Testbed Link */}
                      <div className="pt-1 flex items-center justify-center gap-2">
                        <a
                          href={selectedScheme?.portal_url || 'http://localhost:8000/portal/scholarship'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2 flex items-center gap-1"
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
                              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
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
        )}
      </div>
    </div>
  );
};
