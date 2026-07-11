import k12Enrollment from '../../assets/starter-templates/k12-certificate-of-enrollment.json';
import collegeEnrollment from '../../assets/starter-templates/college-certificate-of-enrollment.json';
import classRoster from '../../assets/starter-templates/class-roster-header.json';
import studentIdCard from '../../assets/starter-templates/student-id-card.json';

export type StudentTypeFilter = 'K12' | 'COLLEGE' | 'ADMISSIONS' | 'ALL';
export type DocType = 'CERTIFICATE' | 'ROSTER' | 'ID_CARD';

export interface StarterTemplate {
  id: string;
  name: string;
  export type TemplateStudentType = 'K12' | 'COLLEGE' | 'ADMISSIONS';
  docType: DocType; // which "Explore Templates" category this belongs to
  description: string;
  thumbnailUrl?: string;
  template: any;
}

export interface DocTypeInfo {
  key: DocType;
  label: string;
}

export const DOC_TYPES: DocTypeInfo[] = [
  { key: 'CERTIFICATE', label: 'Certificates' },
  { key: 'ROSTER', label: 'Rosters' },
  { key: 'ID_CARD', label: 'ID Cards' },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'k12-cert-enrollment',
    name: 'Certificate of Enrollment (K12)',
    category: 'K12',
    docType: 'CERTIFICATE',
    description: 'Standard enrollment certificate for Grade 7-12 students.',
    template: k12Enrollment,
  },
  {
    id: 'college-cert-enrollment',
    name: 'Certificate of Enrollment (College)',
    category: 'COLLEGE',
    docType: 'CERTIFICATE',
    description: 'Standard enrollment certificate for college students.',
    template: collegeEnrollment,
  },
  {
    id: 'class-roster-header',
    name: 'Class Roster Header',
    category: 'K12',
    docType: 'ROSTER',
    description: 'Header block for printing a section/class list.',
    template: classRoster,
  },
  {
    id: 'student-id-card',
    name: 'Student ID Card',
    category: 'K12',
    docType: 'ID_CARD',
    description: 'Compact ID card layout with photo placeholder.',
    template: studentIdCard,
  },
];