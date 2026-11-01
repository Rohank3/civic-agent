import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  TrendingUp
} from 'lucide-react';
import type { 
  CitizenProfile, 
  SchemeMatchResult, 
  DualDocumentExtractionResult, 
  AppliedScholarship 
} from '../../types';

interface OverviewViewProps {
  profile: CitizenProfile;
  dualDocResult: DualDocumentExtractionResult | null;
  schemes: SchemeMatchResult[];
  appliedList: AppliedScholarship[];
  onSelectSchemeAndExecute: (scheme: SchemeMatchResult) => void;
  onNavigate: (view: 'overview' | 'scholarships' | 'documents' | 'applications' | 'profile' | 'workspace') => void;
  onLoadBenchmark?: () => Promise<void> | void;
  onVerifyDigiLocker?: () => void;
  isExecuting: boolean;
  isVaultActive: boolean;
  onOpenReceipt: (receipt: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = React.memo(({
  profile,
  dualDocResult,
  schemes,
  appliedList,
  onSelectSchemeAndExecute,
  onNavigate,
  onLoadBenchmark,
  onVerifyDigiLocker,
  isExecuting,
  isVaultActive,
  onOpenReceipt,
}) => {
  const [chartPeriod, setChartPeriod] = useState<7 | 30>(7);
  const [activeChartIndex, setActiveChartIndex] = useState<number | null>(null);

  const eligibleSchemes = schemes.filter((s) => s.is_eligible);
  const totalPotentialFunding = eligibleSchemes.reduce(
    (acc, curr) => acc + curr.scheme.grant_amount_annual,
    0
  );

  const totalClaimedFunding = appliedList.reduce(
    (acc, curr) => acc + curr.grantAmount,
    0
  );

  const sufficiency = dualDocResult ? Math.round(dualDocResult.sufficiency_score * 100) : null;
  const isQuarantine = dualDocResult?.integrity_report?.quarantine_active;

  // Chart data representing statutory allocation over time
  const chartPoints = useMemo(() => {
    const days = chartPeriod;
    const points = [];
    const baseAmount = totalPotentialFunding > 0 ? totalPotentialFunding / 10 : 25000;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      // deterministic wave
      const central = Math.round(baseAmount * (0.8 + 0.3 * Math.sin(i * 0.7)));
      const state = Math.round(baseAmount * (0.5 + 0.25 * Math.cos(i * 0.5)));
      points.push({ date: label, central, state, total: central + state });
    }
    return points;
  }, [chartPeriod, totalPotentialFunding]);

  const maxChartVal = useMemo(() => {
    return Math.max(...chartPoints.map((p) => p.total), 1);
  }, [chartPoints]);

  return (
    <div className="flex flex-1 flex-col gap-6 font-sans">
      {/* Welcome Header (Exact Efferd Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading font-semibold text-xl leading-tight text-[#09090b]">
            Welcome back, {profile.full_name ? profile.full_name.split(' ')[0] : 'Citizen'}!
          </h1>
          <p className="text-sm text-[#71717a]">
            let&apos;s get things done. Review matched scholarships, document validity, and submitted cases.
          </p>
        </div>

        {onLoadBenchmark && (
          <button
            type="button"
            onClick={onLoadBenchmark}
            disabled={isExecuting}
            className="h-8 px-3 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50 shrink-0"
            title="Load benchmark marksheet & income certificate"
          >
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Load Benchmark Test (Aarav Sharma)</span>
          </button>
        )}
      </div>

      {/* Advisory Alert Banner if Quarantine is Active */}
      {isQuarantine && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start justify-between gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900 block text-xs">
                Document Integrity Quarantine Active
              </span>
              <p className="text-amber-800 mt-0.5 leading-relaxed text-xs">
                Pre-flight forensic analysis detected structural anomalies. Authenticate directly via DigiLocker to clear Section 199/200 IPC checks.
              </p>
            </div>
          </div>
          {onVerifyDigiLocker && (
            <button
              type="button"
              onClick={onVerifyDigiLocker}
              className="h-7 px-2.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              Verify DigiLocker
            </button>
          )}
        </div>
      )}

      {/* The Core Bordered 3-Column Grid (Efferd dashboard-1) */}
      <div className="rounded-lg overflow-hidden border border-[#e4e4e7]">
        <div className="grid grid-cols-1 gap-px bg-[#e4e4e7] lg:grid-cols-3">
          {/* StatCard 1: Active Entitlements / Eligible Schemes */}
          <div className="bg-white p-6 flex flex-col justify-between gap-3">
            <div className="flex flex-row items-center justify-between">
              <span className="font-normal text-[#71717a] text-xs tracking-wide">
                Eligible Schemes
              </span>
              <span className="inline-flex items-center gap-1 text-xs tabular-nums text-emerald-600 font-medium">
                <TrendingUp className="size-3" />
                <span>+12.4%</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-2xl tabular-nums text-[#09090b]">
                {eligibleSchemes.length} Available
              </p>
              <p className="text-xs text-[#71717a]">
                ₹{totalPotentialFunding.toLocaleString('en-IN')} total grant value
              </p>
            </div>
          </div>

          {/* StatCard 2: Claimed Grants */}
          <div className="bg-white p-6 flex flex-col justify-between gap-3">
            <div className="flex flex-row items-center justify-between">
              <span className="font-normal text-[#71717a] text-xs tracking-wide">
                Disbursements Applied
              </span>
              <span className="inline-flex items-center gap-1 text-xs tabular-nums text-emerald-600 font-medium">
                <TrendingUp className="size-3" />
                <span>+8.2%</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-2xl tabular-nums text-[#09090b]">
                ₹{totalClaimedFunding.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-[#71717a]">
                {appliedList.length} filed cases under review
              </p>
            </div>
          </div>

          {/* StatCard 3: Verification & Vault Sufficiency */}
          <div className="bg-white p-6 flex flex-col justify-between gap-3">
            <div className="flex flex-row items-center justify-between">
              <span className="font-normal text-[#71717a] text-xs tracking-wide">
                Verification Sufficiency
              </span>
              <span className="inline-flex items-center gap-1 text-xs tabular-nums text-blue-600 font-medium">
                <ShieldCheck className="size-3" />
                <span>{isVaultActive ? 'Sealed' : 'Standby'}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-2xl tabular-nums text-[#09090b]">
                {sufficiency !== null ? `${sufficiency}%` : 'Unverified'}
              </p>
              <p className="text-xs text-[#71717a]">
                {dualDocResult?.verified_gpa ? `GPA: ${dualDocResult.verified_gpa}%` : 'Pending OCR marksheets'}
              </p>
            </div>
          </div>

          {/* Sales / Grants Area Chart (Spanning lg:col-span-3) */}
          <div className="bg-white p-6 lg:col-span-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-base text-[#09090b]">
                    Grant Pipeline & Trajectory
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingUp className="size-3" />
                    <span>+18.4%</span>
                  </span>
                </div>
                <p className="text-xs text-[#71717a]">
                  Daily statutory entitlement allocations by central & state aid pools, last {chartPeriod} days.
                </p>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1 bg-[#f4f4f5] p-1 rounded-lg border border-[#e4e4e7] text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartPeriod(7)}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                    chartPeriod === 7
                      ? 'bg-white text-[#09090b] shadow-xs'
                      : 'text-[#71717a] hover:text-[#09090b]'
                  }`}
                >
                  Last 7 days
                </button>
                <button
                  type="button"
                  onClick={() => setChartPeriod(30)}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                    chartPeriod === 30
                      ? 'bg-white text-[#09090b] shadow-xs'
                      : 'text-[#71717a] hover:text-[#09090b]'
                  }`}
                >
                  Last 30 days
                </button>
              </div>
            </div>

            {/* Custom SVG Area Chart (Efferd Exact Styling) */}
            <div className="relative w-full h-56 pt-4">
              <svg 
                className="w-full h-full overflow-visible" 
                viewBox="0 0 800 200" 
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="efferd-central-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="efferd-state-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[40, 90, 140, 190].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="800"
                    y2={y}
                    stroke="#e4e4e7"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                ))}

                {/* Area Paths */}
                {(() => {
                  const n = chartPoints.length;
                  const step = 800 / (n - 1 || 1);
                  const centralPoints = chartPoints.map((pt, i) => {
                    const x = i * step;
                    const y = 190 - (pt.central / maxChartVal) * 140;
                    return { x, y };
                  });
                  const statePoints = chartPoints.map((pt, i) => {
                    const x = i * step;
                    const y = 190 - (pt.state / maxChartVal) * 120;
                    return { x, y };
                  });

                  const centralD = centralPoints.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '') + ` L 800 190 L 0 190 Z`;
                  const stateD = statePoints.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '') + ` L 800 190 L 0 190 Z`;

                  const centralStroke = centralPoints.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                  const stateStroke = statePoints.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

                  return (
                    <>
                      <path d={centralD} fill="url(#efferd-central-grad)" />
                      <path d={centralStroke} fill="none" stroke="#2563eb" strokeWidth="1.5" />
                      <path d={stateD} fill="url(#efferd-state-grad)" />
                      <path d={stateStroke} fill="none" stroke="#10b981" strokeWidth="1.5" />

                      {/* Interactive Point Hover Dots */}
                      {centralPoints.map((p, idx) => (
                        <circle
                          key={`c-${idx}`}
                          cx={p.x}
                          cy={p.y}
                          r={activeChartIndex === idx ? 4 : 2}
                          fill="#2563eb"
                          onMouseEnter={() => setActiveChartIndex(idx)}
                          onMouseLeave={() => setActiveChartIndex(null)}
                          className="transition-all cursor-pointer"
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* X-Axis Labels */}
              <div className="flex justify-between text-[11px] text-[#71717a] font-mono pt-2">
                {chartPoints.filter((_, i) => i === 0 || i === Math.floor(chartPoints.length / 2) || i === chartPoints.length - 1).map((pt, i) => (
                  <span key={i}>{pt.date}</span>
                ))}
              </div>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-4 pt-4 border-t border-[#e4e4e7] text-xs">
              <div className="flex items-center gap-1.5 text-[#09090b]">
                <span className="size-2 rounded-full bg-[#2563eb]" />
                <span className="font-medium">Direct Central Grants</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#09090b]">
                <span className="size-2 rounded-full bg-[#10b981]" />
                <span className="font-medium">State Department Welfare</span>
              </div>
            </div>
          </div>

          {/* Recent Invoices / Applications Table (Spanning lg:col-span-3 pb-0) */}
          <div className="bg-white pb-0 lg:col-span-3">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-[#e4e4e7]">
              <div>
                <h3 className="font-semibold text-base text-[#09090b]">Recent Applications & Filings</h3>
                <p className="text-xs text-[#71717a] mt-0.5">
                  Open statutory tracking numbers, timestamps, and verifiable records.
                </p>
              </div>
              {appliedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('applications')}
                  className="text-xs text-[#71717a] hover:text-[#09090b] font-medium transition-colors cursor-pointer"
                >
                  View all ({appliedList.length})
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-xs text-left">
                <thead>
                  <tr className="border-b border-[#e4e4e7] text-[#71717a] text-[11px]">
                    <th className="h-10 px-6 font-medium">Scheme & Authority</th>
                    <th className="h-10 px-4 font-medium">Tracking ID</th>
                    <th className="h-10 px-4 text-right font-medium tabular-nums">Grant Amount</th>
                    <th className="h-10 pr-6 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e4e7]">
                  {appliedList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="h-24 text-center text-[#71717a] text-xs">
                        No applications filed yet. Select an eligible scheme below to launch automated intake.
                      </td>
                    </tr>
                  ) : (
                    appliedList.slice(0, 5).map((app) => (
                      <tr 
                        key={app.id || app.trackingNumber} 
                        onClick={() => {
                          if (app.receipt) onOpenReceipt(app.receipt);
                          else onNavigate('applications');
                        }}
                        className="h-14 hover:bg-[#f4f4f5]/60 transition-colors cursor-pointer"
                      >
                        <td className="max-w-64 truncate pl-6 font-medium text-[#09090b]">
                          <div>{app.schemeName}</div>
                          <div className="text-[11px] text-[#71717a] font-normal">{app.ministry}</div>
                        </td>
                        <td className="text-[#71717a] tabular-nums font-mono px-4">
                          #{app.trackingNumber}
                        </td>
                        <td className="text-right tabular-nums px-4 font-medium text-[#09090b]">
                          ₹{app.grantAmount.toLocaleString('en-IN')}/yr
                        </td>
                        <td className="pr-6 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span>Submitted</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Schemes Grid Section (Efferd Modular Grid) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-semibold text-base text-[#09090b]">
              Available Statutory Schemes ({eligibleSchemes.length} Matched)
            </h2>
            <p className="text-xs text-[#71717a]">
              Direct government scholarships evaluated against your verified academic GPA and income ceiling.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('scholarships')}
            className="text-xs font-medium text-[#71717a] hover:text-[#09090b] transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Browse Catalog</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        <div className="rounded-lg overflow-hidden border border-[#e4e4e7]">
          <div className="grid grid-cols-1 gap-px bg-[#e4e4e7] md:grid-cols-2 lg:grid-cols-3">
            {schemes.slice(0, 3).map((match) => {
              const { scheme, is_eligible, eligibility_score } = match;
              return (
                <div key={scheme.id} className="bg-white p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#71717a] truncate font-mono">
                        {scheme.ministry || 'State Authority'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                        is_eligible
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {(eligibility_score * 100).toFixed(0)}% Match
                      </span>
                    </div>

                    <h3 className="font-medium text-sm text-[#09090b] line-clamp-2 leading-snug">
                      {scheme.name}
                    </h3>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-[#e4e4e7]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#71717a]">Annual Grant:</span>
                      <span className="font-semibold text-sm tabular-nums text-[#09090b]">
                        ₹{scheme.grant_amount_annual.toLocaleString('en-IN')}/yr
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectSchemeAndExecute(match)}
                      disabled={isExecuting || !is_eligible}
                      className="w-full h-8 px-3 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:bg-[#f4f4f5] disabled:text-[#a1a1aa] disabled:border disabled:border-[#e4e4e7] disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>
                        {isExecuting
                          ? 'Session Active'
                          : scheme.login_mode === 'credentials'
                          ? 'Login & Apply'
                          : 'Auto-Apply with CivicAgent'}
                      </span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

OverviewView.displayName = 'OverviewView';
