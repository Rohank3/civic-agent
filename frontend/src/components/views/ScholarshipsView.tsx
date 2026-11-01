import React, { useState, useMemo } from 'react';
import { 
  Search, 
  PlusCircle, 
  RefreshCw, 
  Globe, 
  Trash2, 
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import type { SchemeMatchResult } from '../../types';

interface ScholarshipsViewProps {
  schemes: SchemeMatchResult[];
  onSelectSchemeAndExecute: (scheme: SchemeMatchResult) => void;
  onOpenAddModal: () => void;
  onDeleteCustomScheme: (id: string) => void;
  onApplyAllEligible?: () => void;
  onSyncLiveData?: () => void;
  isSyncing?: boolean;
  isExecuting: boolean;
  appliedCount?: number;
  onNavigate?: (view: 'overview' | 'scholarships' | 'documents' | 'applications' | 'profile' | 'workspace') => void;
}

const getSchemeState = (scheme: any): string | undefined => {
  if (scheme.state) return scheme.state;
  if (typeof scheme.ministry === 'string') {
    if (scheme.ministry.includes('Karnataka')) return 'Karnataka';
    if (scheme.ministry.includes('Delhi')) return 'Delhi';
    if (scheme.ministry.includes('Maharashtra')) return 'Maharashtra';
  }
  return undefined;
};

export const ScholarshipsView: React.FC<ScholarshipsViewProps> = React.memo(({
  schemes,
  onSelectSchemeAndExecute,
  onOpenAddModal,
  onDeleteCustomScheme,
  onApplyAllEligible,
  onSyncLiveData,
  isSyncing = false,
  isExecuting,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // Extract unique states for dropdown
  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    schemes.forEach((s) => {
      const st = getSchemeState(s.scheme);
      if (st) states.add(st);
    });
    return Array.from(states).sort();
  }, [schemes]);

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        m.scheme.name.toLowerCase().includes(q) ||
        (m.scheme.ministry && m.scheme.ministry.toLowerCase().includes(q)) ||
        m.scheme.portal_url.toLowerCase().includes(q);

      const mState = getSchemeState(m.scheme);
      const matchesState = stateFilter === 'ALL' || 
        mState === stateFilter || 
        (!mState && stateFilter === 'CENTRAL');

      const matchesEligible = !eligibleOnly || m.is_eligible;

      return matchesSearch && matchesState && matchesEligible;
    });
  }, [schemes, searchQuery, stateFilter, eligibleOnly]);

  const eligibleCount = schemes.filter((m) => m.is_eligible).length;
  const totalEligibleGrant = schemes
    .filter((m) => m.is_eligible)
    .reduce((acc, curr) => acc + curr.scheme.grant_amount_annual, 0);

  return (
    <div className="flex flex-1 flex-col gap-6 font-sans">
      {/* Page Header (Efferd Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-semibold text-xl leading-tight text-[#09090b]">
              Scholarship Catalog & Registry
            </h1>
            <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-medium bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]">
              {schemes.length} Schemes
            </span>
          </div>
          <p className="text-sm text-[#71717a]">
            Browse, filter, and autonomously apply to national and state statutory scholarship schemes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSyncLiveData && (
            <button
              type="button"
              onClick={onSyncLiveData}
              disabled={isSyncing}
              className="h-8 px-3 rounded-md bg-white hover:bg-[#f4f4f5] border border-[#e4e4e7] text-xs font-medium text-[#09090b] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Synchronize schemes with Data.gov.in"
            >
              <RefreshCw className={`size-3.5 text-[#71717a] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Data.gov.in'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="h-8 px-3 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="size-3.5" />
            <span>Add Custom Scheme</span>
          </button>
        </div>
      </div>

      {/* Batch Autonomous Execution Banner */}
      {eligibleCount > 0 && onApplyAllEligible && (
        <div className="p-4 rounded-lg bg-white border border-[#e4e4e7] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] text-[#09090b] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="size-4 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm text-[#09090b]">
                  Batch Autonomous Execution Available
                </h3>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ₹{totalEligibleGrant.toLocaleString('en-IN')}/yr Total Benefit
                </span>
              </div>
              <p className="text-xs text-[#71717a] mt-0.5 leading-relaxed">
                Your verified profile meets all criteria for <strong>{eligibleCount} statutory schemes</strong>. You can execute all applications in a single automated batch.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onApplyAllEligible}
            disabled={isExecuting}
            className="h-8 px-3.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <span>Apply to All {eligibleCount} Eligible</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar (Efferd Inputs) */}
      <div className="p-3 rounded-lg bg-white border border-[#e4e4e7] flex flex-col sm:flex-row items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="size-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by scholarship title, department, or portal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-[#f4f4f5]/60 border border-[#e4e4e7] rounded-md pl-8 pr-3 text-xs text-[#09090b] placeholder-[#71717a] focus:outline-none focus:border-[#18181b] transition-colors"
          />
        </div>

        {/* Jurisdiction / State Filter */}
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filter schemes by jurisdiction"
          className="h-8 bg-[#f4f4f5]/60 border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] focus:outline-none focus:border-[#18181b] cursor-pointer w-full sm:w-auto font-medium"
        >
          <option value="ALL">All Jurisdictions</option>
          <option value="CENTRAL">Central Ministry Schemes</option>
          {uniqueStates.map((st) => (
            <option key={st} value={st}>
              {st} State Schemes
            </option>
          ))}
        </select>

        {/* Eligible Only Filter Toggle */}
        <button
          type="button"
          onClick={() => setEligibleOnly(!eligibleOnly)}
          className={`h-8 px-3 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto shrink-0 ${
            eligibleOnly
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-[#e4e4e7] text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]'
          }`}
        >
          <span>Eligible Only ({eligibleCount})</span>
        </button>
      </div>

      {/* Scheme Listing Grid (Efferd Bordered Table/Card Stack) */}
      <div className="rounded-lg overflow-hidden border border-[#e4e4e7] bg-white divide-y divide-[#e4e4e7]">
        {filteredSchemes.length === 0 ? (
          <div className="py-16 text-center p-6 space-y-2">
            <div className="size-10 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center text-[#71717a] mx-auto">
              <Layers className="size-5" />
            </div>
            <h3 className="font-semibold text-sm text-[#09090b]">No Matching Schemes Found</h3>
            <p className="text-xs text-[#71717a] max-w-sm mx-auto">
              Try adjusting your search keywords, clearing jurisdiction filters, or adding a custom scheme.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStateFilter('ALL');
                setEligibleOnly(false);
              }}
              className="h-8 px-3 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#09090b] text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1 mt-2"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          filteredSchemes.map((match) => {
            const { scheme, is_eligible, eligibility_score, missing_criteria } = match;
            const schemeState = getSchemeState(scheme);

            return (
              <div
                key={scheme.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f4f4f5]/40 transition-colors"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-mono text-[11px] text-[#71717a] px-2 py-0.5 rounded-md bg-[#f4f4f5] border border-[#e4e4e7]">
                      {schemeState ? `${schemeState} State` : 'Central Scheme'}
                    </span>
                    {scheme.ministry && (
                      <span className="text-[11px] text-[#71717a] truncate max-w-sm">
                        {scheme.ministry}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                      is_eligible
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {(eligibility_score * 100).toFixed(0)}% Match
                    </span>
                    {scheme.is_custom && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                        Custom Added
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm text-[#09090b] leading-snug">
                    {scheme.name}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-[#71717a] flex-wrap">
                    <a
                      href={scheme.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#09090b] flex items-center gap-1 font-mono transition-colors"
                    >
                      <Globe className="size-3 text-[#71717a]" />
                      <span className="truncate max-w-xs">{scheme.portal_url}</span>
                      <ExternalLink className="size-3" />
                    </a>
                    <span>•</span>
                    <span>Max Income: ₹{(scheme.max_family_income || 250000).toLocaleString('en-IN')}</span>
                    <span>•</span>
                    <span>Min Marks: {scheme.min_gpa_or_percentage || 50}%</span>
                  </div>

                  {!is_eligible && missing_criteria && missing_criteria.length > 0 && (
                    <div className="text-xs text-rose-600 bg-rose-50/60 p-2 rounded-md border border-rose-200/60">
                      Shortfall: {missing_criteria[0]}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-end md:items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-semibold text-base tabular-nums text-[#09090b]">
                      ₹{scheme.grant_amount_annual.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-[#71717a]">Annual Benefit</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {scheme.is_custom && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomScheme(scheme.id)}
                        className="p-2 rounded-md text-[#71717a] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete custom scheme"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectSchemeAndExecute(match)}
                      disabled={isExecuting || !is_eligible}
                      className="h-8 px-3.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:bg-[#f4f4f5] disabled:text-[#a1a1aa] disabled:border disabled:border-[#e4e4e7] disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>
                        {isExecuting
                          ? 'In Progress'
                          : scheme.login_mode === 'credentials'
                          ? 'Login & Apply'
                          : 'Auto-Apply'}
                      </span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

ScholarshipsView.displayName = 'ScholarshipsView';
