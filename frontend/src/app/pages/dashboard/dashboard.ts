import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ResolutionModalComponent } from '../../shared/components/resolution-modal/resolution-modal';
import { StudentService } from '../../services/student.service';
import { StudentSummary } from '../../services/student.model';
import { ReportTemplateService } from '../../services/report-template.service';
import { AuthService } from '../../services/auth.service';

/** True if the given ISO date string falls in the current calendar month/year. */
function isThisMonth(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, ResolutionModalComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  // ── Role ─────────────────────────────────────────────────
  // Set in the constructor below from AuthService.isAdmin() (decoded
  // straight off the JWT — display/filtering only, not a security
  // boundary; the backend re-verifies on every actual request).
  isAdmin: boolean;

  // ── Metric Cards ─────────────────────────────────────────
  // Signal (not a plain object) for the same zoneless-repaint reason as
  // `students`/`reports` below — a mutated plain object won't trigger a
  // repaint here.
  metrics = signal({
    totalStudents:        0,
    newStudentsThisMonth: 0,
    activeStudents:       0,
    newActiveThisMonth:   0,
    reportsGenerated:     0,
    newReportsThisMonth:  0,
    templates:            0,
    // no newTemplatesThisMonth: ReportTemplate has no createdAt field to
    // derive it from (see report-template.model.ts) — showing a delta
    // here would just be a fabricated number.
    systemUsers:          0,
  });

  // ── Recent Students ──────────────────────────────────────
  students = signal<StudentRow[]>([]);
  studentsLoading = signal(false);
  studentsError = signal<string | null>(null);

  // ── Recent Reports ────────────────────────────────────────
  // Fetched from the same /api/report-jobs endpoint Archives uses,
  // sorted newest-first, capped to 5. Kept as a signal for the same
  // zoneless-repaint reason as `students` above.
  reports = signal<ReportRow[]>([]);
  reportsLoading = signal(false);
  reportsError = signal<string | null>(null);

  // Same status → badge-class mapping used in Archives, so the two
  // views stay visually consistent.
  statusClasses: Record<string, string> = {
    DONE: 'status-badge-done',
    PROCESSING: 'status-badge-processing',
    FAILED: 'status-badge-failed',
    PENDING: 'status-badge-processing',
  };

  showConfigModal = false;

  constructor(
    private studentService: StudentService,
    private reportTemplateService: ReportTemplateService,
    private authService: AuthService,
    private http: HttpClient,
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.fetchRecentStudents();
    this.fetchRecentReports();
    this.fetchTemplateCount();
    // /api/admin/users is admin-only (@PreAuthorize) — skip it entirely
    // for non-admins rather than eat a guaranteed 403.
    if (this.isAdmin) {
      this.fetchSystemUserCount();
    }
  }

  private fetchRecentStudents(): void {
    this.studentsLoading.set(true);
    this.studentsError.set(null);

    this.studentService.getAllStudents().subscribe({
      next: (data: StudentSummary[]) => {
        const sorted = data
          .slice()
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          });

        const mapped = sorted
          .slice(0, 10)
          .map((s): StudentRow => ({
            id: s.studentId,
            name: s.name,
            section: s.subtitle,
            cgpa: '—',
            status: s.status === 'ACTIVE' ? 'Active' : 'Inactive',
          }));
        this.students.set(mapped);
        this.studentsLoading.set(false);

        // Metric cards: derived from the same full (unsliced) list so we
        // don't fire a second request just for the counts.
        const activeStudents = sorted.filter(s => s.status === 'ACTIVE').length;
        const newStudentsThisMonth = sorted.filter(s => isThisMonth(s.createdAt)).length;
        const newActiveThisMonth = sorted.filter(s => s.status === 'ACTIVE' && isThisMonth(s.createdAt)).length;

        this.metrics.update(m => ({
          ...m,
          totalStudents: sorted.length,
          newStudentsThisMonth,
          activeStudents,
          newActiveThisMonth,
        }));
      },
      error: (err) => {
        console.error('Failed to fetch recent students:', err);
        this.studentsError.set('Could not load recent students.');
        this.studentsLoading.set(false);
      },
    });
  }

  private fetchTemplateCount(): void {
    this.reportTemplateService.getAllTemplates().subscribe({
      next: (templates) => {
        this.metrics.update(m => ({ ...m, templates: templates.length }));
      },
      error: (err) => {
        console.error('Failed to fetch template count:', err);
      },
    });
  }

  private fetchSystemUserCount(): void {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.metrics.update(m => ({ ...m, systemUsers: users.length }));
      },
      error: (err) => {
        console.error('Failed to fetch system user count:', err);
      },
    });
  }

  private fetchRecentReports(): void {
    this.reportsLoading.set(true);
    this.reportsError.set(null);

    this.http.get<any[]>('http://localhost:8080/api/report-jobs').subscribe({
      next: (data: any[]) => {
        const sorted = data
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const mapped = sorted
          .slice(0, 10)   // ← was 5, now matches Recent Students
          .map((job): ReportRow => ({
            id: job.id,
            name: job.reportName || job.template?.name || 'Untitled Batch',
            template: job.template?.name || 'Unknown Template',
            by: job.requestedBy?.name || 'Admin',
            date: job.createdAt ? job.createdAt.split('T')[0] : '',
            status: job.status || 'PENDING',
          }));
        this.reports.set(mapped);
        this.reportsLoading.set(false);

        // Metric card: derived from the same full (unsliced) list.
        const newReportsThisMonth = sorted.filter(job => isThisMonth(job.createdAt)).length;
        this.metrics.update(m => ({
          ...m,
          reportsGenerated: sorted.length,
          newReportsThisMonth,
        }));
      },
      error: (err) => {
        console.error('Failed to fetch recent reports:', err);
        this.reportsError.set('Could not load recent reports.');
        this.reportsLoading.set(false);
      },
    });
  }
}

// ── Interfaces ───────────────────────────────────────────────
interface StudentRow {
  id:      string;
  name:    string;
  section: string;
  cgpa:    string;
  status:  string;
}

interface ReportRow {
  id:       string;
  name:     string;
  template: string;
  by:       string;
  date:     string;
  status:   'PENDING' | 'DONE' | 'PROCESSING' | 'FAILED';
}