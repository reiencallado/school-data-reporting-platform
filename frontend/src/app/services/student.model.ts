// src/app/services/student.model.ts

export type StudentType = 'K12' | 'COLLEGE' | 'ADMISSIONS';

export interface K12StudentApi {
  id: string;
  school?: { id: string; name?: string };
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  strand?: string;
  section?: string;
  status: string;
  createdAt?: string;
}

export interface CollegeStudentApi {
  id: string;
  school?: { id: string; name?: string };
  studentId: string;
  firstName: string;
  lastName: string;
  course: string;
  yearLevel: string;
  status: string;
  createdAt?: string;
}

export interface StudentSummary {
  id: string;
  studentType: StudentType;
  schoolId?: string;
  studentId: string;
  firstName: string;
  lastName: string;
  name: string;
  subtitle: string;
  status: string;
  createdAt?: string; // used for default "most recent first" sort — confirm student.service.ts maps this through from the API model

  grade?: string;
  strand?: string;
  section?: string;
  course?: string;
  yearLevel?: string;
}

// ── Field config — shared by search-field scope AND future template field picker ──
export interface FilterFieldConfig {
  key: string;
  label: string;
  getValue: (s: StudentSummary) => string | undefined;
}

export const typeFilterFields: Record<StudentType, FilterFieldConfig[]> = {
  K12: [
    { key: 'grade',   label: 'Grade Level', getValue: s => s.grade },
    { key: 'strand',  label: 'Strand',      getValue: s => s.strand },
    { key: 'section', label: 'Section',     getValue: s => s.section },
  ],
  COLLEGE: [
    { key: 'yearLevel', label: 'Year Level', getValue: s => s.yearLevel },
    { key: 'course',    label: 'Program',    getValue: s => s.course },
  ],
  ADMISSIONS: [], // no data source yet
};

export const allFilterFields: FilterFieldConfig[] = [
  ...typeFilterFields.K12,
  ...typeFilterFields.COLLEGE,
];

// ── Column config — drives the dynamic table per type ──
export interface ColumnConfig {
  key: string;
  label: string;
  type?: 'mono' | 'status'; // rendering hint; default is plain text
  getValue: (s: StudentSummary) => string;
}

// ── Status → badge color mapping ──
// NOTE: "Active" and "Enrolled" currently share the same green badge because
// they represent overlapping concepts in a single flat `status` field. Worth
// revisiting with backend — see conversation notes on splitting this into a
// record-level status (Active/Inactive) and a separate enrollment-period
// status (Enrolled/Dropped/Pending).
const statusBadgeClassMap: Record<string, string> = {
  ACTIVE: 'badge-active',
  ENROLLED: 'badge-enrolled',
  DROPPED: 'badge-dropped',
  PENDING: 'badge-pending',
  INACTIVE: 'badge-inactive',
};

export function getStatusBadgeClass(status: string): string {
  return statusBadgeClassMap[status?.toUpperCase()] ?? 'badge-inactive';
}

export const typeColumns: Record<StudentType, ColumnConfig[]> = {
  K12: [
    { key: 'studentId', label: 'Student ID', type: 'mono', getValue: s => s.studentId },
    { key: 'name',      label: 'Name',                     getValue: s => s.name },
    { key: 'grade',     label: 'Grade',                    getValue: s => s.grade || '-' },
    { key: 'strand',    label: 'Strand',                   getValue: s => s.strand || '-' },
    { key: 'section',   label: 'Section',                  getValue: s => s.section || '-' },
    { key: 'status',    label: 'Status',    type: 'status', getValue: s => s.status },
  ],
  COLLEGE: [
    { key: 'studentId', label: 'Student ID', type: 'mono', getValue: s => s.studentId },
    { key: 'name',      label: 'Name',                     getValue: s => s.name },
    { key: 'yearLevel', label: 'Year Level',                getValue: s => s.yearLevel || '-' },
    { key: 'course',    label: 'Program',                   getValue: s => s.course || '-' },
    { key: 'status',    label: 'Status',    type: 'status', getValue: s => s.status },
  ],
  ADMISSIONS: [], // no data source yet — table shows an empty-state row instead
};