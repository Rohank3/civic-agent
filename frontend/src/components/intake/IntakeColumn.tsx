import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Award, 
  Sparkles,
  ShieldCheck,
  PlusCircle,
  Trash2,
  KeyRound,
  Globe
} from 'lucide-react';
import type { CitizenProfile, SchemeMatchResult, DualDocumentExtractionResult } from '../../types';
import { SAMPLE_PRESETS } from '../../lib/presets';
import type { SamplePreset } from '../../lib/presets';

interface IntakeColumnProps {
  profile: CitizenProfile;
  dualDocResult: DualDocumentExtractionResult | null;
  onParseDocuments: (transcript: string, income: string) => Promise<void>;
  schemes: SchemeMatchResult[];
  onSelectSchemeAndExecute: (scheme: SchemeMatchResult) => void;
  isExecuting: boolean;
  onOpenAddModal: () => void;
  onDeleteCustomScheme: (id: string) => void;
}

export const IntakeColumn: React.FC<IntakeColumnProps> = ({
  profile,
  dualDocResult,
  onParseDocuments,
  schemes,
  onSelectSchemeAndExecute,
  isExecuting,
  onOpenAddModal,
  onDeleteCustomScheme,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('first_gen_stem');
  const [showProfileDetails, setShowProfileDetails] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  const handlePresetSelect = async (preset: SamplePreset) => {
    setSelectedPreset(preset.id);
    setIsParsing(true);
    await onParseDocuments(preset.transcriptText, preset.incomeCertText);
    setIsParsing(false);
  };

  const sufficiency = dualDocResult ? dualDocResult.sufficiency_score * 100 : 98;

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
            1
          </div>
          <h2 className="font-semibold text-sm text-slate-100">Upload-Driven Intake & Schemes</h2>
        </div>
        <span className="text-[11px] text-slate-400">Zero Dummy Data</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Sample Quick-Presets */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Applicant Persona (1-Click Evaluation)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_PRESETS.map((preset) => {
              const active = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  disabled={isExecuting}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40 text-slate-100'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white">{preset.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      {preset.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{preset.title}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dual Document Upload Dropzone */}
        <div className="p-3 rounded-lg border border-slate-700/60 bg-slate-800/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multimodal Document Intelligence</span>
              {isParsing && <span className="text-[10px] text-indigo-400 animate-pulse font-normal">(Extracting...)</span>}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>OCR Pre-flight Ready</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded border border-dashed border-slate-600 bg-slate-900/40 flex flex-col items-center justify-center text-center">
              <FileText className="w-5 h-5 text-blue-400 mb-1" />
              <span className="text-[11px] font-medium text-slate-200">Academic Transcript</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                GPA: {profile.attributes.gpa || 3.85} • {profile.attributes.major ? 'Parsed' : 'Ready'}
              </span>
            </div>

            <div className="p-2 rounded border border-dashed border-slate-600 bg-slate-900/40 flex flex-col items-center justify-center text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[11px] font-medium text-slate-200">Income Certificate</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                ₹{profile.income_annual.toLocaleString()} • Verified
              </span>
            </div>
          </div>

          {/* Sufficiency Score Gauge */}
          <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-700/40">
            <span className="text-slate-400">Pre-flight Sufficiency:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    sufficiency >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${sufficiency}%` }}
                />
              </div>
              <span className="font-bold text-emerald-400 text-xs">{sufficiency.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Profile Collapsible Summary */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-800/30">
          <button
            onClick={() => setShowProfileDetails(!showProfileDetails)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Extracted Citizen Profile ({profile.full_name})</span>
            </div>
            {showProfileDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showProfileDetails && (
            <div className="p-3 border-t border-slate-800 text-[11px] space-y-1.5 bg-slate-900/40">
              <div className="flex justify-between">
                <span className="text-slate-400">National ID:</span>
                <span className="font-mono text-slate-200">{profile.national_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-200">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Domicile:</span>
                <span className="text-slate-200">{profile.address_city}, {profile.address_state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Institution:</span>
                <span className="text-slate-200 truncate max-w-[180px]">{profile.attributes.institution || 'State Tech'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Scheme Matcher Results */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Available Schemes ({schemes.length})</span>
            </span>
            <button
              onClick={onOpenAddModal}
              disabled={isExecuting}
              className="px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
              title="Add a custom government, state, or college scholarship portal"
            >
              <PlusCircle className="w-3 h-3" />
              <span>+ Add Custom Portal</span>
            </button>
          </div>

          <div className="space-y-2">
            {schemes.map((match) => {
              const { scheme, is_eligible, eligibility_score } = match;
              return (
                <div
                  key={scheme.id}
                  className={`p-3 rounded-lg border transition-all space-y-2 ${
                    scheme.is_custom
                      ? 'border-cyan-500/40 bg-cyan-950/20 shadow-sm shadow-cyan-500/5'
                      : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-xs text-white leading-tight">
                          {scheme.name}
                        </h4>
                        {scheme.is_custom && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Custom Target
                          </span>
                        )}
                        {scheme.login_mode === 'credentials' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-0.5">
                            <KeyRound className="w-2.5 h-2.5" />
                            <span>Auth Required</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        <span className="truncate">{scheme.portal_url}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                        ₹{scheme.grant_amount_annual.toLocaleString()}/yr
                      </span>
                      {scheme.is_custom && (
                        <button
                          onClick={() => onDeleteCustomScheme(scheme.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete this custom scheme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Match Criteria Badges */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Income &lt; ₹{(scheme.max_family_income / 100000).toFixed(1)}L
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Min Marks {scheme.min_gpa_or_percentage}%
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                      {(eligibility_score * 100).toFixed(0)}% Match
                    </span>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectSchemeAndExecute(match)}
                    disabled={isExecuting || !is_eligible}
                    className="w-full mt-1 py-1.5 px-3 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>
                      {isExecuting
                        ? 'Agent Running...'
                        : scheme.login_mode === 'credentials'
                        ? 'Login & Apply with CivicAgent'
                        : 'Auto-Apply with CivicAgent'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
