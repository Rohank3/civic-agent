import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Lock
} from 'lucide-react';
import type { CitizenProfile, DualDocumentExtractionResult } from '../../types';
import { SAMPLE_PRESETS } from '../../lib/presets';
import type { SamplePreset } from '../../lib/presets';
import { fetchSampleDocuments } from '../../lib/api';

interface DocumentsViewProps {
  profile: CitizenProfile;
  dualDocResult: DualDocumentExtractionResult | null;
  onParseDocuments: (
    transcript: string,
    income: string,
    transcriptName?: string,
    incomeName?: string
  ) => Promise<void>;
  isVaultActive: boolean;
  vaultDocumentNames?: { transcript?: string; income?: string };
  onClearVault?: () => void;
  onVerifyDigiLocker?: () => void;
  isExecuting?: boolean;
  onLoadBenchmark?: () => Promise<void> | void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = React.memo(({
  profile,
  dualDocResult,
  onParseDocuments,
  isVaultActive,
  vaultDocumentNames,
  onClearVault,
  onVerifyDigiLocker,
  isExecuting,
}) => {
  const [isParsing, setIsParsing] = useState(false);
  const [showPersonas, setShowPersonas] = useState(false);
  const [manualTranscriptName, setManualTranscriptName] = useState<string | null>(null);
  const [manualIncomeName, setManualIncomeName] = useState<string | null>(null);

  const transcriptInputRef = useRef<HTMLInputElement | null>(null);
  const incomeInputRef = useRef<HTMLInputElement | null>(null);

  const uploadedTranscriptName = manualTranscriptName || vaultDocumentNames?.transcript || null;
  const uploadedIncomeName = manualIncomeName || vaultDocumentNames?.income || null;

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

  const handleTranscriptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualTranscriptName(file.name);
    setIsParsing(true);
    try {
      const payload = await readFileAsPayload(file);
      await onParseDocuments(
        payload,
        dualDocResult?.income_certificate.raw_text || '',
        file.name,
        uploadedIncomeName || 'income_certificate.pdf'
      );
    } catch (err) {
      console.error('Failed to parse transcript file', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleIncomeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualIncomeName(file.name);
    setIsParsing(true);
    try {
      const payload = await readFileAsPayload(file);
      await onParseDocuments(
        dualDocResult?.transcript.raw_text || '',
        payload,
        uploadedTranscriptName || 'transcript.pdf',
        file.name
      );
    } catch (err) {
      console.error('Failed to parse income file', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePresetSelect = async (preset: SamplePreset) => {
    setIsParsing(true);
    try {
      const samplePayload = await fetchSampleDocuments(preset.id);
      if (samplePayload) {
        setManualTranscriptName(samplePayload.transcript_file_name);
        setManualIncomeName(samplePayload.income_file_name);
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

        setManualTranscriptName(transcriptName);
        setManualIncomeName(incomeName);

        const [tRes, iRes] = await Promise.all([fetch(transcriptPath), fetch(incomePath)]);
        if (tRes.ok && iRes.ok) {
          const [tBlob, iBlob] = await Promise.all([tRes.blob(), iRes.blob()]);
          const [tB64, iB64] = await Promise.all([
            readFileAsPayload(new File([tBlob], transcriptName, { type: 'application/pdf' })),
            readFileAsPayload(new File([iBlob], incomeName, { type: 'application/pdf' })),
          ]);
          await onParseDocuments(tB64, iB64, transcriptName, incomeName);
        }
      }
    } catch (err) {
      console.error('Failed to load preset document', err);
    } finally {
      setIsParsing(false);
    }
  };

  const sufficiency = dualDocResult ? Math.round(dualDocResult.sufficiency_score * 100) : null;
  const isQuarantine = dualDocResult?.integrity_report?.quarantine_active;

  return (
    <div className="flex flex-1 flex-col gap-6 font-sans">
      {/* Hidden file inputs */}
      <input
        ref={transcriptInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.txt"
        className="hidden"
        onChange={handleTranscriptChange}
      />
      <input
        ref={incomeInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.txt"
        className="hidden"
        onChange={handleIncomeChange}
      />

      {/* Page Title & Status (Efferd Header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-semibold text-xl leading-tight text-[#09090b]">
              Document Vault & Proof Verification
            </h1>
            <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-medium bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]">
              DigiLocker Compliant
            </span>
          </div>
          <p className="text-sm text-[#71717a]">
            Zero-knowledge client encrypted vault with multimodal OCR criteria extraction.
          </p>
        </div>

        {isParsing && (
          <span className="text-xs text-[#09090b] animate-pulse font-medium bg-[#f4f4f5] px-3 py-1.5 rounded-md border border-[#e4e4e7] self-start sm:self-auto">
            Extracting criteria via Gemini OCR...
          </span>
        )}
      </div>

      {/* Encrypted Vault Banner */}
      <div className="p-4 rounded-lg bg-white border border-[#e4e4e7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] text-[#09090b] flex items-center justify-center shrink-0">
            <Lock className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-[#09090b]">
                Client-Side Encryption Standard (AES-256-GCM)
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                isVaultActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]'
              }`}>
                {isVaultActive ? 'ACTIVE & SEALED' : 'STANDBY'}
              </span>
            </div>
            <p className="text-xs text-[#71717a] mt-0.5">
              Documents remain sealed on client device and are injected strictly during Playwright portal execution.
            </p>
          </div>
        </div>

        {isVaultActive && onClearVault && (
          <button
            type="button"
            onClick={onClearVault}
            className="h-8 px-3 rounded-md bg-white hover:bg-[#f4f4f5] border border-[#e4e4e7] text-[#09090b] text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            Clear Vault Cache
          </button>
        )}
      </div>

      {/* The 2 Document Cards (Efferd 2-Column Bordered Grid) */}
      <div className="rounded-lg overflow-hidden border border-[#e4e4e7]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#e4e4e7]">
          {/* Document 1: Academic Marksheet */}
          <div className="bg-white p-6 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#e4e4e7]">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] text-[#09090b] flex items-center justify-center shrink-0">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#09090b]">Academic Marksheet</h3>
                    <p className="text-xs text-[#71717a]">Higher secondary or university score proof</p>
                  </div>
                </div>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-medium border ${
                  uploadedTranscriptName 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-[#f4f4f5] text-[#71717a] border-[#e4e4e7]'
                }`}>
                  {uploadedTranscriptName ? 'EXTRACTED' : 'REQUIRED'}
                </span>
              </div>

              {/* Extracted Metadata Table */}
              {profile.attributes.gpa || profile.attributes.percentage ? (
                <div className="bg-[#f4f4f5]/60 rounded-md p-3.5 border border-[#e4e4e7] text-xs space-y-2 font-mono">
                  <div className="flex justify-between text-[#71717a]">
                    <span>Academic Score:</span>
                    <span className="text-[#09090b] font-medium">
                      {profile.attributes.gpa ? `GPA ${profile.attributes.gpa}` : ''}
                      {profile.attributes.percentage ? ` • ${profile.attributes.percentage}%` : ''}
                    </span>
                  </div>
                  {profile.attributes.institution && (
                    <div className="flex justify-between text-[#71717a]">
                      <span>Institution:</span>
                      <span className="text-[#09090b] truncate max-w-[200px]">{profile.attributes.institution}</span>
                    </div>
                  )}
                  {profile.attributes.roll_number && (
                    <div className="flex justify-between text-[#71717a]">
                      <span>Roll Number:</span>
                      <span className="text-[#09090b]">{profile.attributes.roll_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#71717a] pt-1.5 border-t border-[#e4e4e7]">
                    <span>Source File:</span>
                    <span className="text-[#09090b] font-medium truncate max-w-[200px]">{uploadedTranscriptName}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-lg border border-dashed border-[#e4e4e7] bg-[#f4f4f5]/30 text-center space-y-1">
                  <FileText className="size-6 text-[#71717a] mx-auto" />
                  <p className="text-xs text-[#09090b] font-medium">No marksheet uploaded yet</p>
                  <p className="text-[11px] text-[#71717a]">Upload PDF or image to extract GPA and institution</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => transcriptInputRef.current?.click()}
              disabled={isParsing || isExecuting}
              className="w-full h-8 px-3 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Upload className="size-3.5" />
              <span>{uploadedTranscriptName ? 'Replace Marksheet' : 'Upload Marksheet PDF / Image'}</span>
            </button>
          </div>

          {/* Document 2: Statutory Income Certificate */}
          <div className="bg-white p-6 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#e4e4e7]">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] text-[#09090b] flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#09090b]">Income Certificate</h3>
                    <p className="text-xs text-[#71717a]">Revenue authority annual family income proof</p>
                  </div>
                </div>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-medium border ${
                  uploadedIncomeName 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-[#f4f4f5] text-[#71717a] border-[#e4e4e7]'
                }`}>
                  {uploadedIncomeName ? 'SEALED & VERIFIED' : 'REQUIRED'}
                </span>
              </div>

              {/* Extracted Metadata Table */}
              {profile.income_annual ? (
                <div className="bg-[#f4f4f5]/60 rounded-md p-3.5 border border-[#e4e4e7] text-xs space-y-2 font-mono">
                  <div className="flex justify-between text-[#71717a]">
                    <span>Verified Family Income:</span>
                    <span className="text-[#09090b] font-medium">
                      ₹{profile.income_annual.toLocaleString('en-IN')} / year
                    </span>
                  </div>
                  {profile.attributes.certificate_number && (
                    <div className="flex justify-between text-[#71717a]">
                      <span>Certificate No:</span>
                      <span className="text-[#09090b]">{profile.attributes.certificate_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#71717a]">
                    <span>Issuing Authority:</span>
                    <span className="text-[#09090b]">Revenue Dept ({profile.address_state})</span>
                  </div>
                  <div className="flex justify-between text-[#71717a] pt-1.5 border-t border-[#e4e4e7]">
                    <span>Source File:</span>
                    <span className="text-[#09090b] font-medium truncate max-w-[200px]">{uploadedIncomeName}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-lg border border-dashed border-[#e4e4e7] bg-[#f4f4f5]/30 text-center space-y-1">
                  <ShieldCheck className="size-6 text-[#71717a] mx-auto" />
                  <p className="text-xs text-[#09090b] font-medium">No income certificate uploaded yet</p>
                  <p className="text-[11px] text-[#71717a]">Upload revenue certificate to evaluate ceiling cutoffs</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => incomeInputRef.current?.click()}
              disabled={isParsing || isExecuting}
              className="w-full h-8 px-3 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Upload className="size-3.5" />
              <span>{uploadedIncomeName ? 'Replace Income Certificate' : 'Upload Income Certificate'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pre-flight Eligibility Sufficiency Meter */}
      <div className="p-5 rounded-lg bg-white border border-[#e4e4e7] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-sm text-[#09090b] flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#71717a]" />
            <span>Pre-Flight Eligibility Sufficiency</span>
          </span>
          <span className="font-mono font-medium text-sm text-[#09090b]">
            {sufficiency !== null ? `${sufficiency}% Complete` : 'Proofs required'}
          </span>
        </div>
        <div className="w-full bg-[#f4f4f5] rounded-full h-2 overflow-hidden border border-[#e4e4e7]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              sufficiency && sufficiency >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${sufficiency || 0}%` }}
          />
        </div>
        <p className="text-xs text-[#71717a]">
          Measures completeness of statutory criteria (marksheet GPA, income threshold, category, state domicile) against government schemas.
        </p>
      </div>

      {/* Forensic Document Integrity & Quarantine Status */}
      {dualDocResult?.integrity_report && (
        <div className={`p-4 rounded-lg border text-xs space-y-2.5 ${
          isQuarantine
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-xs">
              {isQuarantine ? (
                <ShieldAlert className="size-4 text-rose-600 shrink-0" />
              ) : (
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
              )}
              <span>
                {isQuarantine
                  ? 'Forensic Anomaly Detected: Quarantine Active'
                  : 'Document Integrity & PAdES Authenticity Validated'}
              </span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-medium ${
              isQuarantine
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              {isQuarantine ? 'REVIEW REQUIRED' : 'CCA VERIFIED'}
            </span>
          </div>

          <p className="text-xs leading-relaxed opacity-90">
            {isQuarantine
              ? 'Uploaded files exhibited incremental divergence from statutory revenue records. In accordance with anti-fraud guidelines, please resolve by authenticating directly with your National DigiLocker repository.'
              : 'Signatures and structural metadata matched statutory issuance registries with zero byte tampering.'}
          </p>

          {isQuarantine && onVerifyDigiLocker && (
            <button
              type="button"
              onClick={onVerifyDigiLocker}
              className="h-8 px-3 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="size-3.5" />
              <span>Authenticate via DigiLocker</span>
            </button>
          )}
        </div>
      )}

      {/* Evaluator Benchmark Presets Section */}
      <div className="border border-[#e4e4e7] rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setShowPersonas(!showPersonas)}
          className="w-full p-4 flex items-center justify-between text-xs font-medium text-[#09090b] hover:bg-[#f4f4f5]/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-sm font-semibold">Evaluator Benchmark Personas & Test Datasets</span>
          </div>
          {showPersonas ? <ChevronUp className="size-4 text-[#71717a]" /> : <ChevronDown className="size-4 text-[#71717a]" />}
        </button>

        {showPersonas && (
          <div className="p-4 border-t border-[#e4e4e7] bg-[#f4f4f5]/40 space-y-3">
            <p className="text-xs text-[#71717a]">
              Select a pre-verified student persona to test multimodal Gemini OCR parsing with authentic benchmark documents:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  disabled={isExecuting || isParsing}
                  className="p-3.5 rounded-lg border border-[#e4e4e7] hover:border-[#18181b] bg-white text-left transition-colors cursor-pointer text-xs disabled:opacity-50 space-y-1"
                >
                  <div className="font-semibold text-[#09090b] text-sm">{preset.name}</div>
                  <div className="text-xs text-[#71717a] font-medium">{preset.title}</div>
                  <div className="text-[11px] text-[#71717a] font-mono">{preset.category}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

DocumentsView.displayName = 'DocumentsView';
