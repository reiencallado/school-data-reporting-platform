import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReportTemplate } from './report-template.model';

@Injectable({
  providedIn: 'root'
})
export class ReportTemplateService {
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Connects to: GET http://localhost:8080/api/report-templates
  getAllTemplates(): Observable<ReportTemplate[]> {
    return this.http.get<ReportTemplate[]>(`${this.baseUrl}/report-templates`, { headers: this.authHeaders() });
  }

  // Connects to: GET http://localhost:8080/api/report-templates/{id}
  getTemplateById(id: string): Observable<ReportTemplate> {
    return this.http.get<ReportTemplate>(`${this.baseUrl}/report-templates/${id}`, { headers: this.authHeaders() });
  }

  // Connects to: GET http://localhost:8080/api/report-templates/school/{schoolId}
  getTemplatesBySchool(schoolId: string): Observable<ReportTemplate[]> {
    return this.http.get<ReportTemplate[]>(`${this.baseUrl}/report-templates/school/${schoolId}`, { headers: this.authHeaders() });
  }

  // Connects to: POST http://localhost:8080/api/report-templates
  createTemplate(template: ReportTemplate): Observable<ReportTemplate> {
    return this.http.post<ReportTemplate>(`${this.baseUrl}/report-templates`, template, { headers: this.authHeaders() });
  }

  // Connects to: PUT http://localhost:8080/api/report-templates/{id}
  updateTemplate(id: string, template: ReportTemplate): Observable<ReportTemplate> {
    return this.http.put<ReportTemplate>(`${this.baseUrl}/report-templates/${id}`, template, { headers: this.authHeaders() });
  }
}