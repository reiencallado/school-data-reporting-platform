import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of, map } from 'rxjs';
import {
  K12StudentApi, CollegeStudentApi, AdmissionStudentApi,
  StudentSummary, canViewStudentType,
} from './student.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  /**
   * Merges K12 + College + Admissions students into one normalized list.
   * There is no single backend endpoint for this — three separate REST
   * resources on three unrelated tables — so the merge happens here on
   * the client via forkJoin.
   *
   * IMPORTANT: only calls the endpoint(s) the current role is actually
   * authorized for. All three controllers enforce @PreAuthorize
   * (ROLE_K12/ROLE_COLLEGE/ROLE_ADMISSIONS/ROLE_ADMIN), so unconditionally
   * calling all three via forkJoin would make forkJoin fail entirely for
   * any non-admin role — a single 403 from an endpoint they can't access
   * would break the whole merged list, including data they DO have
   * access to.
   */
  getAllStudents(): Observable<StudentSummary[]> {
    const role = this.authService.getCurrentRole();
    const calls: Observable<StudentSummary[]>[] = [];

    if (canViewStudentType(role, 'K12')) {
      calls.push(
        this.http.get<K12StudentApi[]>(`${this.baseUrl}/k12-students`, { headers: this.authHeaders() })
          .pipe(map(list => list.map(this.mapK12)))
      );
    }

    if (canViewStudentType(role, 'COLLEGE')) {
      calls.push(
        this.http.get<CollegeStudentApi[]>(`${this.baseUrl}/college-students`, { headers: this.authHeaders() })
          .pipe(map(list => list.map(this.mapCollege)))
      );
    }

    if (canViewStudentType(role, 'ADMISSIONS')) {
      calls.push(
        this.http.get<AdmissionStudentApi[]>(`${this.baseUrl}/admission-students`, { headers: this.authHeaders() })
          .pipe(map(list => list.map(this.mapAdmission)))
      );
    }

    if (calls.length === 0) {
      return of([]);
    }

    return forkJoin(calls).pipe(map(results => results.flat()));
  }

  private mapK12(s: K12StudentApi): StudentSummary {
    const parts = [`Grade ${s.grade}`];
    if (s.strand) parts.push(s.strand);
    if (s.section) parts.push(s.section);

    return {
      id: s.id,
      studentType: 'K12',
      schoolId: s.school?.id,
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      name: `${s.firstName} ${s.lastName}`,
      subtitle: parts.join(' • '),
      status: s.status,
      createdAt: s.createdAt,
      grade: s.grade,
      strand: s.strand,
      section: s.section,
    };
  }

  private mapCollege(s: CollegeStudentApi): StudentSummary {
    return {
      id: s.id,
      studentType: 'COLLEGE',
      schoolId: s.school?.id,
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      name: `${s.firstName} ${s.lastName}`,
      subtitle: `${s.course} • ${s.yearLevel}`,
      status: s.status,
      createdAt: s.createdAt,
      course: s.course,
      yearLevel: s.yearLevel,
    };
  }

  /**
   * AdmissionStudents has no dedicated reference-number field on the
   * backend (unlike K12/College's studentId) — the raw UUID is used as
   * studentId here so existing UI (tables, selection, etc.) that expects
   * every StudentSummary to have a studentId keeps working unchanged.
   */
  private mapAdmission(s: AdmissionStudentApi): StudentSummary {
    const appliedFor = s.gradeLevelApplied || s.courseApplied || 'Unspecified program';

    return {
      id: s.id,
      studentType: 'ADMISSIONS',
      schoolId: s.school?.id,
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      name: `${s.firstName} ${s.lastName}`,
      subtitle: `Applying: ${appliedFor}`,
      status: s.status,
      createdAt: s.createdAt,
      lastSchoolAttended: s.lastSchoolAttended,
      highestGradeCompleted: s.highestGradeCompleted,
      gpa: s.gpa,
      gradeLevelApplied: s.gradeLevelApplied,
      courseApplied: s.courseApplied,
    };
  }
}