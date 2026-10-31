/**
 * Client-Side PII Redaction & Privacy-Preserving Formatter
 * 
 * Complies with strict data governance:
 * - Masks sensitive identity numbers, contact information, and street addresses
 * - Preserves jurisdiction identifiers (city, state) required for statutory audit provenance
 * - Ensures exported receipts can be shared, printed, or verified without leaking citizen PII
 */

export function maskNationalId(val: string): string {
  if (!val) return '***-**-****';
  const clean = val.trim();
  if (clean.length <= 4) return '****';
  return `***-**-${clean.slice(-4)}`;
}

export function maskPhone(val: string): string {
  if (!val) return '***-***-****';
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 4) return '***-****';
  return `***-***-${digits.slice(-4)}`;
}

export function maskEmail(val: string): string {
  if (!val || !val.includes('@')) return '***@***.***';
  const [local, domain] = val.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}${'*'.repeat(Math.min(5, local.length - 2))}${local.slice(-1)}@${domain}`;
}

export function maskStreetAddress(street: string): string {
  if (!street) return '*** Confidential Residential Address ***';
  const parts = street.trim().split(/\s+/);
  if (parts.length <= 2) {
    return `*** ${parts[parts.length - 1]}`;
  }
  return `*** ${parts.slice(1).join(' ')}`;
}

export function maskRollNumber(roll: string): string {
  if (!roll) return '***-****';
  const clean = roll.trim();
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, Math.min(4, clean.length - 4))}-****`;
}

export function maskCertificateNumber(cert: string): string {
  if (!cert) return 'REV/INC/****';
  const clean = cert.trim();
  if (clean.length <= 6) return '****';
  return `${clean.slice(0, 4)}/****/${clean.slice(-4)}`;
}
