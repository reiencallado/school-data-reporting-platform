export type StudentType = 'K12' | 'COLLEGE';

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

