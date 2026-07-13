export type StudentType = 'K12' | 'COLLEGE' | 'ADMISSIONS';

// Mirrors backend roles (AppUser.role / JWT "role" claim).
// This is the ONE canonical UserRole for the whole app - user.model.ts
// used to declare a second, incompatible UserRole
// ('ROLE_ADMIN' | 'ROLE_SCHOOL_ADMIN' | 'ROLE_VIEWER'); that's been removed
// since it didn't match the real JWT claims / backend @PreAuthorize roles.
// ROLE_ADMISSIONS exists on the backend (admission_students, now
// school-scoped) but has no StudentType counterpart here yet, since
// AdmissionStudents isn't merged into StudentSummary - see the note below.
export type UserRole = 'ROLE_K12' | 'ROLE_COLLEGE' | 'ROLE_ADMISSIONS' | 'ROLE_ADMIN';

/**
 * Which StudentType(s) each role is allowed to see, for FRONTEND DISPLAY
 * PURPOSES ONLY. This is not a security boundary - the actual enforcement
 * already happens server-side (AuthUtil + @PreAuthorize + school-scoping
 * in K12StudentsController/CollegeStudentsController). This map exists so
 * the UI can correctly hide/filter data the user isn't authorized to see,
 * matching what the backend would return/reject anyway.
 *
 * ROLE_ADMIN currently sees all types, with no school restriction - per
 * current instructions, school-scoping for ROLE_ADMIN is a planned future
 * restriction, not enforced yet (backend already mirrors this: AuthUtil
 * .isAdmin() bypasses school checks entirely).
 *
 * ROLE_ADMISSIONS maps to an empty array here because admissions data
 * isn't part of StudentSummary/StudentType at all right now - it's a
 * separate backend resource (admission_students) with its own shape
 * (applicant fields, GPA, etc.), not merged into this K12/College model.
 */
export const ROLE_STUDENT_TYPE_ACCESS: Record<UserRole, StudentType[]> = {
  ROLE_K12: ['K12'],
  ROLE_COLLEGE: ['COLLEGE'],
  ROLE_ADMISSIONS: [],
  ROLE_ADMIN: ['K12', 'COLLEGE'],
};

export function canViewStudentType(role: UserRole | null | undefined, type: StudentType): boolean {
  if (!role) return false;
  return ROLE_STUDENT_TYPE_ACCESS[role]?.includes(type) ?? false;
}

// Raw shapes as returned by the two existing backend endpoints.
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
  createdAt?: string; // used for default "most recent first" sort - confirm student.service.ts maps this through from the API model

  grade?: string;
  strand?: string;
  section?: string;
  course?: string;
  yearLevel?: string;
}

// ── Field config - shared by search-field scope AND future template field picker ──
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

// ── Column config - drives the dynamic table per type ──
export interface ColumnConfig {
  key: string;
  label: string;
  type?: 'mono' | 'status'; // rendering hint; default is plain text
  getValue: (s: StudentSummary) => string;
}

// ── Status → badge color mapping ──
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
  ADMISSIONS: [], // no data source yet - table shows an empty-state row instead
};