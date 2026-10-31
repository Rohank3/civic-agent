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
import { generateReceiptPdf } from '../../lib/receiptPdf';

interface ReceiptModalProps {
  receipt: TrackingReceipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (receipt) {
      // Launch celebratory confetti burst
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#818cf8', '#34d399', '#f472b6'],
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

  const handleDownloadPdf = () => {
    generateReceiptPdf(receipt);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Application Submitted & Verified</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  OFFICIAL RECORD
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official Government Tracking ID and Cryptographic SHA-256 Receipt Generated
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Certificate Content */}
        <div className="p-5 overflow-y-auto space-y-4 font-sans text-xs">
          {/* Tracking Number Callout Box */}
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-1">
            <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider block">
              Official Application Tracking Number
            </span>
            <div className="font-mono text-2xl font-bold tracking-tight text-white select-all">
              {receipt.tracking_number}
            </div>
            <span className="text-[10px] text-slate-400 block">
              Logged in State Higher Education Department System • {new Date(receipt.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Details Table */}
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/50">
            <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Applicant:</span>
                <span className="font-semibold text-white">{receipt.student_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Scheme:</span>
                <span className="font-semibold text-cyan-300 truncate block" title={receipt.scheme_title}>{receipt.scheme_title}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Case ID:</span>
                <span className="font-mono text-slate-300">{receipt.case_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Verified Grant:</span>
                <span className="font-semibold text-emerald-400">
                  {receipt.grant_amount ? `₹ ${receipt.grant_amount.toLocaleString()} / year` : '₹ 25,000 / year'}
                </span>
              </div>
              {receipt.ministry && (
                <div className="col-span-2 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400 block">Issuing Authority:</span>
                  <span className="font-medium text-slate-200">{receipt.ministry}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cryptographic SHA-256 Proof */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tamper-Evident SHA-256 Digest (Submission Proof)</span>
              </span>
              <button
                onClick={handleCopyHash}
                className="text-[10px] text-slate-400 hover:text-slate-200 active:text-white flex items-center gap-1 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded-sm"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied Hash' : 'Copy Hash'}</span>
              </button>
            </div>
            <div className="font-mono text-[10px] text-slate-400 break-all p-2 rounded bg-slate-900 border border-slate-800">
              {receipt.sha256_hash}
            </div>
            {receipt.signature_hash && (
              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] flex items-center justify-between">
                <span className="text-slate-400 font-mono">Citizen Signature Proof:</span>
                <span className="font-mono text-emerald-400 truncate max-w-[240px]">{receipt.signature_hash}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2.5">
          <button
            onClick={handleDownloadJson}
            className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export JSON Audit</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Official PDF Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
