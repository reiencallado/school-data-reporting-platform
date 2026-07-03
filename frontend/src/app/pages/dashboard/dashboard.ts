import { Component, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ResolutionModalComponent } from '../../shared/components/resolution-modal/resolution-modal';
// import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, ResolutionModalComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {

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
  // TODO: fetch from StudentService (limit 10, sort by createdAt desc)
  students: StudentRow[] = [
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '4.0', status: 'Active' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '4.0', status: 'Active' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '4.0', status: 'Active' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '4.0', status: 'Active' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '4.0', status: 'Active' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '3.8', status: 'Inactive' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '3.5', status: 'Active' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '4.0', status: 'Active' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '3.9', status: 'Active' },
    { id: '12XXXXX', name: 'John Doe', section: 'AXX', cgpa: '4.0', status: 'Active' },
  ];

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