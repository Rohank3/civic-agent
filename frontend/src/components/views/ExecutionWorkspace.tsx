import React, { useRef, useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Monitor, 
  Globe, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  FileCheck, 
  Play, 
  Pause, 
  StepForward, 
  SkipForward, 
  ShieldAlert, 
  Radio, 
  RotateCcw, 
  FileSignature, 
  Terminal, 
  Sparkles, 
  Layers, 
  Download, 
  ExternalLink,
  GitCommit,
  FileCheck2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import type { 
  ScholarshipScheme, 
  CitizenProfile, 
  TrackingReceipt, 
  TelemetryEvent, 
  ActorRole 
} from '../../types';
import { useScreencastFrame } from '../../lib/executionStore';

export interface ExecutionWorkspaceProps {
  scheme: ScholarshipScheme | null;
  profile: CitizenProfile;
  currentStage: string;
  activeActor: ActorRole;
  isExecuting: boolean;
  isPaused?: boolean;
  receipt?: TrackingReceipt | null;
  telemetryEvents: TelemetryEvent[];
  onBack: () => void;
  onTogglePause?: () => void;
  onStepAdvance?: () => void;
  onSkipTyping: () => void;
  onAuthorizeSubmission: (signatureDataUrl: string) => void;
  onReset: () => void;
  onOpenReceiptModal: () => void;
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

export const ExecutionWorkspace: React.FC<ExecutionWorkspaceProps> = ({
  scheme,
  profile,
  currentStage,
  activeActor,
  isExecuting,
  isPaused = false,
  receipt,
  telemetryEvents,
  onBack,
  onTogglePause,
  onStepAdvance,
  onSkipTyping,
  onAuthorizeSubmission,
  onReset,
  onOpenReceiptModal,
}) => {
  const streamScreenshot = useScreencastFrame();
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Signature canvas states for inline HITL sign-off
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isCertified, setIsCertified] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Auto-scroll timeline to latest event
  useEffect(() => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop = timelineScrollRef.current.scrollHeight;
    }
  }, [telemetryEvents]);

  // Set up canvas ink style (Dark ink for light background canvas)
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [currentStage]);

  const getStageIndex = (stage: string) => {
    const idx = STAGES.findIndex((s) => s.id === stage);
    return idx >= 0 ? idx : 0;
  };

  const activeStageIdx = getStageIndex(currentStage);

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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'OBSTACLE_RESOLVED':
        return <ShieldAlert className="size-3.5 text-amber-500 shrink-0" />;
      case 'FORM_POPULATED':
        return <GitCommit className="size-3.5 text-blue-500 shrink-0" />;
      case 'DOCUMENT_ATTACHED':
        return <FileCheck2 className="size-3.5 text-emerald-500 shrink-0" />;
      case 'SELF_REFLECTION_VERIFIED':
        return <Sparkles className="size-3.5 text-sky-500 shrink-0" />;
      case 'AWAITING_CITIZEN_SIGNATURE':
        return <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />;
      case 'APPLICATION_SUBMITTED':
      case 'RECEIPT_EXTRACTED':
        return <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />;
      default:
        return <Clock className="size-3.5 text-[#a1a1aa] shrink-0" />;
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleAuthorize = () => {
    if (!isCertified || !hasSignature || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onAuthorizeSubmission(dataUrl);
  };

  const handleDownloadPdf = async () => {
    if (!receipt) return;
    setIsDownloadingPdf(true);
    try {
      const { generateReceiptPdf } = await import('../../lib/receiptPdf');
      await generateReceiptPdf(receipt);
    } catch (err) {
      console.warn('PDF export error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const isAwaitingIntervention = currentStage === 'AWAITING_HUMAN_INTERVENTION';
  const isAwaitingCitizenSign = currentStage === 'AWAITING_CITIZEN_REVIEW';

  return (
    <div className="flex-1 flex flex-col font-sans text-[#09090b] min-h-[calc(100vh-56px)] bg-white">
      {/* Top Workspace Header Bar (Efferd Header Style: h-14, border-b) */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#e4e4e7] bg-white/95 px-4 sm:px-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e4e4e7] bg-white px-2.5 text-xs font-medium text-[#18181b] hover:bg-[#f4f4f5] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            <span>Dashboard</span>
          </button>

          <div className="h-4 w-px bg-[#e4e4e7]" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[#09090b] truncate">
                {scheme?.name || 'Autonomous Statutory Portal Execution'}
              </h1>
              {isExecuting && (
                <span className="flex size-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#71717a]">
              <span className="truncate">{scheme?.ministry || 'State Authority'}</span>
              <span>•</span>
              <a
                href={scheme?.portal_url || 'https://scholarships.gov.in'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#09090b] hover:underline font-mono truncate flex items-center gap-1"
              >
                <span>{scheme?.portal_url || 'https://scholarships.gov.in'}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </div>
          </div>
        </div>

        {/* Playback Controls & Status Badges */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-700">
            <Radio className="size-3 text-emerald-600 animate-pulse" />
            <span>Human-Paced (40-85ms)</span>
          </span>

          <div className="flex items-center gap-1 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] p-0.5">
            {onTogglePause && (
              <button
                type="button"
                onClick={onTogglePause}
                disabled={!isExecuting || currentStage === 'SUBMITTED'}
                className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                  isPaused
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-[#18181b] hover:bg-[#fcfcfc] border border-[#e4e4e7] shadow-xs'
                }`}
                title={isPaused ? 'Resume execution' : 'Pause execution'}
              >
                {isPaused ? <Play className="size-3 fill-current" /> : <Pause className="size-3" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            )}

            {onStepAdvance && (
              <button
                type="button"
                onClick={onStepAdvance}
                disabled={!isExecuting || currentStage === 'SUBMITTED'}
                className="inline-flex h-7 items-center gap-1 rounded bg-white px-2 text-xs font-medium text-[#18181b] hover:bg-[#fcfcfc] border border-[#e4e4e7] shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Advance one step manually"
              >
                <StepForward className="size-3" />
                <span className="hidden md:inline">Step</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSkipTyping}
              disabled={!isExecuting || currentStage === 'SUBMITTED'}
              className="inline-flex h-7 items-center gap-1 rounded bg-white px-2 text-xs font-medium text-[#18181b] hover:bg-[#fcfcfc] border border-[#e4e4e7] shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Fast forward typing cadence"
            >
              <SkipForward className="size-3" />
              <span>Fast-Forward</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-7 items-center gap-1 rounded bg-white px-2 text-xs font-medium text-[#71717a] hover:text-[#09090b] hover:bg-[#fcfcfc] border border-[#e4e4e7] shadow-xs transition-colors cursor-pointer"
              title="Reset workspace session"
            >
              <RotateCcw className="size-3" />
              <span className="hidden md:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body: 2-Column Split */}
      <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[640px]">
        {/* Left Column: Playwright Chromium Browser Viewport (~60%) */}
        <section className="lg:col-span-7 xl:col-span-7 flex flex-col rounded-lg border border-[#e4e4e7] bg-white overflow-hidden shadow-xs min-h-[520px]">
          {/* Browser Address Bar Chrome (Authentic Efferd / Shadcn Frame) */}
          <div className="flex h-10 items-center justify-between gap-3 border-b border-[#e4e4e7] bg-[#f4f4f5] px-3.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="size-2.5 rounded-full bg-[#d4d4d8] inline-block" />
              <span className="size-2.5 rounded-full bg-[#d4d4d8] inline-block" />
              <span className="size-2.5 rounded-full bg-[#d4d4d8] inline-block" />
            </div>

            <div className="flex-1 max-w-lg rounded-md border border-[#e4e4e7] bg-white px-3 py-1 text-xs text-[#09090b] flex items-center gap-2 font-mono min-w-0 shadow-xs">
              <Lock className="size-3 text-emerald-600 shrink-0" />
              <span className="text-[#71717a] text-xs truncate">
                {scheme?.portal_url || 'https://scholarships.gov.in'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-[#71717a] shrink-0 hidden sm:flex">
              <span className="size-2 rounded-full bg-emerald-500 inline-block" />
              <span>Chromium 1280×800</span>
            </div>
          </div>

          {/* Persona / Custody Sub-header */}
          <div className="flex h-8 items-center justify-between border-b border-[#e4e4e7] bg-white px-3.5 text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`size-1.5 rounded-full shrink-0 ${isExecuting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="font-medium text-[#09090b] truncate">{getActorTitle()}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#71717a] font-mono shrink-0">
              <Globe className="size-3 text-[#71717a] shrink-0" />
              <span className="truncate max-w-[220px]">
                {scheme?.portal_url || 'https://scholarships.gov.in'}
              </span>
            </div>
          </div>

          {/* Security Challenge Banner (CAPTCHA / OTP) */}
          {isAwaitingIntervention && (
            <div className="border-b border-amber-200 bg-amber-50 p-3.5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-900">
                <ShieldAlert className="size-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Verification Prompt:</strong> Please solve the portal challenge or click continue to proceed.
                </span>
              </div>
              <button
                type="button"
                onClick={onSkipTyping}
                className="inline-flex h-7 items-center rounded-md bg-amber-500 px-3 text-xs font-medium text-white hover:bg-amber-600 transition-colors cursor-pointer shadow-xs"
              >
                I Solved It, Continue
              </button>
            </div>
          )}

          {/* Browser Viewport Display Frame */}
          <div className="flex-1 bg-[#fafafa] relative overflow-hidden flex flex-col justify-center items-center p-4">
            {streamScreenshot ? (
              <div className="w-full h-full relative flex items-center justify-center bg-[#fafafa]">
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-3 py-1 shadow-xs text-xs font-mono text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span className="font-semibold text-[11px]">LIVE CHROMIUM STREAM</span>
                </div>
                <img
                  src={`data:image/jpeg;base64,${streamScreenshot}`}
                  alt="Live Playwright Browser Screencast"
                  className="max-w-full max-h-[calc(100vh-290px)] object-contain rounded-md shadow-xs border border-[#e4e4e7]"
                />
              </div>
            ) : isExecuting ? (
              <div className="p-8 text-center space-y-4">
                <div className="size-12 rounded-lg border border-[#e4e4e7] bg-white flex items-center justify-center text-[#18181b] mx-auto shadow-xs animate-pulse">
                  <Globe className="size-6 text-[#71717a]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[#09090b]">Launching Browser Session</h4>
                  <p className="text-xs text-[#71717a] font-mono break-all max-w-sm mx-auto">
                    {scheme?.portal_url || 'https://scholarships.gov.in'}
                  </p>
                  <p className="text-xs text-[#71717a]">Navigating portal steps and populating student data...</p>
                </div>
              </div>
            ) : (
              <div className="p-8 max-w-md w-full rounded-lg border border-[#e4e4e7] bg-white text-center space-y-4 shadow-xs">
                <div className="size-12 rounded-lg border border-[#e4e4e7] bg-[#f4f4f5] flex items-center justify-center text-[#18181b] mx-auto">
                  <Monitor className="size-6 text-[#71717a]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#09090b]">Browser Viewport Ready</h3>
                  <p className="text-xs text-[#71717a]">
                    Live Playwright browser execution stream will appear here upon launch.
                  </p>
                </div>

                <div className="p-3 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] text-left text-xs space-y-2">
                  <div className="flex items-center justify-between text-[#71717a]">
                    <span className="font-medium">Target Statutory Portal:</span>
                    <span className="text-emerald-600 font-mono font-semibold">READY</span>
                  </div>
                  <div className="p-2 rounded border border-[#e4e4e7] bg-white font-mono text-[#09090b] truncate text-[11px]">
                    {scheme?.portal_url || 'https://scholarships.gov.in'}
                  </div>
                  {scheme && (
                    <div className="text-[#09090b] pt-0.5">
                      <span className="text-[#71717a]">Scheme: </span>
                      <span className="font-medium">{scheme.name}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-left">
                  <div className="p-2.5 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] flex items-center gap-2 text-[#09090b]">
                    <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium">Human-Cadence</span>
                  </div>
                  <div className="p-2.5 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] flex items-center gap-2 text-[#09090b]">
                    <Lock className="size-4 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium">Consent Gate</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: State DAG, HITL Gate / Sealed Receipt & Telemetry (~40%) */}
        <section className="lg:col-span-5 xl:col-span-5 flex flex-col rounded-lg border border-[#e4e4e7] bg-white overflow-hidden shadow-xs min-h-[520px]">
          {/* Header */}
          <div className="h-12 px-4 border-b border-[#e4e4e7] bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="size-5 rounded bg-[#18181b] text-white flex items-center justify-center font-semibold text-[11px]">
                3
              </span>
              <h2 className="text-sm font-semibold text-[#09090b]">Execution & Governance</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#71717a]">
              <Terminal className="size-3.5 text-[#71717a]" />
              <span>{telemetryEvents.length} Events</span>
            </div>
          </div>

          {/* State Machine DAG Progress Bar */}
          <div className="p-2.5 border-b border-[#e4e4e7] bg-[#fafafa]">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
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
                      <span className={`text-[10px] ${isCompleted ? 'text-emerald-500' : 'text-[#d4d4d8]'}`}>
                        →
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contextual Action Panels */}
          <div className="p-4 border-b border-[#e4e4e7] space-y-3 bg-white">
            {/* 1. CITIZEN SIGNATURE GATE (HITL) */}
            {isAwaitingCitizenSign ? (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 text-[#09090b] space-y-3">
                <div className="flex items-center gap-2.5">
                  <FileSignature className="size-5 text-amber-600 shrink-0" />
                  <div>
                    <h3 className="text-xs font-semibold text-amber-900">
                      Human-in-the-Loop Review & Legal Sign-off Required
                    </h3>
                    <p className="text-[11px] text-[#71717a] mt-0.5">
                      Review form entries and sign below to authorize final submission.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-md bg-white border border-[#e4e4e7] text-xs shadow-xs">
                  <div>
                    <span className="text-[#71717a] block text-[11px]">Applicant:</span>
                    <span className="font-medium text-[#09090b]">{profile.full_name}</span>
                  </div>
                  <div>
                    <span className="text-[#71717a] block text-[11px]">Annual Income:</span>
                    <span className="font-mono text-emerald-700 font-semibold">
                      ₹{profile.income_annual.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Signature Canvas Pad */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#09090b]">Digital Signature Pad (Draw with Touch or Mouse):</span>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[#71717a] hover:text-[#09090b] underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="relative border border-[#e4e4e7] rounded-md bg-white overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={120}
                      className="w-full h-[120px] cursor-crosshair touch-none bg-white"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {!hasSignature && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-[#a1a1aa]">
                        Sign here to authorize submission
                      </div>
                    )}
                  </div>
                </div>

                {/* Statutory Certification Checkbox */}
                <label className="flex items-start gap-2 text-xs text-[#71717a] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isCertified}
                    onChange={(e) => setIsCertified(e.target.checked)}
                    className="mt-0.5 rounded border-[#e4e4e7] text-[#18181b] focus:ring-[#18181b] cursor-pointer"
                  />
                  <span className="text-[11px] leading-relaxed">
                    I solemnly declare under penalty of perjury under IPC Sec 199/200 that all submitted information and documents are true and genuine.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleAuthorize}
                  disabled={!isCertified || !hasSignature}
                  className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="size-4" />
                  <span>Authorize & Submit Application</span>
                </button>
              </div>
            ) : receipt ? (
              /* 2. SUBMITTED RECEIPT SUMMARY */
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 text-[#09090b] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-900">Application Submitted & Sealed</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                    SEALED
                  </span>
                </div>

                <div className="p-3 rounded-md bg-white border border-[#e4e4e7] space-y-1.5 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717a]">Tracking Number:</span>
                    <span className="font-mono font-semibold text-emerald-700">{receipt.tracking_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717a]">SHA-256 Digest:</span>
                    <span className="font-mono text-[#71717a] text-[10px] truncate max-w-[200px]">
                      {receipt.sha256_hash}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onOpenReceiptModal}
                    className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    <FileCheck className="size-3.5" />
                    <span>View Receipt</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] text-[#18181b] text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="size-3.5 text-[#71717a]" />
                    <span>{isDownloadingPdf ? 'Generating...' : 'Download PDF'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* 3. ACTIVE EXECUTION STAGE INDICATOR */
              <div className="p-3 rounded-md border border-[#e4e4e7] bg-[#fafafa] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-[#71717a]">Phase:</span>
                  <span className="font-medium text-[#09090b] font-mono">{currentStage}</span>
                </div>
                <span className="text-[#71717a] text-xs font-normal">
                  {isExecuting ? 'Autonomous Execution Active' : 'Session Ready'}
                </span>
              </div>
            )}
          </div>

          {/* Real-time Telemetry Timeline Feed */}
          <div ref={timelineScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-sans bg-[#fafafa] max-h-[380px]">
            {telemetryEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#a1a1aa]">
                <Layers className="size-7 mb-2 stroke-1 text-[#d4d4d8]" />
                <p className="text-xs font-medium text-[#09090b]">Execution Feed Standby</p>
                <p className="text-xs text-[#71717a] max-w-[220px] mt-0.5">
                  Actions and verification steps taken by the autonomous agent will appear here in real time.
                </p>
              </div>
            ) : (
              telemetryEvents.map((evt, index) => {
                const timeStr = new Date(evt.timestamp).toLocaleTimeString();
                return (
                  <div
                    key={index}
                    className="p-3 rounded-md border border-[#e4e4e7] bg-white hover:border-[#a1a1aa] transition-colors space-y-1 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[#71717a] text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-[#09090b]">
                        {getActionIcon(evt.action)}
                        <span className="font-mono text-xs">{evt.action}</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#a1a1aa]">{timeStr}</span>
                    </div>

                    <p className="text-[#09090b] leading-relaxed text-xs">{evt.details}</p>

                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#e4e4e7] text-[#71717a] font-mono">
                      <span>Phase: {evt.stage}</span>
                      <span className="text-emerald-700 font-medium">{evt.actor}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
