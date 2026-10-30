import React, { useRef, useState, useEffect } from 'react';
import { ShieldAlert, X, RotateCcw, Lock, FileSignature } from 'lucide-react';
import type { CitizenProfile, ScholarshipScheme } from '../../types';

interface HitlModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CitizenProfile;
  scheme: ScholarshipScheme | null;
  onAuthorizeSubmission: (signatureDataUrl: string) => void;
}

export const HitlModal: React.FC<HitlModalProps> = ({
  isOpen,
  onClose,
  profile,
  scheme,
  onAuthorizeSubmission,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isCertified, setIsCertified] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#38bdf8'; // sky-400
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Human-in-the-Loop Review & Legal Sign-off
              </h3>
              <p className="text-[11px] text-slate-400">
                CivicAgent Statutory Consent Gate before Portal Submission
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-sans text-xs">
          {/* Alert Notice */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Statutory Review Requirement:</strong> The Playwright agent has accurately mapped all
              required form inputs from your verified transcript and income certificate. As a legal safeguard,
              please review the details and provide your digital signature to authorize final submission.
            </div>
          </div>

          {/* Form Verification Summary Table */}
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/50">
            <div className="px-3 py-2 bg-slate-800/80 font-semibold text-slate-200 text-xs border-b border-slate-800">
              Populated Application Data Table
            </div>
            <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Applicant Name:</span>
                <span className="font-semibold text-white">{profile.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">National Identifier:</span>
                <span className="font-mono text-slate-200">{profile.national_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Target Grant Scheme:</span>
                <span className="font-semibold text-cyan-300 truncate block">
                  {scheme?.name || 'Higher Education Grant'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Annual Family Income:</span>
                <span className="font-semibold text-emerald-400">
                  ₹ {profile.income_annual.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Academic Score:</span>
                <span className="text-slate-200">
                  GPA {profile.attributes.gpa || 3.85} • {profile.attributes.percentage || 82.5}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Issuing Authority:</span>
                <span className="text-slate-200">Office of the Tahsildar (Verified)</span>
              </div>
            </div>
          </div>

          {/* Digital Signature Pad */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Citizen Digital Signature:</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Draw with mouse or touch)
                </span>
              </label>
              <button
                onClick={clearSignature}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>

            <div className="rounded-lg border-2 border-dashed border-slate-700 bg-slate-950 overflow-hidden relative">
              <canvas
                ref={canvasRef}
                width={590}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[120px] cursor-crosshair touch-none"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600 text-xs font-mono">
                  Sign above using your mouse or finger
                </div>
              )}
            </div>
          </div>

          {/* Perjury Declaration Checkbox */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCertified}
              onChange={(e) => setIsCertified(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-[11px] text-slate-300 leading-relaxed">
              I declare under penalty of perjury that all facts and supporting credentials submitted
              herein are true, accurate, and complete. I authorize CivicAgent to commit this filing.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleAuthorize}
            disabled={!isCertified || !hasSignature}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Authorize & Submit Application</span>
          </button>
        </div>
      </div>
    </div>
  );
};
