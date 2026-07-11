import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnInit {

  // ── Sidebar ──────────────────────────────────────────────
  sidebarCollapsed = false;

  // ── Topbar ───────────────────────────────────────────────
  pageTitle = '';

  // ── User Profile ─────────────────────────────────────────
  get userName(): string {
    return this.authService.getCurrentUser()?.username ?? 'Guest';
  }

  get userRole(): string {
    const role = this.authService.getCurrentUser()?.role ?? '';
    // remove "ROLE_" prefix for display, e.g. "ROLE_SCHOOL_ADMIN" -> "School Admin"
    return role
      .replace(/^ROLE_/i, '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'User';
  }

  get schoolName(): string {
    // TODO: replace with real school name once backend adds it
    return this.authService.getCurrentUser()?.tenantId ?? 'School';
  }

  get schoolLogoUrl(): string | null {
    // No logo field yet from backend — always fall back to initials
    return null;
  }

  // ── Role checks ──────────────────────────────────────────
  get currentRole(): string | null {
    return this.authService.getCurrentUser()?.role ?? null;
  }

  get isAdmin(): boolean {
    return this.currentRole === 'ROLE_ADMIN';
  }

  get isSchoolAdmin(): boolean {
    return this.currentRole === 'ROLE_SCHOOL_ADMIN';
  }

  get isViewer(): boolean {
    return this.currentRole === 'ROLE_VIEWER';
  }

  // Convenience: anyone who should see the "Admin Tools" section at all
  get canManageSchool(): boolean {
    return this.isAdmin || this.isSchoolAdmin;
  }

  get userInitials(): string {
    return this.getInitials(this.userName);
  }

  constructor(private router: Router, private authService: AuthService) {}

  // ── Lifecycle ────────────────────────────────────────────
  ngOnInit(): void {
    this.restoreSidebarPreference();
  }

  // ── Sidebar ──────────────────────────────────────────────
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
  }

  // ── Auth ─────────────────────────────────────────────────
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ── Logo error handling ──────────────────────────────────
  logoFailed = false;

  onLogoError(): void {
    this.logoFailed = true;
  }

  getInitialsPublic(name: string): string {
    return this.getInitials(name);
  }

  // ── Private helpers ──────────────────────────────────────
  private getInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    const first = parts[0].charAt(0);
    const last = parts[parts.length - 1].charAt(0);
    return (first + last).toUpperCase();
  }

  private restoreSidebarPreference(): void {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.sidebarCollapsed = saved === 'true';
    }
  }
}