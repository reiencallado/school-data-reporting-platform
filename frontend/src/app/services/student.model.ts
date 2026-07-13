export type StudentType = 'K12' | 'COLLEGE';

// Mirrors backend roles (AppUser.role / JWT "role" claim).
// ROLE_ADMISSIONS exists on the backend (admission_students, now
// school-scoped) but has no StudentType counterpart here yet, since
// AdmissionStudents isn't merged into StudentSummary — see the note below.
export type UserRole = 'ROLE_K12' | 'ROLE_COLLEGE' | 'ROLE_ADMISSIONS' | 'ROLE_ADMIN';

/**
 * Which StudentType(s) each role is allowed to see, for FRONTEND DISPLAY
 * PURPOSES ONLY. This is not a security boundary — the actual enforcement
 * already happens server-side (AuthUtil + @PreAuthorize + school-scoping
 * in K12StudentsController/CollegeStudentsController). This map exists so
 * the UI can correctly hide/filter data the user isn't authorized to see,
 * matching what the backend would return/reject anyway.
 *
 * ROLE_ADMIN currently sees all types, with no school restriction — per
 * current instructions, school-scoping for ROLE_ADMIN is a planned future
 * restriction, not enforced yet (backend already mirrors this: AuthUtil
 * .isAdmin() bypasses school checks entirely).
 *
 * ROLE_ADMISSIONS maps to an empty array here because admissions data
 * isn't part of StudentSummary/StudentType at all right now — it's a
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

// Normalized shape used everywhere in the UI (Students page, Generate
// Report), merging K12 + College into one list with a type badge.
// AdmissionStudents doesn't exist on the backend yet — StudentType only
// covers K12/COLLEGE for now; add 'ADMISSION' here once that endpoint exists.
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

  grade?: string;
  strand?: string;
  section?: string;
  course?: string;
  yearLevel?: string;
}