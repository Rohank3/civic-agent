import type { CitizenProfile } from '../types';

export interface SamplePreset {
  id: string;
  name: string;
  title: string;
  badge: string;
  category: string;
  profile: CitizenProfile;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'first_gen_stem',
    name: 'Aarav Sharma',
    title: 'First-Gen STEM Scholar',
    badge: 'High Eligibility (3 Schemes)',
    category: 'OBC / Need-based',
    profile: {
      full_name: 'Aarav Sharma',
      date_of_birth: '2003-05-12',
      national_id: 'AADHAAR-8819-2026-9012',
      email: 'aarav.sharma@sit.edu.in',
      phone: '9876543210',
      address_street: '14 MG Road, Civil Station',
      address_city: 'Bengaluru',
      address_state: 'Karnataka',
      address_zip: '560001',
      income_annual: 180000.0,
      household_size: 4,
      category: 'OBC',
      attributes: {
        gpa: 3.85,
        percentage: 82.5,
        major: 'Computer Science and Engineering',
        institution: 'State Institute of Technology',
        roll_number: '2024CS-1092',
        certificate_number: 'REV/INC/2026/8819',
      },
    },
  },
  {
    id: 'rural_merit',
    name: 'Eleanor Vance',
    title: 'Rural Need-Based Scholar',
    badge: '100% Match (Tier 1)',
    category: 'GENERAL / Economically Weak',
    profile: {
      full_name: 'Eleanor Vance',
      date_of_birth: '2002-11-20',
      national_id: 'AADHAAR-1944-9821-4433',
      email: 'eleanor.vance@ntu.ac.in',
      phone: '9876543212',
      address_street: '72 Hill View Avenue',
      address_city: 'Kalpetta',
      address_state: 'Kerala',
      address_zip: '673121',
      income_annual: 120000.0,
      household_size: 3,
      category: 'EWS',
      attributes: {
        gpa: 3.92,
        percentage: 92.0,
        major: 'Data Science & Artificial Intelligence',
        institution: 'National Technological University',
        roll_number: '2024DS-9821',
        certificate_number: 'PUB/INC/2026/1944',
      },
    },
  },
];
