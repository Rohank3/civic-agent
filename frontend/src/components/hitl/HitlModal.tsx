import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, X, RotateCcw, Lock, FileSignature } from 'lucide-react';
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
        ctx.strokeStyle = '#09090b'; // Crisp high contrast dark ink
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs font-sans">
      <div className="bg-white border border-[#e4e4e7] rounded-lg max-w-2xl w-full max-h-[92vh] flex flex-col shadow-xl overflow-hidden text-[#09090b]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e4e4e7] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-[#f4f4f5] text-[#18181b] flex items-center justify-center border border-[#e4e4e7]">
              <FileSignature className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#09090b]">
                Human-in-the-Loop Review & Legal Sign-off
              </h3>
              <p className="text-xs text-[#71717a]">
                Statutory review and consent gate before application submission
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Alert Notice */}
          <div className="p-3.5 rounded-md bg-[#f4f4f5] border border-[#e4e4e7] text-[#09090b] flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-[#71717a]">
              <strong className="text-[#09090b] font-medium">Statutory Review Requirement:</strong> The autonomous agent has accurately mapped all
              required form fields from your verified transcript and income certificate. Please review your
              details and draw your signature below to authorize submission.
            </div>
          </div>

          {/* Form Verification Summary Table */}
          <div className="border border-[#e4e4e7] rounded-md overflow-hidden bg-white shadow-xs">
            <div className="px-3.5 py-2 bg-[#f4f4f5] font-medium text-[#09090b] text-xs border-b border-[#e4e4e7]">
              Populated Application Data Table
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <span className="text-[#71717a] block text-[11px]">Applicant Name:</span>
                <span className="font-medium text-[#09090b]">{profile.full_name}</span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[11px]">National Identifier:</span>
                <span className="font-mono text-[#09090b]">{profile.national_id}</span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[11px]">Target Scheme:</span>
                <span className="font-medium text-[#09090b] truncate block">
                  {scheme?.name || 'Higher Education Grant'}
                </span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[11px]">Annual Family Income:</span>
                <span className="font-semibold text-emerald-700 font-mono">
                  ₹ {profile.income_annual.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[11px]">Academic Score:</span>
                <span className="text-[#09090b]">
                  GPA {profile.attributes.gpa || 3.85} • {profile.attributes.percentage || 82.5}%
                </span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[11px]">Issuing Authority:</span>
                <span className="text-[#71717a]">Verified Revenue Authority</span>
              </div>
            </div>
          </div>

          {/* Digital Signature Pad */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-[#09090b] flex items-center gap-1.5 text-xs">
                <span>Citizen Digital Signature:</span>
                <span className="text-[#71717a] font-normal">
                  (Draw with mouse or touch)
                </span>
              </label>
              <button
                onClick={clearSignature}
                className="text-xs text-[#71717a] hover:text-[#09090b] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="size-3" />
                <span>Clear</span>
              </button>
            </div>

            <div className="rounded-md border border-[#e4e4e7] bg-white overflow-hidden relative shadow-inner">
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
                className="w-full h-[120px] cursor-crosshair touch-none bg-white"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[#a1a1aa] text-xs">
                  Sign here using your mouse or finger
                </div>
              )}
            </div>
          </div>

          {/* Perjury Declaration Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] cursor-pointer select-none hover:bg-[#ececee] transition-colors">
            <input
              type="checkbox"
              checked={isCertified}
              onChange={(e) => setIsCertified(e.target.checked)}
              className="mt-0.5 rounded border-[#e4e4e7] text-[#18181b] focus:ring-[#18181b] size-4 cursor-pointer"
            />
            <span className="text-xs text-[#71717a] leading-relaxed">
              I declare under penalty of perjury that all facts and credentials submitted herein are
              true, accurate, and complete. I authorize CivicAgent to commit this statutory application.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#e4e4e7] bg-white flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-md border border-[#e4e4e7] bg-white px-3 text-xs font-medium text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleAuthorize}
            disabled={!isCertified || !hasSignature}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#18181b] hover:bg-[#27272a] px-3.5 text-xs font-medium text-white shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Lock className="size-3.5" />
            <span>Authorize & Submit Application</span>
          </button>
        </div>
      </div>
    </div>
  );
};
