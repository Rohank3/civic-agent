import { useSyncExternalStore } from 'react';
import type { 
  ActorRole, 
  TelemetryEvent, 
  TrackingReceipt, 
  ScholarshipScheme, 
  CitizenProfile 
} from '../types';
import { 
  getWsUrl, 
  executeLiveService, 
  controlAgent, 
  submitDigitalSignature 
} from './api';

export interface ExecutionStatus {
  isExecuting: boolean;
  isPaused: boolean;
  wsConnected: boolean;
  currentStage: string;
  activeActor: ActorRole;
  currentStep: number;
  caseId: string;
  receipt: TrackingReceipt | null;
  selectedScheme: ScholarshipScheme | null;
}

type Listener = () => void;

class ExecutionStore {
  // 1. High-frequency visual frame state
  private screenshot: string | null = null;
  private lastValidScreenshot: string | null = null;
  private screenshotListeners = new Set<Listener>();

  // 2. Telemetry event stream state
  private events: TelemetryEvent[] = [];
  private eventListeners = new Set<Listener>();

  // 3. Execution lifecycle status
  private status: ExecutionStatus = {
    isExecuting: false,
    isPaused: false,
    wsConnected: false,
    currentStage: 'IDLE',
    activeActor: 'STUDENT_INTAKE',
    currentStep: 1,
    caseId: 'case-initial',
    receipt: null,
    selectedScheme: null,
  };
  private statusListeners = new Set<Listener>();

  // Internal WebSocket and connection management
  private ws: WebSocket | null = null;
  private activeCaseId = 'case-initial';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onHitlCallback?: () => void;
  private onSubmittedCallback?: (receipt: TrackingReceipt, caseId: string) => void;

  constructor() {
    this.subscribeScreenshot = this.subscribeScreenshot.bind(this);
    this.getScreenshot = this.getScreenshot.bind(this);
    this.subscribeEvents = this.subscribeEvents.bind(this);
    this.getEvents = this.getEvents.bind(this);
    this.subscribeStatus = this.subscribeStatus.bind(this);
    this.getStatus = this.getStatus.bind(this);
  }

  // --- Subscriptions for useSyncExternalStore ---

  subscribeScreenshot(listener: Listener): () => void {
    this.screenshotListeners.add(listener);
    return () => {
      this.screenshotListeners.delete(listener);
    };
  }

  getScreenshot(): string | null {
    return this.screenshot || (this.status.isExecuting ? this.lastValidScreenshot : null);
  }

  private notifyScreenshot(): void {
    this.screenshotListeners.forEach((l) => l());
  }

  subscribeEvents(listener: Listener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  getEvents(): TelemetryEvent[] {
    return this.events;
  }

  private notifyEvents(): void {
    this.eventListeners.forEach((l) => l());
  }

  subscribeStatus(listener: Listener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): ExecutionStatus {
    return this.status;
  }

  private updateStatus(partial: Partial<ExecutionStatus>): void {
    this.status = { ...this.status, ...partial };
    this.statusListeners.forEach((l) => l());
  }

  // --- External Control Actions ---

  public setCallbacks(callbacks: {
    onHitl?: () => void;
    onSubmitted?: (receipt: TrackingReceipt, caseId: string) => void;
  }): void {
    this.onHitlCallback = callbacks.onHitl;
    this.onSubmittedCallback = callbacks.onSubmitted;
  }

  public addLocalEvent(
    action: string,
    details: string,
    stage: string,
    actor: ActorRole,
    step?: number,
    fields?: number
  ): void {
    const newEvent: TelemetryEvent = {
      type: 'telemetry',
      case_id: this.activeCaseId,
      timestamp: new Date().toISOString(),
      actor,
      stage,
      action,
      details,
      step: step || this.status.currentStep,
      fields_filled: fields,
      pacing_mode: '1x',
    };
    this.events = [...this.events, newEvent];
    this.notifyEvents();

    if (this.status.currentStage !== stage || this.status.activeActor !== actor) {
      this.updateStatus({ currentStage: stage, activeActor: actor });
    }
  }

  public async startExecution(
    scheme: ScholarshipScheme,
    profile: CitizenProfile,
    documents: Array<{ name: string; kind: string; content: string }>
  ): Promise<void> {
    if (this.status.isExecuting) return;

    const newCaseId = `case-${Date.now().toString(36)}`;
    this.activeCaseId = newCaseId;

    // Reset screencast, telemetry and set execution state
    this.screenshot = null;
    this.lastValidScreenshot = null;
    this.notifyScreenshot();
    this.events = [];
    this.notifyEvents();

    this.updateStatus({
      isExecuting: true,
      isPaused: false,
      currentStage: 'PREFLIGHT',
      activeActor: 'STUDENT_INTAKE',
      currentStep: 1,
      caseId: newCaseId,
      receipt: null,
      selectedScheme: scheme,
    });

    this.connectWebSocket(newCaseId);

    // Launch Playwright execution session on backend
    try {
      await executeLiveService({
        service_id: scheme.id,
        portal_url: scheme.portal_url,
        profile,
        documents,
      });
    } catch (e) {
      console.error('Failed to launch live Playwright agent session:', e);
      this.addLocalEvent(
        'EXECUTION_FALLBACK',
        'Backend connection offline. Please ensure API gateway is running on :8000 via run_dev.bat.',
        'ERROR',
        'AUTONOMOUS_AGENT'
      );
      this.updateStatus({ isExecuting: false, currentStage: 'ERROR' });
    }
  }

  public togglePause(): void {
    if (this.status.isPaused) {
      controlAgent(this.activeCaseId, 'resume');
      this.updateStatus({ isPaused: false });
      this.addLocalEvent(
        'EXECUTION_RESUMED',
        'Operator resumed autonomous agent execution.',
        this.status.currentStage,
        this.status.activeActor
      );
    } else {
      controlAgent(this.activeCaseId, 'pause');
      this.updateStatus({ isPaused: true });
      this.addLocalEvent(
        'EXECUTION_PAUSED',
        'Operator paused autonomous agent execution.',
        this.status.currentStage,
        this.status.activeActor
      );
    }
  }

  public stepAdvance(): void {
    controlAgent(this.activeCaseId, 'step');
    this.addLocalEvent(
      'STEP_SIGNALLED',
      'Manual step-by-step advance triggered by operator.',
      this.status.currentStage,
      this.status.activeActor
    );
  }

  public skipTyping(): void {
    controlAgent(this.activeCaseId, 'skip');
    this.addLocalEvent(
      'CHAPTER_CUT_ACTIVATED',
      'Fast-forward triggered: skipping typing delay on active page.',
      this.status.currentStage,
      this.status.activeActor
    );
  }

  public async authorizeSignature(signatureDataUrl: string): Promise<void> {
    this.addLocalEvent(
      'SIGNATURE_AUTHORIZED',
      'Citizen digital signature received and verified. Signaling Playwright agent to commit final submission.',
      'SUBMITTING',
      'CITIZEN_HITL',
      this.status.currentStep
    );
    await submitDigitalSignature(this.activeCaseId, signatureDataUrl);
  }

  public reset(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const resetCaseId = `case-${Date.now().toString().slice(-6)}`;
    this.activeCaseId = resetCaseId;
    this.screenshot = null;
    this.lastValidScreenshot = null;
    this.notifyScreenshot();
    this.events = [];
    this.notifyEvents();

    this.updateStatus({
      isExecuting: false,
      isPaused: false,
      wsConnected: false,
      currentStage: 'IDLE',
      activeActor: 'STUDENT_INTAKE',
      currentStep: 1,
      caseId: resetCaseId,
      receipt: null,
    });
  }

  // --- WebSocket Connection Management ---

  private connectWebSocket(caseId: string): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      const ws = new WebSocket(getWsUrl(caseId));
      this.ws = ws;

      ws.onopen = () => {
        if (this.activeCaseId === caseId) {
          this.updateStatus({ wsConnected: true });
        }
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'telemetry') {
            const hasNewScreenshot = Boolean(msg.screenshot);

            // 1. High-frequency visual screenshot frame update:
            // Dispatched exclusively to screencast listeners without touching App or Intake!
            if (hasNewScreenshot) {
              this.screenshot = msg.screenshot;
              this.lastValidScreenshot = msg.screenshot;
              this.notifyScreenshot();
            }

            // 2. Append telemetry event
            const eventItem: TelemetryEvent = {
              type: 'telemetry',
              case_id: msg.case_id || caseId,
              timestamp: new Date().toISOString(),
              actor: (msg.actor as ActorRole) || 'AUTONOMOUS_AGENT',
              stage: msg.stage || 'NAVIGATING',
              action: msg.action || 'STEP',
              details: msg.details || '',
              step: msg.step || 1,
              fields_filled: msg.fields_filled,
              screenshot: msg.screenshot,
              pacing_mode: '1x',
            };
            this.events = [...this.events, eventItem];
            this.notifyEvents();

            // 3. Status lifecycle update
            const nextStage = msg.stage || this.status.currentStage;
            const nextActor = (msg.actor as ActorRole) || this.status.activeActor;
            const nextStep = msg.step || this.status.currentStep;

            const statusChanged = 
              nextStage !== this.status.currentStage ||
              nextActor !== this.status.activeActor ||
              nextStep !== this.status.currentStep;

            if (statusChanged) {
              this.updateStatus({
                currentStage: nextStage,
                activeActor: nextActor,
                currentStep: nextStep,
              });
            }

            // Check for HITL signature gate
            if (
              (msg.stage === 'AWAITING_CITIZEN_REVIEW' || msg.action === 'AWAITING_CITIZEN_SIGNATURE') &&
              this.onHitlCallback
            ) {
              this.onHitlCallback();
            }

            // Check for submission receipt completion
            if (msg.stage === 'SUBMITTED' && msg.receipt) {
              this.updateStatus({
                receipt: msg.receipt,
                isExecuting: false,
                currentStage: 'SUBMITTED',
              });
              if (this.onSubmittedCallback) {
                this.onSubmittedCallback(msg.receipt, caseId);
              }
            }

            if (msg.stage === 'ERROR') {
              this.updateStatus({
                isExecuting: false,
                currentStage: 'ERROR',
              });
            }
          }
        } catch (e) {
          console.warn('Telemetry WS parse error:', e);
        }
      };

      ws.onclose = () => {
        if (this.activeCaseId === caseId) {
          this.updateStatus({ wsConnected: false });
          // Automatic reconnect if still executing
          if (this.status.isExecuting) {
            this.reconnectTimer = setTimeout(() => {
              if (this.activeCaseId === caseId && this.status.isExecuting) {
                this.connectWebSocket(caseId);
              }
            }, 1500);
          }
        }
      };
    } catch (e) {
      console.warn('WS initialization error:', e);
    }
  }
}

// Global execution store singleton
export const executionStore = new ExecutionStore();

// --- React Hooks for Subscribing to Stream State ---

/**
 * Subscribes ONLY to live Playwright screencast frames (Base64 JPEG).
 * Incoming frames trigger re-render ONLY in the subscribing viewport element.
 * Zero impact on App.tsx, Navbar, or IntakeColumn!
 */
export function useScreencastFrame(): string | null {
  return useSyncExternalStore(
    executionStore.subscribeScreenshot,
    executionStore.getScreenshot,
    executionStore.getScreenshot
  );
}

/**
 * Subscribes ONLY to the telemetry event trace stream.
 * Incoming telemetry events trigger re-render ONLY in TraceColumn / InspectorDrawer.
 */
export function useTelemetryEvents(): TelemetryEvent[] {
  return useSyncExternalStore(
    executionStore.subscribeEvents,
    executionStore.getEvents,
    executionStore.getEvents
  );
}

/**
 * Subscribes to major execution lifecycle status transitions (stage, actor, paused, executing).
 */
export function useExecutionStatus(): ExecutionStatus {
  return useSyncExternalStore(
    executionStore.subscribeStatus,
    executionStore.getStatus,
    executionStore.getStatus
  );
}
