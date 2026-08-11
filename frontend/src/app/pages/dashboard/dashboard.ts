import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ResolutionModalComponent } from '../../shared/components/resolution-modal/resolution-modal';
import { StudentService } from '../../services/student.service';
import { StudentSummary } from '../../services/student.model';
// import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, ResolutionModalComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  // ── Role ─────────────────────────────────────────────────
  // TODO: replace with real value from AuthService
  isAdmin = true;

  // ── Metric Cards ─────────────────────────────────────────
  // TODO: fetch from StudentService / ReportService
  metrics = {
    totalStudents:        1248,
    newStudentsThisMonth: 12,
    activeStudents:       1248,
    newActiveThisMonth:   12,
    reportsGenerated:     1248,
    newReportsThisMonth:  12,
    templates:            10,
    newTemplatesThisMonth: 1,
    systemUsers:          8,
    newUsersThisMonth:    1,
  };

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

  // ── System Overview (admin only) ─────────────────────────
  // TODO: change to real values; fetch from SystemService
  systemOverview = {
    activeSessions:    14,
    sessionLoad:       58,
    storageUsedGb:     42,
    storageTotalGb:    100,
    storagePercent:    42,
    reportsThisMonth:  38,
    reportsLastMonth:  24,
    reportsPercent:    76,
    failedLogins:      3,
    failedLoginPercent: 6,
    pendingApprovals:  5,
    pendingPercent:    25,
  };

  showConfigModal = false;

  constructor(
    private studentService: StudentService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.fetchRecentStudents();
    this.fetchRecentReports();
  }

  private fetchRecentStudents(): void {
    this.studentsLoading.set(true);
    this.studentsError.set(null);

    this.studentService.getAllStudents().subscribe({
      next: (data: StudentSummary[]) => {
        const mapped = data
          .slice()
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
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
      },
      error: (err) => {
        console.error('Failed to fetch recent students:', err);
        this.studentsError.set('Could not load recent students.');
        this.studentsLoading.set(false);
      },
    });
  }

  private fetchRecentReports(): void {
    this.reportsLoading.set(true);
    this.reportsError.set(null);

    this.http.get<any[]>('http://localhost:8080/api/report-jobs').subscribe({
      next: (data: any[]) => {
        const mapped = data
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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