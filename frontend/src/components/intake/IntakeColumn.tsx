import React, { useState, useRef } from 'react';
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
  Globe,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import type { CitizenProfile, SchemeMatchResult, DualDocumentExtractionResult } from '../../types';
import { SAMPLE_PRESETS } from '../../lib/presets';
import type { SamplePreset } from '../../lib/presets';

interface IntakeColumnProps {
  profile: CitizenProfile;
  dualDocResult: DualDocumentExtractionResult | null;
  onParseDocuments: (
    transcript: string,
    income: string,
    transcriptName?: string,
    incomeName?: string
  ) => Promise<void>;
  schemes: SchemeMatchResult[];
  onSelectSchemeAndExecute: (scheme: SchemeMatchResult) => void;
  isExecuting: boolean;
  onOpenAddModal: () => void;
  onDeleteCustomScheme: (id: string) => void;
  onOpenEditProfile: () => void;
  appliedCount?: number;
  onOpenAppliedModal?: () => void;
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
  onOpenEditProfile,
  appliedCount = 0,
  onOpenAppliedModal,
}) => {
  const [showTestPersonas, setShowTestPersonas] = useState<boolean>(false);
  const [showProfileDetails, setShowProfileDetails] = useState<boolean>(true);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  
  const [uploadedTranscriptName, setUploadedTranscriptName] = useState<string | null>(null);
  const [uploadedIncomeName, setUploadedIncomeName] = useState<string | null>(null);

  const transcriptInputRef = useRef<HTMLInputElement | null>(null);
  const incomeInputRef = useRef<HTMLInputElement | null>(null);

  const readFileAsPayload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      if (file.type === 'text/plain') {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file);
      } else {
        // Read as DataURL and extract pure Base64
        reader.onload = () => {
          const result = reader.result as string;
          const commaIndex = result.indexOf(',');
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.readAsDataURL(file);
      }
      reader.onerror = (err) => reject(err);
    });
  };

  const handleTranscriptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedTranscriptName(file.name);
    setIsParsing(true);
    try {
      const transcriptPayload = await readFileAsPayload(file);
      await onParseDocuments(
        transcriptPayload,
        dualDocResult?.income_certificate.raw_text || '',
        file.name,
        uploadedIncomeName || 'income_certificate.pdf'
      );
    } catch (err) {
      console.error('Failed to read transcript file', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleIncomeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedIncomeName(file.name);
    setIsParsing(true);
    try {
      const incomePayload = await readFileAsPayload(file);
      await onParseDocuments(
        dualDocResult?.transcript.raw_text || '',
        incomePayload,
        uploadedTranscriptName || 'transcript.pdf',
        file.name
      );
    } catch (err) {
      console.error('Failed to read income file', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePresetSelect = async (preset: SamplePreset) => {
    setIsParsing(true);
    setUploadedTranscriptName(`${preset.name}_Transcript.txt`);
    setUploadedIncomeName(`${preset.name}_IncomeCert.txt`);
    await onParseDocuments(preset.transcriptText, preset.incomeCertText);
    setIsParsing(false);
  };

  const sufficiency = dualDocResult ? dualDocResult.sufficiency_score * 100 : 95;

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden font-sans">
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
            1
          </div>
          <h2 className="font-semibold text-sm text-slate-100">Upload-Driven Intake & Schemes</h2>
        </div>
        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Zero Dummy Data</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Hidden native file inputs */}
        <input
          ref={transcriptInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          className="hidden"
          onChange={handleTranscriptFileChange}
        />
        <input
          ref={incomeInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          className="hidden"
          onChange={handleIncomeFileChange}
        />

        {/* Multimodal Document Upload Cards */}
        <div className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Official Documents</span>
              {isParsing && (
                <span className="text-[10px] text-indigo-400 animate-pulse font-normal">
                  (Parsing with Gemini & PyPDF...)
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <a
                href="/samples/Official_Transcript_Eleanor_Vance.pdf"
                download="Official_Transcript_Eleanor_Vance.pdf"
                className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                title="Download sample student marksheet PDF to test live upload"
              >
                Sample Marksheet
              </a>
              <span className="text-slate-600">•</span>
              <a
                href="/samples/Statutory_Income_Certificate_Eleanor_Vance.pdf"
                download="Statutory_Income_Certificate_Eleanor_Vance.pdf"
                className="text-emerald-400 hover:text-emerald-300 underline font-medium"
                title="Download sample income certificate PDF to test live upload"
              >
                Sample Income Cert
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Academic Transcript Card */}
            <div
              onClick={() => transcriptInputRef.current?.click()}
              className="p-3 rounded-lg border border-dashed border-slate-600 hover:border-blue-500 bg-slate-900/50 hover:bg-slate-900/80 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <FileText className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-xs font-medium text-slate-200">
                {uploadedTranscriptName ? (
                  <span className="text-blue-300 font-semibold truncate max-w-[140px] block">
                    {uploadedTranscriptName}
                  </span>
                ) : (
                  'Upload Transcript'
                )}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {profile.attributes.gpa || profile.attributes.percentage
                  ? `Score: ${profile.attributes.gpa || profile.attributes.percentage}% • Parsed`
                  : 'Click or drop PDF to extract'}
              </span>
            </div>

            {/* Income Certificate Card */}
            <div
              onClick={() => incomeInputRef.current?.click()}
              className="p-3 rounded-lg border border-dashed border-slate-600 hover:border-emerald-500 bg-slate-900/50 hover:bg-slate-900/80 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <ShieldCheck className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-xs font-medium text-slate-200">
                {uploadedIncomeName ? (
                  <span className="text-emerald-300 font-semibold truncate max-w-[140px] block">
                    {uploadedIncomeName}
                  </span>
                ) : (
                  'Upload Income Proof'
                )}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {profile.income_annual
                  ? `₹${profile.income_annual.toLocaleString()} • Verified`
                  : 'Click or drop PDF to verify'}
              </span>
            </div>
          </div>

          {/* Sufficiency Score Gauge */}
          <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-700/40">
            <span className="text-slate-400">Pre-flight Sufficiency Score:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    sufficiency >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${sufficiency}%` }}
                />
              </div>
              <span className="font-bold text-emerald-400 text-xs">{sufficiency.toFixed(0)}%</span>
            </div>
          </div>

          {/* Warning notifications if fields missing */}
          {dualDocResult?.warnings && dualDocResult.warnings.length > 0 && (
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1">
              <div className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Verification Advisory:</span>
              </div>
              {dualDocResult.warnings.map((w, idx) => (
                <p key={idx} className="text-[10px] text-amber-200/90 pl-4 list-disc">• {w}</p>
              ))}
            </div>
          )}
        </div>

        {/* Live Citizen Profile Card & Direct Editor */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-800/40">
          <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-800/70 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white truncate max-w-[150px]">
                {profile.full_name || 'Active Citizen'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                {profile.category || 'GENERAL'}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/60 border border-blue-500/40 text-blue-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                title="Edit Citizen Profile fields directly"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProfileDetails(!showProfileDetails)}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              >
                {showProfileDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showProfileDetails && (
            <div className="p-3 text-[11px] space-y-1.5 bg-slate-900/50">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">National ID / Aadhaar:</span>
                <span className="font-mono text-slate-200 font-semibold">{profile.national_id || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Registered Email:</span>
                <span className="text-slate-200 truncate max-w-[170px]">{profile.email || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Domicile State:</span>
                <span className="text-slate-200 font-medium">{profile.address_state || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Annual Income:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  ₹{(profile.income_annual || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Academic Score:</span>
                <span className="text-cyan-300 font-medium">
                  {profile.attributes.gpa ? `GPA ${profile.attributes.gpa}` : ''} 
                  {profile.attributes.percentage ? ` (${profile.attributes.percentage}%)` : ''}
                  {!profile.attributes.gpa && !profile.attributes.percentage ? 'Not set' : ''}
                </span>
              </div>
              {profile.attributes.institution && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Institution:</span>
                  <span className="text-slate-300 truncate max-w-[170px]">{profile.attributes.institution}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Optional Testing Persona Sandbox Toggle */}
        <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-950/40">
          <button
            type="button"
            onClick={() => setShowTestPersonas(!showTestPersonas)}
            className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Need test data? Load Benchmark Persona</span>
            </div>
            {showTestPersonas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTestPersonas && (
            <div className="p-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 bg-slate-900/30">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  disabled={isExecuting}
                  className="p-2 rounded-lg border border-slate-800 hover:border-indigo-500/60 bg-slate-900/60 hover:bg-slate-800 text-left transition-all cursor-pointer text-[11px]"
                >
                  <div className="font-semibold text-white truncate">{preset.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{preset.category}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Statutory Scheme Matcher Results */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Available Schemes ({schemes.length})</span>
              </span>
              {appliedCount > 0 && onOpenAppliedModal && (
                <button
                  type="button"
                  onClick={onOpenAppliedModal}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                  title="View your submitted scholarship applications"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{appliedCount} Applied</span>
                </button>
              )}
            </div>
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
              const { scheme, is_eligible, eligibility_score, missing_criteria } = match;
              return (
                <div
                  key={scheme.id}
                  className={`p-3 rounded-lg border transition-all space-y-2 ${
                    scheme.is_custom
                      ? 'border-cyan-500/40 bg-cyan-950/20 shadow-sm shadow-cyan-500/5'
                      : is_eligible
                      ? 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                      : 'border-slate-800/60 bg-slate-900/30 opacity-75'
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
                    <span className={`px-1.5 py-0.5 rounded border font-mono ${
                      is_eligible 
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                    }`}>
                      {(eligibility_score * 100).toFixed(0)}% Match
                    </span>
                  </div>

                  {/* Missing criteria notice if ineligible */}
                  {!is_eligible && missing_criteria && missing_criteria.length > 0 && (
                    <div className="text-[10px] text-rose-400/90 bg-rose-500/5 p-1.5 rounded border border-rose-500/10">
                      {missing_criteria[0]}
                    </div>
                  )}

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
