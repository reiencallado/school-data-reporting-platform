import { StudentType } from '../services/student.model';
import { TemplateReportKind } from '../services/report-template.model';
import k12Enrollment from '../../assets/starter-templates/k12/certificate-of-enrollment.json';
import k12ClassRoster from '../../assets/starter-templates/k12/class-roster-header.json';
import k12IdCard from '../../assets/starter-templates/k12/id-card.json';
import collegeEnrollment from '../../assets/starter-templates/college/certificate-of-enrollment.json';
import collegeIdCard from '../../assets/starter-templates/college/id-card.json';
import admissionsApplicationSummary from '../../assets/starter-templates/admissions/application-summary.json';
import financialSummaryReport from '../../assets/starter-templates/data/financial-summary-report.json';
import enrollmentStatisticsReport from '../../assets/starter-templates/data/enrollment-statistics-report.json';

export type StudentTypeFilter = StudentType | 'ALL';

export interface StarterTemplate {
  id: string;
  name: string;
  reportKind: TemplateReportKind;
  category?: StudentType;
  description: string;
  thumbnailUrl?: string;
  template: any;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  // ── STUDENT: K12 ──
  { id: 'k12-cert-enrollment', name: 'Certificate of Enrollment', reportKind: 'STUDENT', category: 'K12', description: 'Standard enrollment certificate for Grade 7-12 students.', template: k12Enrollment },
  { id: 'k12-class-roster-header', name: 'Class Roster Header', reportKind: 'STUDENT', category: 'K12', description: 'Header block for printing a section/class list.', template: k12ClassRoster },
  { id: 'k12-id-card', name: 'Student ID Card', reportKind: 'STUDENT', category: 'K12', description: 'Wallet-size ID card with photo and grade/section.', template: k12IdCard },

  // ── STUDENT: College ──
  { id: 'college-cert-enrollment', name: 'Certificate of Enrollment', reportKind: 'STUDENT', category: 'COLLEGE', description: 'Standard enrollment certificate for college students.', template: collegeEnrollment },
  { id: 'college-id-card', name: 'Student ID Card', reportKind: 'STUDENT', category: 'COLLEGE', description: 'Wallet-size ID card with photo, program, and year level.', template: collegeIdCard },

  // ── STUDENT: Admissions ──
  { id: 'admissions-application-summary', name: 'Application Summary', reportKind: 'STUDENT', category: 'ADMISSIONS', description: 'One-page overview of an applicant and their status.', template: admissionsApplicationSummary },

  // ── DATA ──
  { id: 'financial-summary-report', name: 'Financial Summary Report', reportKind: 'DATA', description: 'Tuition collections, outstanding balances, and collection rate for a period.', template: financialSummaryReport },
  { id: 'enrollment-statistics-report', name: 'Enrollment Statistics Report', reportKind: 'DATA', description: 'Total enrollment, new admissions, and breakdown by student type.', template: enrollmentStatisticsReport },
];