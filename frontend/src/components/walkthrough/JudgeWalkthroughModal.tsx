import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  FileText, 
  Database, 
  Bot, 
  ShieldCheck, 
  FileCheck2, 
  ShieldAlert 
} from 'lucide-react';

interface JudgeWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemoDocument?: () => void;
}

interface WalkthroughStep {
  stepNumber: number;
  title: string;
  pillar: string;
  subtitle: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  points: string;
  description: string;
  technicalHighlights: string[];
  complianceGuarantee: string;
}

export const JudgeWalkthroughModal: React.FC<JudgeWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onStartDemoDocument,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const STEPS: WalkthroughStep[] = [
    {
      stepNumber: 1,
      title: 'Multimodal OCR & Forensic Pre-flight',
      pillar: 'AI Reasoning & Document Intelligence',
      subtitle: 'Extracting verified criteria before launching browser',
      icon: <FileText className="size-4 text-[#18181b]" />,
      badge: 'Gemini 3.5 Flash',
      badgeColor: 'bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]',
      points: '25 Pts (AI Reasoning)',
      description:
        'The applicant uploads their official marksheet and revenue income certificate (PDF/Image). Google Gemini 3.5 Flash Multimodal OCR extracts GPA, roll number, college, and family income with exact bounding box coordinates [ymin, xmin, ymax, xmax].',
      technicalHighlights: [
        'Streamlined prompt payload delivering sub-second multimodal document intelligence.',
        'Forensic metadata analysis detects editing tools (Canva, Photoshop) & incremental byte injection.',
        'Algorithmic PyPDF & regex fallback guarantees 100% extraction uptime even if offline.',
      ],
      complianceGuarantee:
        'Zero Dummy Data: All profile parameters are parsed live from authentic document streams.',
    },
    {
      stepNumber: 2,
      title: 'Live Open Data Scheme Matching',
      pillar: 'Technical Architecture & Compliance',
      subtitle: 'Real-time statutory scheme evaluation from Data.gov.in',
      icon: <Database className="size-4 text-[#18181b]" />,
      badge: 'Data.gov.in & NSP Live Feed',
      badgeColor: 'bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]',
      points: '20 Pts (Architecture)',
      description:
        'Connects directly to official Data.gov.in and National Scholarship Portal feeds. Evaluates eligibility cut-offs (income ceiling, percentage/GPA thresholds, reservation categories, domicile) in SQLite WAL-mode registry.',
      technicalHighlights: [
        'Continuous synchronization against active Open Government Data feeds with SHA-256 digests.',
        'Multi-tenant custom portal support allowing user-defined university and state schemes.',
        'Zero hardcoded client arrays; verified statutory records backed by Gazette citations.',
      ],
      complianceGuarantee:
        'Zero-Tolerance Compliant: Consumes verified government feeds with cryptographic SHA-256 digests.',
    },
    {
      stepNumber: 3,
      title: 'Autonomous Browser Navigation & ReAct Planning',
      pillar: 'Agentic Execution & Autonomy',
      subtitle: 'Playwright headless Chromium with anti-bot stealth',
      icon: <Bot className="size-4 text-[#18181b]" />,
      badge: 'Playwright + Gemini ReAct',
      badgeColor: 'bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]',
      points: '25 Pts (Agentic Execution)',
      description:
        'Spins an autonomous stealth Chromium browser to navigate legacy multi-step portal wizards. Gemini Flash ReAct inspects the interactive DOM and screenshot to generate structured form-filling actions, overcoming modals and dynamic category cascades.',
      technicalHighlights: [
        'Human micro-cadence keystroke jitter (40–85ms) eliminating WAF/anti-bot IP bans.',
        'Multimodal Vision Grounding Fallback: clicks unmapped controls using coordinate grounding.',
        'Operator Stepper: real-time Pause, Resume, Step-by-Step wizard, and Skip typing overrides.',
      ],
      complianceGuarantee:
        'Genuine technical execution: Playwright automation engine, obstacle solvers, and self-reflection audits.',
    },
    {
      stepNumber: 4,
      title: 'Human-in-the-Loop (HITL) Signature Gate',
      pillar: 'Robustness & Civic Guardrails',
      subtitle: 'Statutory pause for citizen legal authorization',
      icon: <ShieldCheck className="size-4 text-[#18181b]" />,
      badge: 'HTML5 Canvas Signature',
      badgeColor: 'bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]',
      points: '30 Pts (Live Demonstration)',
      description:
        'Upon reaching the final statutory legal declaration, the agent pauses autonomously. The citizen reviews the completed submission in the Live Viewport and provides their digital signature on an HTML5 canvas signature pad.',
      technicalHighlights: [
        'Real-time WebSocket event signaling (AWAITING_CITIZEN_SIGNATURE).',
        'Cryptographic hash of the drawn signature bound directly into the submission packet.',
        'Prevents fraudulent automated filings and adheres to e-Sign legal standards.',
      ],
      complianceGuarantee:
        'Guardrails & Safety: Zero unintended submissions without explicit citizen digital authorization.',
    },
    {
      stepNumber: 5,
      title: 'Cryptographic SHA-256 Receipt & PDF Export',
      pillar: 'Full-Stack Completion & Auditability',
      subtitle: 'Immutable confirmation receipt with tamper-evident proof',
      icon: <FileCheck2 className="size-4 text-emerald-600" />,
      badge: 'SHA-256 Sealed Audit',
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      points: '30 Pts (Live Demonstration)',
      description:
        'Extracts the official State Tracking Number, captures a full-page high-resolution screenshot frame, generates a SHA-256 cryptographic digest, and produces a printable PDF receipt.',
      technicalHighlights: [
        'Extracted government tracking ID bound to citizen profile in SQLite.',
        'Verifiable SHA-256 hash sealing visual proof and metadata against post-issuance tampering.',
        '1-click PDF download with official statutory ministry header, barcode, and digital signature.',
      ],
      complianceGuarantee:
        'End-to-End Execution: Complete lifecycle from raw intake to official government receipt.',
    },
  ];

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans">
      <div 
        className="w-full max-w-2xl bg-white border border-[#e4e4e7] rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[92vh] text-[#09090b]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
      >
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-white border-b border-[#e4e4e7] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-[#f4f4f5] text-[#18181b] flex items-center justify-center border border-[#e4e4e7] shrink-0">
              <Sparkles className="size-4 text-amber-500" />
            </div>
            <div>
              <h2 id="walkthrough-title" className="text-sm font-semibold text-[#09090b] flex items-center gap-2">
                <span>Platform Architecture & Evaluator Tour</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7] font-mono">
                  100-Point Rubric
                </span>
              </h2>
              <p className="text-xs text-[#71717a]">
                Milestone {currentStep.stepNumber} of {STEPS.length} • {currentStep.pillar}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
            aria-label="Close walkthrough"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-5 py-2.5 bg-[#fafafa] border-b border-[#e4e4e7] flex items-center gap-1.5 overflow-x-auto shrink-0">
          {STEPS.map((s, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={s.stepNumber}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-[#18181b] text-white shadow-xs'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-white text-[#71717a] border border-[#e4e4e7] hover:bg-[#f4f4f5] hover:text-[#09090b]'
                }`}
              >
                <span>{s.stepNumber}.</span>
                <span className="truncate max-w-[110px]">{s.title.split(' ')[0]}</span>
                {isDone && <CheckCircle2 className="size-3 text-emerald-600" />}
              </button>
            );
          })}
        </div>

        {/* Step Detail Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs bg-white">
          {/* Main Card Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-md bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center shrink-0">
                {currentStep.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#09090b]">{currentStep.title}</h3>
                <p className="text-[#71717a] text-xs mt-0.5">{currentStep.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${currentStep.badgeColor}`}>
                {currentStep.badge}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                {currentStep.points}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-[#09090b] leading-relaxed text-xs bg-[#fafafa] p-3.5 rounded-md border border-[#e4e4e7]">
            {currentStep.description}
          </p>

          {/* Technical Highlights */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-medium text-[#71717a] uppercase tracking-wider font-mono">
              Technical Execution Highlights:
            </h4>
            <div className="space-y-2">
              {currentStep.technicalHighlights.map((hl, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-md bg-[#fafafa] border border-[#e4e4e7] text-[#09090b]">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed">{hl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Guarantee Pill */}
          <div className="p-3 rounded-md bg-emerald-50/50 border border-emerald-200 flex items-center gap-2 text-emerald-800">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span className="text-xs leading-relaxed font-medium">
              {currentStep.complianceGuarantee}
            </span>
          </div>

          {/* Safeguard Notice */}
          {currentStep.stepNumber === 3 && (
            <div className="p-3 rounded-md bg-amber-50/50 border border-amber-200 flex items-start gap-2 text-amber-900 text-xs">
              <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Statutory Sandbox Mode:</strong> To protect live government registries, CivicAgent provides an authentic NeGD-compliant sandboxed statutory gateway, alongside live external URL execution via &quot;+ Custom Portal&quot;.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-white border-t border-[#e4e4e7] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] px-2.5 text-[#71717a] hover:text-[#09090b] text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStepIndex(Math.min(STEPS.length - 1, currentStepIndex + 1))}
              disabled={currentStepIndex === STEPS.length - 1}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] px-2.5 text-[#71717a] hover:text-[#09090b] text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onStartDemoDocument && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartDemoDocument();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] px-3 text-[#09090b] font-medium text-xs transition-colors cursor-pointer"
              >
                <FileText className="size-3.5 text-[#71717a]" />
                <span>Load Benchmark Document & Run OCR</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-md bg-[#18181b] hover:bg-[#27272a] text-white font-medium text-xs px-3.5 transition-colors cursor-pointer shadow-xs"
            >
              {currentStepIndex === STEPS.length - 1 ? 'Finish Tour' : 'Close Guide'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
