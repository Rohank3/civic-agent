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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans">
      <div 
        className="bg-white border border-[#E5EAEF] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#2A3547]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5EAEF] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#13DEB9]/15 border border-[#13DEB9]/30 flex items-center justify-center text-[#13DEB9]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#2A3547]">Submitted Applications Registry</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[#13DEB9]/15 text-[#13DEB9] border border-[#13DEB9]/30 font-semibold">
                  {applications.length} Filed
                </span>
              </div>
              <p className="text-xs text-[#5A6A85]">
                Official statutory tracking records, receipts, and execution trajectories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7C8FAC] hover:text-[#2A3547] hover:bg-[#E5EAEF]/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Overview Bar */}
        {applications.length > 0 && (
          <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E5EAEF] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-xs text-[#5A6A85]">Total Grants Applied:</span>
              <p className="text-sm font-bold text-[#13DEB9] mt-0.5">₹{totalGrantValue.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs text-[#5A6A85]">Filing Authority:</span>
              <p className="text-sm font-semibold text-[#2A3547] mt-0.5">National Scholarship Portal</p>
            </div>
            <div className="hidden sm:block">
              <span className="text-xs text-[#5A6A85]">Integrity Digest:</span>
              <p className="text-sm font-mono text-[#5D87FF] mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-[#13DEB9]" />
                <span>SHA-256 Validated</span>
              </p>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[#F4F7FB]">
          {applications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-xl bg-white border border-[#E5EAEF] flex items-center justify-center text-[#7C8FAC]">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#2A3547]">No Applications Filed Yet</h4>
                <p className="text-xs text-[#5A6A85] mt-1 max-w-sm mx-auto">
                  Select an eligible scholarship scheme from the catalog and click "Auto-Apply with CivicAgent" to submit your application.
                </p>
              </div>
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id || app.trackingNumber}
                className="p-4 rounded-xl border border-[#E5EAEF] bg-white hover:border-[#5D87FF]/50 transition-colors space-y-3 shadow-xs"
              >
                {/* Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5EAEF] pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[#2A3547]">{app.schemeName}</h4>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#13DEB9]/15 text-[#13DEB9] border border-[#13DEB9]/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#13DEB9]" />
                        <span>SUBMITTED & SEALED</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#5A6A85] mt-1">
                      <Building className="w-3.5 h-3.5 text-[#7C8FAC]" />
                      <span>{app.ministry}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-[#13DEB9]">
                      ₹{app.grantAmount.toLocaleString()}/yr
                    </span>
                    <span className="block text-xs text-[#5A6A85]">Statutory Grant</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#F8FAFC] p-3 rounded-lg border border-[#E5EAEF] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6A85] flex items-center gap-1 text-xs">
                      <Hash className="w-3 h-3 text-[#7C8FAC]" />
                      <span>Tracking ID:</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(app.trackingNumber)}
                      className="font-bold text-[#5D87FF] hover:text-[#4a75ee] flex items-center gap-1 cursor-pointer"
                      title="Copy Tracking ID"
                    >
                      <span>{app.trackingNumber}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#5A6A85] flex items-center gap-1 text-xs">
                      <Calendar className="w-3 h-3 text-[#7C8FAC]" />
                      <span>Filing Timestamp:</span>
                    </span>
                    <span className="text-[#2A3547] text-xs">
                      {new Date(app.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between pt-1 border-t border-[#E5EAEF] text-xs">
                    <span className="text-[#5A6A85]">SHA-256 Digest:</span>
                    <span className="text-[#5D87FF] font-mono truncate max-w-[280px]">
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
                    className="px-3 py-1.5 rounded-lg bg-[#5D87FF]/15 hover:bg-[#5D87FF]/25 border border-[#5D87FF]/30 text-[#5D87FF] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>View Screencast</span>
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
                        className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#E5EAEF] border border-[#E5EAEF] text-[#2A3547] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-[#5A6A85]" />
                        <span>View Tracking Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const { generateReceiptPdf } = await import('../../lib/receiptPdf');
                          await generateReceiptPdf(app.receipt!);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#13DEB9] hover:bg-[#0eb899] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
                    className="p-1.5 rounded-lg border border-[#E5EAEF] hover:bg-[#F8FAFC] text-[#5A6A85] hover:text-[#2A3547] transition-colors"
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
        <div className="p-4 border-t border-[#E5EAEF] bg-[#F8FAFC] flex items-center justify-between text-xs text-[#5A6A85]">
          <span className="flex items-center gap-1 text-[#13DEB9] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Official State & Central Scholarship Registry</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-[#F4F7FB] border border-[#E5EAEF] text-[#5A6A85] hover:text-[#2A3547] font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
