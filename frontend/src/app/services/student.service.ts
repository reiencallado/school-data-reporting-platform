import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { K12StudentApi, CollegeStudentApi, StudentSummary } from './student.model';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  /**
   * Merges K12 + College students into one normalized list. There is no
   * single backend endpoint for this — /api/k12-students and
   * /api/college-students are separate REST resources on two unrelated
   * tables, so the merge happens here on the client via forkJoin.
   * AdmissionsStudents doesn't exist on the backend yet; add a third call
   * here (and a third mapper) once it does.
   */
  getAllStudents(): Observable<StudentSummary[]> {
    return forkJoin({
      k12: this.http.get<K12StudentApi[]>(`${this.baseUrl}/k12-students`, { headers: this.authHeaders() }),
      college: this.http.get<CollegeStudentApi[]>(`${this.baseUrl}/college-students`, { headers: this.authHeaders() }),
    }).pipe(
      map(({ k12, college }) => [
        ...k12.map(this.mapK12),
        ...college.map(this.mapCollege),
      ])
    );
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