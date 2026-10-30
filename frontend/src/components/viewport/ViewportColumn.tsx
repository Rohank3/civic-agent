import React from 'react';
import { 
  SkipForward, 
  Globe, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  FileCheck, 
  AlertCircle,
  KeyRound
} from 'lucide-react';
import type { ActorRole, CitizenProfile, ScholarshipScheme } from '../../types';

interface ViewportColumnProps {
  currentStage: string;
  activeActor: ActorRole;
  pacingMode: '1x' | '2x' | '5x' | 'turbo';
  setPacingMode: (mode: '1x' | '2x' | '5x' | 'turbo') => void;
  onSkipTyping: () => void;
  screenshotBase64: string | null;
  currentStep: number;
  profile: CitizenProfile;
  selectedScheme: ScholarshipScheme | null;
  isExecuting: boolean;
  onTriggerHitlSignoff: () => void;
}

export const ViewportColumn: React.FC<ViewportColumnProps> = ({
  currentStage,
  activeActor,
  pacingMode,
  setPacingMode,
  onSkipTyping,
  screenshotBase64,
  currentStep,
  profile,
  selectedScheme,
  isExecuting,
  onTriggerHitlSignoff,
}) => {
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
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/30">
            3
          </div>
          <h2 className="font-semibold text-sm text-slate-100">Live Viewport Screencast</h2>
        </div>

        {/* Smart Pacing & Chapter Cuts Bar */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800" title="Agent execution pacing between browser actions">
          <span className="text-[10px] text-slate-400 font-medium px-1.5 hidden sm:inline">Pacing:</span>
          <button
            onClick={() => setPacingMode('1x')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
              pacingMode === '1x' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1x
          </button>
          <button
            onClick={() => setPacingMode('2x')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
              pacingMode === '2x' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2x
          </button>
          <button
            onClick={() => setPacingMode('5x')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
              pacingMode === '5x' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            5x
          </button>
          <button
            onClick={() => setPacingMode('turbo')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
              pacingMode === 'turbo' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Turbo
          </button>

          {/* Skip Repetitive Typing Chapter Cut Button */}
          <button
            onClick={onSkipTyping}
            disabled={!isExecuting || currentStage === 'SUBMITTED'}
            className="ml-1 px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-300 text-[10px] font-semibold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            title="Fast forward through mechanical field typing to the next milestone"
          >
            <SkipForward className="w-3 h-3" />
            <span>Skip Typing</span>
          </button>
        </div>
      </div>

      {/* Custody Persona Status Bar */}
      <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-300">{getActorTitle()}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <Globe className="w-3 h-3 text-cyan-400" />
          <span className="truncate max-w-[200px]">
            {selectedScheme ? selectedScheme.portal_url : 'https://scholarships.gov.in'}
          </span>
        </div>
      </div>

      {/* Main Screencast Display */}
      <div className="flex-1 bg-slate-950 flex flex-col p-4 overflow-y-auto">
        {screenshotBase64 ? (
          <div className="rounded-lg border border-slate-800 overflow-hidden shadow-2xl bg-black flex-1 flex items-center justify-center">
            <img
              src={`data:image/jpeg;base64,${screenshotBase64}`}
              alt="Live Browser Screencast"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          /* Live Synthetic Portal Screencast Simulation Frame */
          <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden flex flex-col">
            {/* Browser Address Bar UI */}
            <div className="bg-slate-800 px-3 py-1.5 border-b border-slate-700 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
              </div>
              <div className="flex-1 bg-slate-900 px-2 py-0.5 rounded text-[11px] text-slate-300 font-mono flex items-center gap-1 border border-slate-700/60">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>
                  {selectedScheme ? selectedScheme.portal_url : 'https://scholarships.gov.in/portal/wizard'}
                </span>
              </div>
            </div>

            {/* Portal Content Viewport */}
            <div className="p-4 flex-1 overflow-y-auto font-sans text-slate-200 space-y-4">
              <div className="border-b border-slate-700/60 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {selectedScheme ? selectedScheme.name : 'State Public Scholarship & Grant Portal'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Official Application Form for Higher Education Financial Aid
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Step {currentStep} of 3
                </span>
              </div>

              {/* Step 1 Simulation: Demographics */}
              {currentStep === 1 && (
                <div className="space-y-3 text-xs">
                  {selectedScheme?.login_mode === 'credentials' && (
                    <div className="p-2.5 rounded bg-blue-950/40 border border-blue-500/40 text-[11px] text-blue-200 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        <strong>Portal Authenticated:</strong> Session unlocked using encrypted credentials for{' '}
                        <code>{selectedScheme.credentials_username || 'Student User'}</code>.
                      </span>
                    </div>
                  )}

                  <div className="p-2.5 rounded bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Agent auto-filling applicant demographics via heuristic DOM matcher.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        readOnly
                        value={profile.full_name}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">National ID / Aadhaar</label>
                      <input
                        type="text"
                        readOnly
                        value={profile.national_id}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Contact Email</label>
                      <input
                        type="text"
                        readOnly
                        value={profile.email}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Phone Number</label>
                      <input
                        type="text"
                        readOnly
                        value={profile.phone}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 Simulation: Academic & Income Evidence */}
              {currentStep === 2 && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 rounded bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-200 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Uploading verified proof documents and mapping household income ceiling.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Annual Household Income</label>
                      <input
                        type="text"
                        readOnly
                        value={`₹ ${profile.income_annual.toLocaleString()}`}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-emerald-400 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Academic Score (GPA / %)</label>
                      <input
                        type="text"
                        readOnly
                        value={`${profile.attributes.gpa || 3.85} GPA / ${profile.attributes.percentage || 82.5}%`}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-cyan-400 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-950/20 text-[11px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Attached Document: Official_Transcript.pdf (Verified)</span>
                  </div>
                </div>
              )}

              {/* Step 3 Simulation: Final Review & HITL Trigger */}
              {currentStep >= 3 && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded bg-purple-950/40 border border-purple-500/40 text-purple-200 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <AlertCircle className="w-4 h-4 text-pink-400 animate-pulse" />
                      <span>Legal Declaration & Signature Gate</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      The autonomous agent has populated all 14 form elements. As a legal guardrail, final submission requires citizen digital review.
                    </p>
                    <button
                      onClick={onTriggerHitlSignoff}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      <span>Open Review & Digital Signature Pad</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
