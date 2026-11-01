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
        return 'Autonomous Browser Agent In Session';
      case 'CITIZEN_HITL':
        return 'Citizen Review & Legal Consent Gate';
      case 'GOVERNMENT_AUTHORITY':
        return 'State Scholarship Department Receipt Registry';
      default:
        return 'Autonomous Execution Platform';
    }
  };

  const isAwaitingIntervention = currentStage === 'AWAITING_HUMAN_INTERVENTION';

  return (
    <div className="h-full flex-1 flex flex-col bg-[#141C27] border border-[#263244] rounded-xl overflow-hidden shadow-xs font-sans">
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-[#101720] border-b border-[#263244] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#192333] border border-[#263244] flex items-center justify-center text-blue-400 shrink-0">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F1F5F9] flex items-center gap-2">
              <span>Live Portal Viewport</span>
              {isExecuting && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Headless browser session screencast & interactive execution
            </p>
          </div>
        </div>

        {/* Stepper & Execution Controls */}
        <div className="flex items-center gap-1.5 bg-[#141C27] p-1 rounded-lg border border-[#263244] shadow-xs">
          <span className="text-xs text-emerald-400 font-mono font-medium px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded hidden md:inline-flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Human-Paced (40-85ms)</span>
          </span>

          {/* Pause / Resume Button */}
          {onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              disabled={!isExecuting || currentStage === 'SUBMITTED'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                isPaused
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-[#192333] hover:bg-[#202c40] text-slate-200 border border-[#263244]'
              }`}
              title={isPaused ? 'Resume execution' : 'Pause execution'}
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
              className="px-2.5 py-1 rounded-md bg-[#192333] hover:bg-[#202c40] border border-[#263244] text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Advance one step manually"
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
            className="px-2.5 py-1 rounded-md bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Fast forward typing cadence on active page"
          >
            <SkipForward className="w-3 h-3" />
            <span>Fast-Forward</span>
          </button>
        </div>
      </div>

      {/* Custody Persona Status Bar */}
      <div className="px-4 py-2 bg-[#101720]/70 border-b border-[#263244] flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isExecuting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="font-medium text-slate-300 truncate">{getActorTitle()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono shrink-0">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-[260px]">
            {selectedScheme?.portal_url || 'https://scholarships.gov.in'}
          </span>
        </div>
      </div>

      {/* Security Challenge Banner (CAPTCHA / OTP) */}
      {isAwaitingIntervention && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 p-3 px-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Verification Prompt:</strong> Please solve the portal challenge or click continue to proceed.
            </span>
          </div>
          <button
            type="button"
            onClick={onSkipTyping}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-md shadow-xs transition-colors cursor-pointer"
          >
            I Solved It, Continue
          </button>
        </div>
      )}

      {/* Main Viewport Body */}
      <div className="flex-1 bg-[#0B0F14] relative overflow-hidden flex flex-col p-3">
        <div className="w-full flex-1 bg-[#101720] border border-[#263244] rounded-lg flex flex-col overflow-hidden shadow-xs">
          {/* Browser Address Bar Frame */}
          <div className="px-3 py-2 bg-[#141C27] border-b border-[#263244] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
            </div>

            <div className="flex-1 max-w-md bg-[#0B0F14] border border-[#263244] rounded-md px-3 py-1 text-slate-300 text-xs flex items-center gap-2 font-mono min-w-0 shadow-xs">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-xs truncate">
                {selectedScheme?.portal_url || 'https://scholarships.gov.in'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 shrink-0 hidden sm:flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Chromium 1280×800</span>
            </div>
          </div>

          {/* Viewport Frame Area */}
          <div className="flex-1 bg-[#0B0F14] relative overflow-hidden flex flex-col justify-center items-center">
            {displayScreenshot ? (
              /* Real Screencast Frame Received from Playwright */
              <div className="w-full h-full relative flex items-center justify-center p-3 bg-[#0B0F14]">
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#141C27]/95 border border-emerald-500/30 rounded-full px-3 py-1 shadow-xs text-xs font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span className="font-semibold">LIVE PLAYWRIGHT CHROMIUM</span>
                </div>
                <img
                  src={`data:image/jpeg;base64,${displayScreenshot}`}
                  alt="Live Playwright Browser Screencast"
                  className="max-w-full max-h-full object-contain rounded-md shadow-xs border border-[#263244]"
                />
              </div>
            ) : isExecuting ? (
              /* Active Execution Loading Frame */
              <div className="p-8 text-center space-y-3">
                <div className="relative mx-auto w-12 h-12">
                  <div className="w-12 h-12 rounded-xl bg-[#141C27] border border-[#263244] flex items-center justify-center text-blue-400 animate-pulse">
                    <Globe className="w-6 h-6" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#F1F5F9]">Launching Browser Session</h4>
                  <p className="text-xs text-slate-400 font-mono break-all max-w-sm mx-auto">{selectedScheme?.portal_url || 'https://scholarships.gov.in'}</p>
                  <p className="text-xs text-[#94A3B8]">Navigating portal steps and populating student data...</p>
                </div>
              </div>
            ) : (
              /* Standby Execution Ready State */
              <div className="p-6 w-full h-full overflow-y-auto font-sans text-slate-300 flex flex-col justify-center items-center">
                <div className="max-w-md w-full bg-[#141C27] border border-[#263244] rounded-xl p-6 shadow-xs space-y-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#192333] border border-[#263244] flex items-center justify-center text-blue-400 mx-auto">
                    <Monitor className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-[#F1F5F9]">
                      Browser Viewport Standby
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                      Automated Playwright session will stream here upon application launch
                    </p>
                  </div>

                  {/* Portal Target Card */}
                  <div className="p-3.5 rounded-lg bg-[#101720] border border-[#263244] text-left space-y-2 text-xs">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium">Target Statutory Portal:</span>
                      <span className="text-emerald-400 font-mono font-bold">READY</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-[#0B0F14] border border-[#263244] text-xs font-mono text-blue-400 overflow-hidden">
                      <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">{selectedScheme?.portal_url || 'http://localhost:8000/portal/scholarship'}</span>
                    </div>
                    {selectedScheme && (
                      <div className="pt-1 text-xs text-slate-300">
                        <strong className="text-[#F1F5F9]">Target Scheme:</strong> {selectedScheme.name}
                      </div>
                    )}
                  </div>

                  {/* Readiness Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-left">
                    <div className="p-2.5 rounded-lg bg-[#101720] border border-[#263244] flex items-center gap-1.5 text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">Human-Cadence Typing</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#101720] border border-[#263244] flex items-center gap-1.5 text-slate-300">
                      <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">HITL Signature Gate</span>
                    </div>
                  </div>

                  {/* External Portal Testbed Link */}
                  <div className="pt-1 flex items-center justify-center gap-2">
                    <a
                      href={selectedScheme?.portal_url || 'http://localhost:8000/portal/scholarship'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      <span>Open Target Portal in New Tab</span>
                      <Globe className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Receipt Status (if submitted) */}
                  {receipt && (
                    <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 space-y-2 text-left">
                      <div className="flex items-center gap-2 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Application Submitted & Sealed</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Tracking ID: <strong className="font-mono text-emerald-300">{receipt.tracking_number}</strong>
                      </p>
                      {onOpenReceipt && (
                        <button
                          type="button"
                          onClick={onOpenReceipt}
                          className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>View Official Receipt</span>
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
