export interface CitizenUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'applicant' | 'admin' | 'officer';
  authMethod: 'password' | 'digilocker' | 'demo';
  avatar?: string;
  profile?: CitizenProfile;
}

export interface ScholarshipScheme {
  id: string;
  name: string;
  ministry: string;
  level: "undergraduate" | "postgraduate" | "secondary" | "vocational" | "all";
  target_category: string[];
  max_family_income: number;
  min_gpa_or_percentage: number;
  grant_amount_annual: number;
  application_deadline: string;
  portal_url: string;
  required_documents: string[];
  description: string;
  active: boolean;
  is_custom?: boolean;
  user_id?: string;
  login_mode?: 'fresh_registration' | 'credentials' | 'sso';
  credentials_username?: string;
  credentials_password?: string;
}

export interface SchemeMatchResult {
  scheme: ScholarshipScheme;
  is_eligible: boolean;
  eligibility_score: number;
  reasons: string[];
  missing_criteria: string[];
}

export interface CitizenProfile {
  full_name: string;
  date_of_birth: string;
  national_id: string;
  email: string;
  phone: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  income_annual: number;
  household_size: number;
  category?: string;
  attributes: {
    gpa?: number;
    percentage?: number;
    major?: string;
    institution?: string;
    roll_number?: string;
    certificate_number?: string;
    [key: string]: any;
  };
}

export interface TranscriptData {
  student_name: string | null;
  roll_number: string | null;
  institution: string | null;
  gpa: number | null;
  percentage: number | null;
  major: string | null;
  academic_year?: string | null;
  confidence: number;
  raw_text?: string | null;
}

export interface IncomeCertificateData {
  certificate_number: string | null;
  applicant_name: string | null;
  parent_or_guardian_name?: string | null;
  annual_income: number | null;
  currency?: string;
  issuing_authority: string | null;
  state: string | null;
  district: string | null;
  issue_date?: string | null;
  valid_until?: string | null;
  confidence: number;
  raw_text?: string | null;
}

export interface DocumentIntegrityReport {
  status: 'VERIFIED' | 'CLEAN' | 'TAMPER_SUSPECTED';
  quarantine_active: boolean;
  producer?: string | null;
  creator?: string | null;
  modification_divergence?: boolean;
  has_digital_signature?: boolean;
  forensic_findings: string[];
  tamper_score: number;
  recommended_action: 'PROCEED' | 'DIGILOCKER_PULL' | 'MANUAL_REVIEW';
}

export interface DualDocumentExtractionResult {
  transcript: TranscriptData;
  income_certificate: IncomeCertificateData;
  name_match: boolean;
  verified_income: number | null;
  verified_gpa: number | null;
  sufficiency_score: number;
  warnings: string[];
  auto_populated_profile: CitizenProfile;
  integrity_report?: DocumentIntegrityReport | null;
}

export type ActorRole = 
  | "STUDENT_INTAKE" 
  | "AUTONOMOUS_AGENT" 
  | "CITIZEN_HITL" 
  | "GOVERNMENT_AUTHORITY";

export interface TelemetryEvent {
  type: string;
  case_id: string;
  timestamp: string;
  actor: ActorRole;
  stage: string;
  action: string;
  details: string;
  screenshot?: string | null;
  step?: number;
  fields_filled?: number;
  pacing_mode?: string;
}

export interface TrackingReceipt {
  tracking_number: string;
  case_id: string;
  timestamp: string;
  sha256_hash: string;
  signature_hash?: string | null;
  service_id: string;
  student_name: string;
  scheme_title: string;
  ministry?: string;
  grant_amount?: number;
  screenshot_base64?: string;
  page_url?: string;
}

export interface AppliedScholarship {
  id: string;
  schemeId: string;
  schemeName: string;
  ministry: string;
  grantAmount: number;
  portalUrl: string;
  trackingNumber: string;
  caseId: string;
  timestamp: string;
  status: 'SUBMITTED' | 'UNDER_VERIFICATION' | 'APPROVED';
  sha256Hash: string;
  signatureDataUrl?: string;
  receipt?: TrackingReceipt;
  events?: TelemetryEvent[];
}
