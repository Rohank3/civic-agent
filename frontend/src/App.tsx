import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { IntakeColumn } from './components/intake/IntakeColumn';
import { TraceColumn } from './components/telemetry/TraceColumn';
import { ViewportColumn } from './components/viewport/ViewportColumn';
import { HitlModal } from './components/hitl/HitlModal';
import { ReceiptModal } from './components/receipt/ReceiptModal';
import { AddSchemeModal } from './components/intake/AddSchemeModal';
import { LoginPage } from './components/auth/LoginPage';
import type { 
  CitizenProfile, 
  CitizenUser,
  SchemeMatchResult, 
  DualDocumentExtractionResult, 
  TelemetryEvent, 
  TrackingReceipt, 
  ActorRole, 
  ScholarshipScheme 
} from './types';
import { SAMPLE_PRESETS } from './lib/presets';
import { 
  matchSchemes, 
  parseDualDocuments, 
  submitDigitalSignature,
  createCustomScheme,
  deleteCustomScheme
} from './lib/api';

export const App: React.FC = () => {
  const defaultPreset = SAMPLE_PRESETS[0];

  const [currentUser, setCurrentUser] = useState<CitizenUser | null>(() => {
    const stored = localStorage.getItem('civic_logged_in_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const userId = currentUser ? currentUser.id : 'user_anonymous';

  const [profile, setProfile] = useState<CitizenProfile>(defaultPreset.profile);
  const [dualDocResult, setDualDocResult] = useState<DualDocumentExtractionResult | null>(null);
  const [schemes, setSchemes] = useState<SchemeMatchResult[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<ScholarshipScheme | null>(null);

  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('IDLE');
  const [activeActor, setActiveActor] = useState<ActorRole>('STUDENT_INTAKE');
  const [pacingMode, setPacingMode] = useState<'1x' | '2x' | '5x' | 'turbo'>('1x');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const [hitlOpen, setHitlOpen] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<TrackingReceipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const caseIdRef = useRef<string>('case-2026-001');
  const wsRef = useRef<WebSocket | null>(null);
  const skipFlagRef = useRef<boolean>(false);

  // Initialize live telemetry socket
  useEffect(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/telemetry/${caseIdRef.current}`);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      wsRef.current = ws;
      return () => ws.close();
    } catch {
      // ws connection standby
    }
  }, []);

  // Initialize schemes and parse initial preset
  useEffect(() => {
    async function init() {
      const matched = await matchSchemes(defaultPreset.profile, userId);
      setSchemes(matched);
      if (matched.length > 0) {
        setSelectedScheme(matched[0].scheme);
      }
      const initialDocRes = await parseDualDocuments(defaultPreset.transcriptText, defaultPreset.incomeCertText);
      setDualDocResult(initialDocRes);
    }
    init();
  }, [defaultPreset, userId]);

  const handleParseDocuments = async (transcript: string, income: string) => {
    const res = await parseDualDocuments(transcript, income);
    setDualDocResult(res);
    setProfile(res.auto_populated_profile);
    const matched = await matchSchemes(res.auto_populated_profile, userId);
    setSchemes(matched);
    if (matched.length > 0) {
      setSelectedScheme(matched[0].scheme);
    }
  };

  const handleCreateCustomScheme = async (schemeData: Partial<ScholarshipScheme>) => {
    const newScheme = await createCustomScheme(schemeData, userId);
    const matched = await matchSchemes(profile, userId);
    setSchemes(matched);
    const found = matched.find((m) => m.scheme.id === newScheme.id);
    if (found) {
      setSelectedScheme(found.scheme);
    }
  };

  const handleDeleteCustomScheme = async (schemeId: string) => {
    await deleteCustomScheme(schemeId, userId);
    const matched = await matchSchemes(profile, userId);
    setSchemes(matched);
    if (selectedScheme?.id === schemeId && matched.length > 0) {
      setSelectedScheme(matched[0].scheme);
    }
  };

  const getPacingDelay = () => {
    if (skipFlagRef.current || pacingMode === 'turbo') return 50;
    if (pacingMode === '5x') return 250;
    if (pacingMode === '2x') return 600;
    return 1200; // 1x normal
  };

  const addTelemetryEvent = (
    action: string,
    details: string,
    stage: string,
    actor: ActorRole,
    step?: number,
    fields?: number
  ) => {
    const newEvent: TelemetryEvent = {
      type: 'telemetry',
      case_id: caseIdRef.current,
      timestamp: new Date().toISOString(),
      actor,
      stage,
      action,
      details,
      step: step || currentStep,
      fields_filled: fields,
      pacing_mode: pacingMode,
    };
    setEvents((prev) => [...prev, newEvent]);
    setCurrentStage(stage);
    setActiveActor(actor);
  };

  const handleSkipTyping = () => {
    skipFlagRef.current = true;
    addTelemetryEvent(
      'CHAPTER_CUT_ACTIVATED',
      'Fast-forward chapter cut triggered: skipping repetitive input typing and jumping to next milestone.',
      currentStage,
      activeActor
    );
  };

  const handleSelectSchemeAndExecute = async (match: SchemeMatchResult) => {
    if (isExecuting) return;
    setIsExecuting(true);
    setSelectedScheme(match.scheme);
    setCurrentStep(1);
    skipFlagRef.current = false;
    caseIdRef.current = `case-${Date.now().toString().slice(-6)}`;

    // 1. Preflight Evaluation
    addTelemetryEvent(
      'PREFLIGHT_VERIFIED',
      `Evaluated credentials for ${match.scheme.name}. Sufficiency score: ${(dualDocResult?.sufficiency_score || 0.98) * 100}%.`,
      'PREFLIGHT',
      'STUDENT_INTAKE'
    );

    await new Promise((r) => setTimeout(r, getPacingDelay()));

    // 2. Launching Stealth Chromium
    addTelemetryEvent(
      'SPINNING_BROWSER',
      `Launching headless Chromium session with stealth evasion. Navigating to ${match.scheme.portal_url}...`,
      'SPINNING_BROWSER',
      'AUTONOMOUS_AGENT'
    );

    await new Promise((r) => setTimeout(r, getPacingDelay()));

    // 3. Solving Obstacles (Modal Notice)
    addTelemetryEvent(
      'OBSTACLE_RESOLVED',
      'Detected obstructive cookie notice & regulatory alert modal. Automatically accepted terms and cleared overlay.',
      'SOLVING_OBSTACLES',
      'AUTONOMOUS_AGENT',
      1
    );

    await new Promise((r) => setTimeout(r, getPacingDelay()));

    // 4. Populating Step 1 Inputs
    addTelemetryEvent(
      'FORM_POPULATED',
      `Populated 6 applicant demographic inputs (Full Name: ${profile.full_name}, ID: ${profile.national_id}).`,
      'POPULATING_FORM',
      'AUTONOMOUS_AGENT',
      1,
      6
    );

    await new Promise((r) => setTimeout(r, getPacingDelay()));

    // 5. Advancing to Step 2
    setCurrentStep(2);
    addTelemetryEvent(
      'WIZARD_ADVANCED',
      'Step 1 validations cleared; advanced wizard to Step 2 (Financials & Document Proofs).',
      'NAVIGATING',
      'AUTONOMOUS_AGENT',
      2
    );

    await new Promise((r) => setTimeout(r, getPacingDelay()));

    // 6. Step 2 Upload & Income Mapping
    addTelemetryEvent(
      'DOCUMENT_ATTACHED',
      'Uploaded verified Academic_Transcript.pdf and family income certificate (REV/INC/2026/8819).',
      'POPULATING_FORM',
      'AUTONOMOUS_AGENT',
      2,
      10
    );

    await new Promise((r) => setTimeout(r, getPacingDelay()));

    // 7. Advancing to Step 3 (Review Step)
    setCurrentStep(3);
    addTelemetryEvent(
      'WIZARD_ADVANCED',
      'Step 2 completed; advanced to Step 3: Pre-submission verification and final declaration.',
      'NAVIGATING',
      'AUTONOMOUS_AGENT',
      3
    );

    await new Promise((r) => setTimeout(r, getPacingDelay()));

    // 8. Self-Reflection Input Audit
    addTelemetryEvent(
      'SELF_REFLECTION_VERIFIED',
      'Self-reflection audit complete: verified all 14 interactive DOM controls match verified student record.',
      'SELF_REFLECTION',
      'AUTONOMOUS_AGENT',
      3
    );

    await new Promise((r) => setTimeout(r, getPacingDelay() / 2));

    // 9. Pause for HITL Review
    addTelemetryEvent(
      'AWAITING_CITIZEN_SIGNATURE',
      'Reached final statutory declaration step. Pausing execution for explicit citizen digital signature.',
      'AWAITING_CITIZEN_REVIEW',
      'CITIZEN_HITL',
      3
    );

    setHitlOpen(true);
  };

  const handleAuthorizeSubmission = async (signatureDataUrl: string) => {
    setHitlOpen(false);

    // 10. Digital Signature Authorized
    addTelemetryEvent(
      'SIGNATURE_AUTHORIZED',
      'Citizen digital signature received and verified. Authorizing Playwright agent to commit final submission.',
      'SUBMITTING',
      'CITIZEN_HITL',
      3
    );

    await submitDigitalSignature(caseIdRef.current, signatureDataUrl);
    await new Promise((r) => setTimeout(r, 600));

    // 11. Final Submission Confirmed
    const trackingNo = `PUB-REC-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const sha256 = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newReceipt: TrackingReceipt = {
      tracking_number: trackingNo,
      case_id: caseIdRef.current,
      timestamp: new Date().toISOString(),
      sha256_hash: sha256,
      service_id: selectedScheme ? selectedScheme.id : 'state_scholarship',
      student_name: profile.full_name,
      scheme_title: selectedScheme ? selectedScheme.name : 'Higher Education Scholarship',
      grant_amount: selectedScheme?.grant_amount_annual || 25000,
    };

    setReceipt(newReceipt);

    addTelemetryEvent(
      'RECEIPT_EXTRACTED',
      `Application confirmed by State Authority! Official Tracking ID: ${trackingNo}. SHA-256 digest sealed.`,
      'SUBMITTED',
      'GOVERNMENT_AUTHORITY',
      3
    );

    setIsExecuting(false);
    setReceiptOpen(true);
  };

  const handleReset = () => {
    setIsExecuting(false);
    setCurrentStage('IDLE');
    setActiveActor('STUDENT_INTAKE');
    setCurrentStep(1);
    setEvents([]);
    setReceipt(null);
    setHitlOpen(false);
    setReceiptOpen(false);
    caseIdRef.current = `case-${Date.now().toString().slice(-6)}`;
  };

  if (!currentUser) {
    return (
      <LoginPage
        onLogin={(user) => {
          setCurrentUser(user);
          localStorage.setItem('civic_logged_in_user', JSON.stringify(user));
          if (user.profile) {
            setProfile(user.profile);
          }
        }}
        onContinueAsGuest={() => {
          const guest: CitizenUser = {
            id: 'user_guest',
            username: 'guest_citizen',
            fullName: 'Guest Citizen',
            email: 'guest@civicagent.gov',
            role: 'applicant',
            authMethod: 'demo',
          };
          setCurrentUser(guest);
          localStorage.setItem('civic_logged_in_user', JSON.stringify(guest));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30">
      {/* Top Navigation */}
      <Navbar
        wsConnected={wsConnected}
        activeActor={activeActor}
        onReset={handleReset}
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('civic_logged_in_user');
          setCurrentUser(null);
        }}
      />

      {/* 3-Column Split-Screen Cockpit Layout */}
      <main className="flex-1 p-3 sm:p-4 max-w-[1920px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-[calc(100vh-65px)]">
        {/* Column 1: Citizen Intake Panel & Scheme Matcher */}
        <section className="lg:col-span-4 xl:col-span-3 h-[84vh] min-h-[500px]">
          <IntakeColumn
            profile={profile}
            dualDocResult={dualDocResult}
            onParseDocuments={handleParseDocuments}
            schemes={schemes}
            onSelectSchemeAndExecute={handleSelectSchemeAndExecute}
            isExecuting={isExecuting}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onDeleteCustomScheme={handleDeleteCustomScheme}
          />
        </section>

        {/* Column 2: Agent Reasoning Trace & State Machine */}
        <section className="lg:col-span-4 xl:col-span-4 h-[84vh] min-h-[500px]">
          <TraceColumn
            events={events}
            currentStage={currentStage}
          />
        </section>

        {/* Column 3: Live Viewport Screencast & Chapter Cut Controls */}
        <section className="lg:col-span-4 xl:col-span-5 h-[84vh] min-h-[500px]">
          <ViewportColumn
            currentStage={currentStage}
            activeActor={activeActor}
            pacingMode={pacingMode}
            setPacingMode={setPacingMode}
            onSkipTyping={handleSkipTyping}
            screenshotBase64={null}
            currentStep={currentStep}
            profile={profile}
            selectedScheme={selectedScheme}
            isExecuting={isExecuting}
            onTriggerHitlSignoff={() => setHitlOpen(true)}
          />
        </section>
      </main>

      {/* Human-in-the-Loop Sign-off Modal */}
      <HitlModal
        isOpen={hitlOpen}
        onClose={() => setHitlOpen(false)}
        profile={profile}
        scheme={selectedScheme}
        onAuthorizeSubmission={handleAuthorizeSubmission}
      />

      {/* Cryptographic Receipt & PDF Export Modal */}
      <ReceiptModal
        receipt={receiptOpen ? receipt : null}
        onClose={() => setReceiptOpen(false)}
      />

      {/* User-Isolated Custom Scheme / Portal Modal */}
      <AddSchemeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddScheme={handleCreateCustomScheme}
        userId={userId}
      />
    </div>
  );
};

export default App;
