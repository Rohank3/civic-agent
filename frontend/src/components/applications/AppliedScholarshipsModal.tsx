import React from 'react';
import { 
  X, 
  Award, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  Play, 
  Calendar, 
  Hash, 
  FileCheck,
  Building,
  ShieldCheck,
  Copy
} from 'lucide-react';
import type { AppliedScholarship, TrackingReceipt } from '../../types';
import { generateReceiptPdf } from '../../lib/receiptPdf';

interface AppliedScholarshipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: AppliedScholarship[];
  onOpenReceipt: (receipt: TrackingReceipt) => void;
  onReplayRecording: (app: AppliedScholarship) => void;
}

export const AppliedScholarshipsModal: React.FC<AppliedScholarshipsModalProps> = ({
  isOpen,
  onClose,
  applications,
  onOpenReceipt,
  onReplayRecording,
}) => {
  if (!isOpen) return null;

  const totalGrantValue = applications.reduce((acc, curr) => acc + (curr.grantAmount || 0), 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Applied Scholarships Registry</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  {applications.length} Filed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official statutory tracking records, cryptographic receipts, and execution recordings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Overview Bar */}
        {applications.length > 0 && (
          <div className="px-5 py-3 bg-slate-950/50 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400">Total Grants Applied:</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">₹{totalGrantValue.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">Filing Authority:</span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">National Scholarship Portal</p>
            </div>
            <div className="hidden sm:block">
              <span className="text-[11px] text-slate-400">Verification Seal:</span>
              <p className="text-sm font-mono text-cyan-400 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SHA-256 Validated</span>
              </p>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {applications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-500">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">No Applied Scholarships Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Select an eligible statutory scheme from the left catalog and click "Auto-Apply with CivicAgent" to file your first application.
                </p>
              </div>
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id || app.trackingNumber}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all space-y-3"
              >
                {/* Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-white">{app.schemeName}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>CONFIRMED & SEALED</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <Building className="w-3 h-3 text-slate-500" />
                      <span>{app.ministry}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-emerald-400">
                      ₹{app.grantAmount.toLocaleString()}/yr
                    </span>
                    <span className="block text-[10px] text-slate-500">Statutory Grant</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800/60 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Hash className="w-3 h-3 text-slate-500" />
                      <span>Official Tracking ID:</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(app.trackingNumber)}
                      className="font-bold text-blue-400 hover:text-blue-300 active:text-blue-500 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded-sm active:scale-95 transition-transform"
                      title="Copy Tracking ID"
                    >
                      <span>{app.trackingNumber}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>Filing Timestamp:</span>
                    </span>
                    <span className="text-slate-300 text-[11px]">
                      {new Date(app.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                    <span className="text-slate-400">SHA-256 Digest:</span>
                    <span className="text-cyan-400 font-mono truncate max-w-[280px]">
                      {app.sha256Hash}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {/* Replay Screencast / Recording */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onReplayRecording(app);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/60 active:bg-indigo-600/80 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Replay Execution Screencast</span>
                  </button>

                  {/* View / Download PDF Receipt */}
                  {app.receipt && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenReceipt(app.receipt!);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Tracking Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => generateReceiptPdf(app.receipt!)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </>
                  )}

                  {/* External Portal Link */}
                  <a
                    href={app.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-400 hover:text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    title="Open Government Portal"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Official State & Central Scholarship Registry</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white font-medium transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
