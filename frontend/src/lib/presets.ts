import type { CitizenProfile } from '../types';

export interface SamplePreset {
  id: string;
  name: string;
  title: string;
  badge: string;
  category: string;
  transcriptText: string;
  incomeCertText: string;
  profile: CitizenProfile;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'first_gen_stem',
    name: 'Aarav Sharma',
    title: 'First-Gen STEM Scholar',
    badge: 'High Eligibility (3 Schemes)',
    category: 'OBC / Need-based',
    transcriptText: `OFFICIAL ACADEMIC TRANSCRIPT
Student Name: Aarav Sharma
Roll No: 2024CS-1092
Institution: State Institute of Technology
Department: Computer Science and Engineering
CGPA: 3.85
Aggregate Marks: 82.5%
Academic Year: 2024-2026
Verified by Controller of Examinations.`,
    incomeCertText: `GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT
STATUTORY FAMILY INCOME CERTIFICATE
Certificate Number: REV/INC/2026/8819
Date of Issue: 2026-01-15
This is to certify that:
Applicant Name: Aarav Sharma
Son of: Ramesh Sharma
Total Annual Household Income: Rs. 1,80,000
District: Bangalore Urban
State: Karnataka
Issuing Authority: Office of the Tahsildar
Status: Valid for Academic Year 2026-2027.`,
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
    transcriptText: `OFFICIAL TRANSCRIPT OF ACADEMIC RECORD
Student Name: Eleanor Vance
Roll No: 2024DS-9821
Institution: National Technological University
Major: Data Science & Artificial Intelligence
Grade Point Average: 3.92
Aggregate Score: 92.0%
Date of Issue: 2026-05-10
Verified by University Registrar.`,
    incomeCertText: `STATE PUBLIC WELFARE & REVENUE DIVISION
INCOME CERTIFICATE
Certificate Number: PUB/INC/2026/1944
Date of Issue: 2026-02-01
Certified that Applicant: Eleanor Vance
Ward of: Arthur Vance
Annual Family Gross Income: Rs. 1,20,000
District: Wayanad
State: Kerala
Issuing Authority: Revenue Divisional Officer
Validity: Active Statutory Record.`,
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
