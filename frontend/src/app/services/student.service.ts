import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of, map } from 'rxjs';
import { K12StudentApi, CollegeStudentApi, StudentSummary, canViewStudentType } from './student.model';
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
   * Merges K12 + College students into one normalized list. There is no
   * single backend endpoint for this — /api/k12-students and
   * /api/college-students are separate REST resources on two unrelated
   * tables, so the merge happens here on the client via forkJoin.
   *
   * IMPORTANT: only calls the endpoint(s) the current role is actually
   * authorized for. Both controllers now enforce @PreAuthorize
   * (ROLE_K12/ROLE_COLLEGE/ROLE_ADMIN), so unconditionally calling both
   * via forkJoin would make forkJoin fail entirely for a non-admin user —
   * a single 403 from the endpoint they can't access would break the
   * whole merged list, including the data they DO have access to.
   *
   * AdmissionStudents doesn't have a StudentType/StudentSummary shape yet
   * (see student.model.ts), so ROLE_ADMISSIONS currently gets an empty
   * list here rather than an error.
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
      course: s.course,
      yearLevel: s.yearLevel,
    };
  }
}