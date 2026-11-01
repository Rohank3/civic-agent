import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  ShieldCheck, 
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TrackingReceipt } from '../../types';

interface ReceiptModalProps {
  receipt: TrackingReceipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (receipt) {
      try {
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#18181b', '#10b981', '#3b82f6', '#71717a'],
        });
      } catch {
        // ignore confetti errors
      }
    }
  }, [receipt]);

  if (!receipt) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(receipt.sha256_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    const { generateReceiptPdf } = await import('../../lib/receiptPdf');
    await generateReceiptPdf(receipt);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(receipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `CivicAgent_Receipt_${receipt.tracking_number}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs font-sans">
      <div className="bg-white border border-[#e4e4e7] rounded-lg max-w-xl w-full max-h-[92vh] flex flex-col shadow-xl overflow-hidden text-[#09090b]">
        {/* Header Banner */}
        <div className="px-5 py-4 bg-white border-b border-[#e4e4e7] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[#09090b]">Application Submitted & Verified</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-medium">
                  OFFICIAL RECORD
                </span>
              </div>
              <p className="text-xs text-[#71717a]">
                Official Government Tracking ID and Cryptographic SHA-256 Receipt Generated
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

        {/* Scrollable Certificate Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Tracking Number Callout Box */}
          <div className="p-4 rounded-md border border-emerald-200 bg-emerald-50/50 text-center space-y-1">
            <span className="text-[11px] text-emerald-800 font-medium uppercase tracking-wider block">
              Official Application Tracking Number
            </span>
            <div className="font-mono text-2xl font-bold tracking-tight text-[#09090b] select-all">
              {receipt.tracking_number}
            </div>
            <span className="text-xs text-[#71717a] block">
              Logged in State Higher Education Department System • {new Date(receipt.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Details Table */}
          <div className="border border-[#e4e4e7] rounded-md overflow-hidden bg-white shadow-xs">
            <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <span className="text-[#71717a] block text-[11px]">Applicant Name:</span>
                <span className="font-medium text-[#09090b]">{receipt.student_name}</span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[11px]">Target Scheme:</span>
                <span className="font-medium text-[#09090b] truncate block" title={receipt.scheme_title}>{receipt.scheme_title}</span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[11px]">Case ID:</span>
                <span className="font-mono text-[#09090b]">{receipt.case_id}</span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[11px]">Verified Grant Amount:</span>
                <span className="font-semibold text-emerald-700 font-mono">
                  {receipt.grant_amount ? `₹ ${receipt.grant_amount.toLocaleString()} / year` : '₹ 25,000 / year'}
                </span>
              </div>
              {receipt.ministry && (
                <div className="col-span-2 pt-2 border-t border-[#e4e4e7]">
                  <span className="text-[#71717a] block text-[11px]">Issuing Authority:</span>
                  <span className="font-normal text-[#09090b]">{receipt.ministry}</span>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Preservation Guarantee Callout */}
          <div className="p-3 rounded-md border border-[#e4e4e7] bg-[#f4f4f5] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#71717a]">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
              <span>
                <strong className="text-[#09090b] font-medium">Privacy Preservation:</strong> Address and sensitive national ID identifiers are masked in public exports.
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#e4e4e7] text-[#71717a]">
              DPDP Compliant
            </span>
          </div>

          {/* Cryptographic SHA-256 Proof */}
          <div className="p-3.5 rounded-md border border-[#e4e4e7] bg-[#fafafa] space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#09090b] flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>Tamper-Evident SHA-256 Digest (Submission Proof)</span>
              </span>
              <button
                onClick={handleCopyHash}
                className="text-xs text-[#18181b] hover:text-black flex items-center gap-1 cursor-pointer font-medium transition-colors"
              >
                {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-[#09090b] break-all p-2 rounded border border-[#e4e4e7] bg-white">
              {receipt.sha256_hash}
            </div>
            {receipt.signature_hash && (
              <div className="pt-2 border-t border-[#e4e4e7] text-xs flex items-center justify-between">
                <span className="text-[#71717a] font-mono text-[11px]">Citizen Signature Digest:</span>
                <span className="font-mono text-emerald-700 truncate max-w-[240px] text-[11px]">{receipt.signature_hash}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#e4e4e7] bg-white flex items-center justify-between gap-2">
          <button
            onClick={handleDownloadJson}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] px-3 text-xs font-medium text-[#18181b] transition-colors cursor-pointer"
          >
            <FileText className="size-3.5 text-[#71717a]" />
            <span>Export JSON Audit</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#18181b] hover:bg-[#27272a] px-3.5 text-xs font-medium text-white transition-colors cursor-pointer shadow-xs"
          >
            <Download className="size-3.5" />
            <span>Download Official PDF Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
