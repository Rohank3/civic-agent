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
  AlertTriangle, 
  ShieldAlert, 
  ExternalLink, 
  RefreshCw, 
  Layers 
} from 'lucide-react';
import type { CitizenProfile, SchemeMatchResult, DualDocumentExtractionResult } from '../../types';
import { SAMPLE_PRESETS } from '../../lib/presets';
import type { SamplePreset } from '../../lib/presets';
import { fetchSampleDocuments } from '../../lib/api';

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
  onVerifyDigiLocker?: () => void;
  onApplyAllEligible?: () => void;
  onSyncLiveData?: () => void;
  isSyncing?: boolean;
  isVaultActive?: boolean;
  vaultDocumentNames?: { transcript?: string; income?: string };
  onClearVault?: () => void;
}

export const IntakeColumn: React.FC<IntakeColumnProps> = React.memo(({
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
  onVerifyDigiLocker,
  onApplyAllEligible,
  onSyncLiveData,
  isSyncing = false,
  isVaultActive = false,
  vaultDocumentNames,
  onClearVault,
}) => {
  const [showTestPersonas, setShowTestPersonas] = useState<boolean>(false);
  const [showProfileDetails, setShowProfileDetails] = useState<boolean>(true);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  
  const [manualTranscriptName, setManualTranscriptName] = useState<string | null>(null);
  const [manualIncomeName, setManualIncomeName] = useState<string | null>(null);

  const uploadedTranscriptName = manualTranscriptName || vaultDocumentNames?.transcript || null;
  const uploadedIncomeName = manualIncomeName || vaultDocumentNames?.income || null;

  const setUploadedTranscriptName = (name: string | null) => setManualTranscriptName(name);
  const setUploadedIncomeName = (name: string | null) => setManualIncomeName(name);

  const transcriptInputRef = useRef<HTMLInputElement | null>(null);
  const incomeInputRef = useRef<HTMLInputElement | null>(null);

  const readFileAsPayload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      if (file.type === 'text/plain') {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file);
      } else {
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
    try {
      const samplePayload = await fetchSampleDocuments(preset.id);
      if (samplePayload) {
        setUploadedTranscriptName(samplePayload.transcript_file_name);
        setUploadedIncomeName(samplePayload.income_file_name);
        await onParseDocuments(
          samplePayload.transcript_content,
          samplePayload.income_content,
          samplePayload.transcript_file_name,
          samplePayload.income_file_name
        );
      } else {
        const isAarav = preset.id.includes('stem') || preset.name.includes('Aarav');
        const transcriptPath = isAarav
          ? '/samples/Academic_Marksheet_Aarav_Sharma.pdf'
          : '/samples/Official_Transcript_Eleanor_Vance.pdf';
        const incomePath = isAarav
          ? '/samples/Income_Certificate_Aarav_Sharma.pdf'
          : '/samples/Statutory_Income_Certificate_Eleanor_Vance.pdf';

        const transcriptName = isAarav ? 'Academic_Marksheet_Aarav_Sharma.pdf' : 'Official_Transcript_Eleanor_Vance.pdf';
        const incomeName = isAarav ? 'Income_Certificate_Aarav_Sharma.pdf' : 'Statutory_Income_Certificate_Eleanor_Vance.pdf';

        setUploadedTranscriptName(transcriptName);
        setUploadedIncomeName(incomeName);

        const [tRes, iRes] = await Promise.all([fetch(transcriptPath), fetch(incomePath)]);
        if (tRes.ok && iRes.ok) {
          const [tBlob, iBlob] = await Promise.all([tRes.blob(), iRes.blob()]);
          const [tBase64, iBase64] = await Promise.all([
            readFileAsPayload(new File([tBlob], transcriptName, { type: 'application/pdf' })),
            readFileAsPayload(new File([iBlob], incomeName, { type: 'application/pdf' }))
          ]);
          await onParseDocuments(tBase64, iBase64, transcriptName, incomeName);
        } else {
          console.warn('Sample PDF files not available at static path');
        }
      }
    } catch (err) {
      console.error('Failed to load sample document', err);
    } finally {
      setIsParsing(false);
    }
  };

  const sufficiency = dualDocResult ? Math.round(dualDocResult.sufficiency_score * 100) : null;

  return (
    <div className="flex flex-col h-full bg-[#141C27] rounded-xl border border-[#263244] overflow-hidden shadow-xs font-sans">
      {/* Column Header */}
      <div className="px-4 py-3 border-b border-[#263244] bg-[#101720] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            1
          </span>
          <h2 className="font-semibold text-sm text-[#F1F5F9]">Intake & Matching</h2>
        </div>
        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified Registry</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {/* Zero-Knowledge Vault Active Banner */}
        {isVaultActive && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-emerald-300">
                    Encrypted Document Vault Active
                  </span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-medium">
                    AES-256-GCM
                  </span>
                </div>
                <span className="text-xs text-emerald-400/90 block">
                  Documents persist in encrypted local vault • Reusable across applications
                </span>
              </div>
            </div>
            {onClearVault && (
              <button
                type="button"
                onClick={onClearVault}
                className="px-2 py-1 text-xs rounded bg-[#141C27] hover:bg-[#192333] border border-emerald-500/30 text-emerald-300 transition-colors cursor-pointer font-medium"
                title="Wipe cached documents from local encrypted vault"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Document Upload Section */}
        <div className="p-4 rounded-xl border border-[#263244] bg-[#101720]/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-semibold text-[#F1F5F9] flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Supporting Documents</span>
              </span>
              <p className="text-xs text-[#94A3B8] mt-0.5">Upload official records for criteria extraction</p>
            </div>
            {isParsing && (
              <span className="text-xs text-blue-400 animate-pulse font-medium bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Parsing documents...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Academic Marksheet Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => transcriptInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  transcriptInputRef.current?.click();
                }
              }}
              className="p-3 rounded-lg border border-dashed border-[#263244] hover:border-blue-500/50 bg-[#141C27] hover:bg-[#192333] flex flex-col items-center justify-center text-center cursor-pointer transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <FileText className="w-5 h-5 text-blue-400 mb-1.5" />
              <span className="text-xs font-medium text-[#F1F5F9]">
                {uploadedTranscriptName ? (
                  <span className="text-blue-400 font-semibold truncate max-w-[140px] block">
                    {uploadedTranscriptName}
                  </span>
                ) : (
                  'Academic Marksheet'
                )}
              </span>
              <span className="text-xs text-[#94A3B8] mt-0.5">
                {profile.attributes.gpa || profile.attributes.percentage
                  ? `Score: ${profile.attributes.gpa || profile.attributes.percentage}% • Extracted`
                  : 'Click or drop PDF / image'}
              </span>
            </div>

            {/* Income Certificate Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => incomeInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  incomeInputRef.current?.click();
                }
              }}
              className="p-3 rounded-lg border border-dashed border-[#263244] hover:border-emerald-500/50 bg-[#141C27] hover:bg-[#192333] flex flex-col items-center justify-center text-center cursor-pointer transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1.5" />
              <span className="text-xs font-medium text-[#F1F5F9]">
                {uploadedIncomeName ? (
                  <span className="text-emerald-400 font-semibold truncate max-w-[140px] block">
                    {uploadedIncomeName}
                  </span>
                ) : (
                  'Income Certificate'
                )}
              </span>
              <span className="text-xs text-[#94A3B8] mt-0.5">
                {profile.income_annual
                  ? `₹${profile.income_annual.toLocaleString()} • Verified`
                  : 'Click or drop PDF / image'}
              </span>
            </div>
          </div>

          {/* Quick Benchmark Extraction Button */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#141C27] border border-[#263244] text-xs flex-wrap">
            <span className="text-slate-400 font-medium">Test Document Preset:</span>
            <button
              type="button"
              onClick={async () => {
                if (SAMPLE_PRESETS.length > 0) {
                  await handlePresetSelect(SAMPLE_PRESETS[0]);
                }
              }}
              disabled={isExecuting || isParsing}
              className="px-2.5 py-1 rounded bg-[#192333] hover:bg-[#202c40] border border-[#263244] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Load benchmark documents for instant testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Load Benchmark (Aarav Sharma)</span>
            </button>
          </div>

          {/* Sufficiency Score Gauge */}
          <div className="pt-2 flex items-center justify-between text-xs border-t border-[#263244]">
            <span className="text-slate-400 font-medium">Pre-flight Eligibility Score:</span>
            {sufficiency !== null ? (
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-[#192333] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      sufficiency >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${sufficiency}%` }}
                  />
                </div>
                <span className="font-bold text-[#F1F5F9] text-xs">{sufficiency}%</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">Upload documents to verify criteria</span>
            )}
          </div>

          {/* Verification Advisory Warnings */}
          {dualDocResult?.warnings && dualDocResult.warnings.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Verification Advisory:</span>
              </div>
              {dualDocResult.warnings.map((w, idx) => (
                <p key={idx} className="text-xs text-amber-400/90 pl-4">• {w}</p>
              ))}
            </div>
          )}

          {/* Forensic Integrity & Verification Status */}
          {dualDocResult?.integrity_report && (
            <div
              className={`p-3 rounded-lg border text-xs space-y-2 transition-all ${
                dualDocResult.integrity_report.quarantine_active
                  ? 'bg-red-500/10 border-red-500/25 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold">
                  {dualDocResult.integrity_report.quarantine_active ? (
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>
                    {dualDocResult.integrity_report.quarantine_active
                      ? 'Integrity Flag: Additional Verification Needed'
                      : 'Statutory Integrity Verified'}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    dualDocResult.integrity_report.quarantine_active
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {dualDocResult.integrity_report.quarantine_active ? 'Manual Review' : 'Verified PAdES'}
                </span>
              </div>

              {dualDocResult.integrity_report.quarantine_active && onVerifyDigiLocker && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onVerifyDigiLocker}
                    className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Verify via DigiLocker / MeriPehchaan</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Citizen Profile Card */}
        <div className="border border-[#263244] rounded-xl overflow-hidden bg-[#141C27] shadow-xs">
          <div className="px-4 py-2.5 flex items-center justify-between bg-[#101720] border-b border-[#263244]">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-[#F1F5F9] truncate max-w-[150px]">
                {profile.full_name || 'Active Citizen'}
              </span>
              <span className="text-xs px-2 py-0.2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                {profile.category || 'GENERAL'}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="px-2.5 py-1 rounded-md bg-[#192333] hover:bg-[#202c40] border border-[#263244] text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="Edit Citizen Profile details"
              >
                <Edit2 className="w-3 h-3 text-slate-400" />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProfileDetails(!showProfileDetails)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showProfileDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showProfileDetails && (
            <div className="p-3.5 text-xs space-y-2 bg-[#141C27]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">National ID / Aadhaar:</span>
                <span className="font-mono text-[#F1F5F9] font-semibold">{profile.national_id || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Registered Email:</span>
                <span className="text-[#F1F5F9] truncate max-w-[180px]">{profile.email || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Domicile State:</span>
                <span className="text-[#F1F5F9] font-medium">{profile.address_state || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Annual Family Income:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  ₹{(profile.income_annual || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Academic Score:</span>
                <span className="text-blue-400 font-medium">
                  {profile.attributes.gpa ? `GPA ${profile.attributes.gpa}` : ''} 
                  {profile.attributes.percentage ? ` (${profile.attributes.percentage}%)` : ''}
                  {!profile.attributes.gpa && !profile.attributes.percentage ? 'Not set' : ''}
                </span>
              </div>
              {profile.attributes.institution && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Institution:</span>
                  <span className="text-slate-300 truncate max-w-[180px]">{profile.attributes.institution}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Benchmark Personas Accordion */}
        <div className="border border-[#263244] rounded-lg overflow-hidden bg-[#101720]/60">
          <button
            type="button"
            onClick={() => setShowTestPersonas(!showTestPersonas)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-[#F1F5F9] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Sample Personas & Demonstration Scenarios</span>
            </div>
            {showTestPersonas ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {showTestPersonas && (
            <div className="p-3 border-t border-[#263244] space-y-2 bg-[#141C27]">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Selecting a persona automatically streams sample statutory documents through multimodal OCR:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    disabled={isExecuting}
                    className="p-2.5 rounded-lg border border-[#263244] hover:border-blue-500/40 bg-[#101720] hover:bg-[#192333] text-left transition-colors cursor-pointer text-xs disabled:opacity-50"
                  >
                    <div className="font-semibold text-[#F1F5F9]">{preset.name}</div>
                    <div className="text-xs text-blue-400 mt-0.5">{preset.title}</div>
                    <div className="text-xs text-slate-400">{preset.category}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Statutory Scheme Matcher Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#F1F5F9] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-400" />
                <span>Available Schemes ({schemes.length})</span>
              </span>
              {appliedCount > 0 && onOpenAppliedModal && (
                <button
                  type="button"
                  onClick={onOpenAppliedModal}
                  className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{appliedCount} Applied</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {onSyncLiveData && (
                <button
                  type="button"
                  onClick={onSyncLiveData}
                  disabled={isExecuting || isSyncing}
                  className="px-2.5 py-1 rounded-md bg-[#141C27] hover:bg-[#192333] border border-[#263244] text-slate-300 hover:text-[#F1F5F9] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Sync live scheme catalog from National Scholarship Portal"
                >
                  <RefreshCw className={`w-3 h-3 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Fetch Live NSP'}</span>
                </button>
              )}
              <button
                onClick={onOpenAddModal}
                disabled={isExecuting}
                className="px-2.5 py-1 rounded-md bg-[#141C27] hover:bg-[#192333] border border-[#263244] text-slate-300 hover:text-[#F1F5F9] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Add a custom scholarship or college portal target"
              >
                <PlusCircle className="w-3 h-3 text-blue-400" />
                <span>+ Custom Portal</span>
              </button>
            </div>
          </div>

          {/* Batch Apply to All Eligible Button */}
          {schemes.filter((m) => m.is_eligible).length > 0 && onApplyAllEligible && (
            <button
              type="button"
              onClick={onApplyAllEligible}
              disabled={isExecuting}
              className="w-full py-2.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-between shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Apply across all eligible scholarship portals automatically"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Apply to All Eligible Schemes ({schemes.filter((m) => m.is_eligible).length})</span>
              </div>
              <span className="text-xs font-mono font-bold bg-emerald-700/80 px-2 py-0.5 rounded">
                ₹{schemes.filter((m) => m.is_eligible).reduce((acc, curr) => acc + curr.scheme.grant_amount_annual, 0).toLocaleString()}/yr Total
              </span>
            </button>
          )}

          {/* Scheme Cards */}
          <div className="space-y-2.5">
            {schemes.map((match) => {
              const { scheme, is_eligible, eligibility_score, missing_criteria } = match;
              return (
                <div
                  key={scheme.id}
                  className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                    scheme.is_custom
                      ? 'border-blue-500/30 bg-[#101720] shadow-xs'
                      : is_eligible
                      ? 'border-[#263244] bg-[#141C27] hover:border-slate-600 shadow-xs'
                      : 'border-[#263244]/80 bg-[#101720]/70 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-semibold text-sm text-[#F1F5F9] leading-tight">
                          {scheme.name}
                        </h4>
                        {scheme.is_custom && (
                          <span className="px-1.5 py-0.2 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Custom Target
                          </span>
                        )}
                        {scheme.login_mode === 'credentials' && (
                          <span className="px-1.5 py-0.2 rounded text-[11px] font-medium bg-[#192333] text-slate-300 border border-[#263244] flex items-center gap-0.5">
                            <KeyRound className="w-2.5 h-2.5" />
                            <span>Auth Required</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1 line-clamp-1 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{scheme.portal_url}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-emerald-400 whitespace-nowrap">
                        ₹{scheme.grant_amount_annual.toLocaleString()}/yr
                      </span>
                      {scheme.is_custom && (
                        <button
                          onClick={() => onDeleteCustomScheme(scheme.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-[#192333] transition-colors cursor-pointer"
                          title="Delete custom scheme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Match Criteria Badges */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-[#192333] text-slate-300 font-medium border border-[#263244]">
                      Income &lt; ₹{(scheme.max_family_income / 100000).toFixed(1)}L
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#192333] text-slate-300 font-medium border border-[#263244]">
                      Min Marks {scheme.min_gpa_or_percentage}%
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-semibold border ${
                      is_eligible 
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' 
                        : 'bg-red-500/15 text-red-400 border-red-500/25'
                    }`}>
                      {(eligibility_score * 100).toFixed(0)}% Match
                    </span>
                  </div>

                  {/* Missing criteria notice if ineligible */}
                  {!is_eligible && missing_criteria && missing_criteria.length > 0 && (
                    <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded-md border border-red-500/20">
                      {missing_criteria[0]}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectSchemeAndExecute(match)}
                    disabled={isExecuting || !is_eligible}
                    className="w-full mt-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:bg-[#192333] disabled:text-slate-500 disabled:border disabled:border-[#263244] disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>
                      {isExecuting
                        ? 'Agent Session in Progress...'
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
});

IntakeColumn.displayName = 'IntakeColumn';
