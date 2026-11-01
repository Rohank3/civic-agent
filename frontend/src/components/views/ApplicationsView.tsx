import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Play, 
  FileCheck, 
  ShieldCheck, 
  Copy, 
  ArrowRight,
  Check
} from 'lucide-react';
import type { AppliedScholarship, TrackingReceipt } from '../../types';

interface ApplicationsViewProps {
  applications: AppliedScholarship[];
  onOpenReceipt: (receipt: TrackingReceipt) => void;
  onReplayRecording: (app: AppliedScholarship) => void;
  onNavigate: (view: 'overview' | 'scholarships' | 'documents' | 'applications' | 'profile' | 'workspace') => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = React.memo(({
  applications,
  onOpenReceipt,
  onReplayRecording,
  onNavigate,
}) => {
  const totalGrantValue = applications.reduce((acc, curr) => acc + (curr.grantAmount || 0), 0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadPdf = async (receipt: TrackingReceipt) => {
    setDownloadingId(receipt.tracking_number);
    try {
      const { generateReceiptPdf } = await import('../../lib/receiptPdf');
      await generateReceiptPdf(receipt);
    } catch (err) {
      console.warn('Receipt PDF export error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 font-sans">
      {/* Page Header (Efferd Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-semibold text-xl leading-tight text-[#09090b]">
              Submitted Applications Registry
            </h1>
            <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-medium bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]">
              {applications.length} Records
            </span>
          </div>
          <p className="text-sm text-[#71717a]">
            Official government tracking records, cryptographic receipts, and execution trajectories.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('scholarships')}
          className="h-8 px-3 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Apply to Another Scheme</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {/* Aggregate Overview Strip (Efferd Bordered 3-Column Stats Grid) */}
      <div className="rounded-lg overflow-hidden border border-[#e4e4e7]">
        <div className="grid grid-cols-1 gap-px bg-[#e4e4e7] sm:grid-cols-3">
          <div className="bg-white p-5 flex flex-col justify-between gap-1">
            <span className="font-normal text-[#71717a] text-xs tracking-wide">
              Total Grants Claimed
            </span>
            <p className="font-medium text-2xl tabular-nums text-[#09090b]">
              ₹{totalGrantValue.toLocaleString('en-IN')}/yr
            </p>
            <p className="text-xs text-[#71717a]">Across all filed scholarships</p>
          </div>

          <div className="bg-white p-5 flex flex-col justify-between gap-1">
            <span className="font-normal text-[#71717a] text-xs tracking-wide">
              Filing Authority
            </span>
            <p className="font-medium text-base text-[#09090b] truncate">
              National Scholarship Portal
            </p>
            <p className="text-xs text-[#71717a]">Direct statutory API synchronization</p>
          </div>

          <div className="bg-white p-5 flex flex-col justify-between gap-1">
            <span className="font-normal text-[#71717a] text-xs tracking-wide">
              Integrity Standard
            </span>
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <ShieldCheck className="size-4" />
              <span>SHA-256 Digest Sealed</span>
            </div>
            <p className="text-xs text-[#71717a]">Tamper-evident legal submission proof</p>
          </div>
        </div>
      </div>

      {/* Applications Table (Exact Efferd Recent Invoices Pattern) */}
      <div className="rounded-lg overflow-hidden border border-[#e4e4e7] bg-white">
        <div className="p-6 pb-4 border-b border-[#e4e4e7]">
          <h3 className="font-semibold text-base text-[#09090b]">Statutory Filings</h3>
          <p className="text-xs text-[#71717a] mt-0.5">
            Verifiable tracking numbers and government receipts for all submitted schemes.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="py-16 text-center p-6 space-y-2">
            <div className="size-10 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center text-[#71717a] mx-auto">
              <FileCheck className="size-5" />
            </div>
            <h4 className="font-semibold text-sm text-[#09090b]">No Applications Filed Yet</h4>
            <p className="text-xs text-[#71717a] max-w-sm mx-auto">
              Select an eligible scholarship scheme from the catalog to submit your application.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('scholarships')}
              className="h-8 px-3 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer mt-2"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-xs text-left">
              <thead>
                <tr className="border-b border-[#e4e4e7] text-[#71717a] text-[11px]">
                  <th className="h-10 pl-6 font-medium">Scheme & Department</th>
                  <th className="h-10 px-4 font-medium">Tracking ID</th>
                  <th className="h-10 px-4 font-medium">Timestamp</th>
                  <th className="h-10 px-4 text-right font-medium tabular-nums">Annual Amount</th>
                  <th className="h-10 px-4 text-right font-medium">Status</th>
                  <th className="h-10 pr-6 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e4e7]">
                {applications.map((app) => (
                  <tr key={app.id || app.trackingNumber} className="h-14 hover:bg-[#f4f4f5]/60 transition-colors">
                    <td className="max-w-60 truncate pl-6 font-medium text-[#09090b]">
                      <div>{app.schemeName}</div>
                      <div className="text-[11px] text-[#71717a] font-normal">{app.ministry}</div>
                    </td>
                    <td className="px-4 text-[#71717a] tabular-nums font-mono">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(app.trackingNumber)}
                        className="hover:text-[#09090b] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copy Tracking ID"
                      >
                        <span>#{app.trackingNumber}</span>
                        {copiedId === app.trackingNumber ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 text-[#71717a]">
                      {new Date(app.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="text-right tabular-nums px-4 font-medium text-[#09090b]">
                      ₹{app.grantAmount.toLocaleString('en-IN')}/yr
                    </td>
                    <td className="px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        <span>Submitted</span>
                      </span>
                    </td>
                    <td className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onReplayRecording(app)}
                          className="h-7 px-2.5 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#09090b] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Replay browser screencast"
                        >
                          <Play className="size-3" />
                          <span>Replay</span>
                        </button>
                        {app.receipt && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenReceipt(app.receipt!)}
                              className="h-7 px-2.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <FileCheck className="size-3" />
                              <span>Receipt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(app.receipt!)}
                              disabled={downloadingId === app.receipt.tracking_number}
                              className="p-1.5 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#09090b] transition-colors cursor-pointer disabled:opacity-50"
                              title="Download PDF"
                            >
                              <Download className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

ApplicationsView.displayName = 'ApplicationsView';
