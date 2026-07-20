import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
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
    // Admin-only
    systemUsers:          8,
    newUsersThisMonth:    1,
  };

  // ── Recent Students ──────────────────────────────────────
  // Now fetched from StudentService (real K12/College/Admissions data,
  // already role/school-scoped server-side), sorted newest-first, capped
  // to 10. Everything else on this page is still mock data per request.
  students: StudentRow[] = [];
  studentsLoading = false;
  studentsError: string | null = null;

  // ── Recent Reports ───────────────────────────────────────
  // TODO: fetch from ReportService (limit 10, sort by createdAt desc)
  reports: ReportRow[] = [
    { name: 'Monthly Student Report',        type: 'Summary',     by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Graduation Report',             type: 'Class',       by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Diploma Certificates',          type: 'Certificate', by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Perfect Attendance Awards',     type: 'Certificate', by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Quarterly Financial Report',    type: 'Finance',     by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Monthly Student Report',        type: 'Summary',     by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Monthly Student Report',        type: 'Summary',     by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Monthly Student Report',        type: 'Summary',     by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Monthly Student Report',        type: 'Summary',     by: 'FName LName', date: 'June 10, 2026' },
    { name: 'Monthly Student Report',        type: 'Summary',     by: 'FName LName', date: 'June 10, 2026' },
  ];

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

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.fetchRecentStudents();
  }

  private fetchRecentStudents(): void {
    this.studentsLoading = true;
    this.studentsError = null;

    this.studentService.getAllStudents().subscribe({
      next: (data: StudentSummary[]) => {
        this.students = data
          .slice()
          .sort((a, b) => {
            // Newest first; students with no createdAt sort last rather
            // than crashing the comparator or floating to the top.
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 10)
          .map((s): StudentRow => ({
            id: s.studentId,
            name: s.name,
            // Reuses the same descriptive string StudentService already
            // builds per type (e.g. "Grade 10 • STEM • A" for K12,
            // "BSCS • 3rd Year" for College) instead of re-deriving it here.
            section: s.subtitle,
            // No CGPA field exists on any of the real student entities —
            // this was dummy-data-only. Shown as a placeholder rather
            // than inventing a number.
            cgpa: '—',
            // Table's badge logic checks for the exact string 'Active',
            // but real backend statuses are upper-case ('ACTIVE'/'INACTIVE') —
            // normalized here so the existing badge styling still works
            // correctly without touching the template.
            status: s.status === 'ACTIVE' ? 'Active' : 'Inactive',
          }));
        this.studentsLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch recent students:', err);
        this.studentsError = 'Could not load recent students.';
        this.studentsLoading = false;
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
  name: string;
  type: string;
  by:   string;
  date: string;
}