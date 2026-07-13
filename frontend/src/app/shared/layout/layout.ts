import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Admin',
  ROLE_K12: 'K-12 Staff',
  ROLE_COLLEGE: 'College Staff',
  ROLE_ADMISSIONS: 'Admissions Staff',
};

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
  userName    = 'User';
  userRole    = '';
  userInitial = 'U';
  isAdmin     = false;

  // ── Branding (per-user logo + school name) ────────────────
  schoolName = 'SCHOOL';
  logoUrl: string | null = null;
  logoUploadError: string | null = null;
  logoFailed = false;

  // ── Role checks ──────────────────────────────────────────
  get currentRole(): string | null {
    return this.authService.getCurrentRole();
  }

  get canManageSchool(): boolean {
    return this.isAdmin;
  }

  constructor(private router: Router, private authService: AuthService) {}

  // ── Lifecycle ────────────────────────────────────────────
  ngOnInit(): void {
    this.loadUserProfileFromToken();
    this.loadFullProfile();
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

  // ── Branding: logo upload ─────────────────────────────────
  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.logoUploadError = null;

    this.authService.uploadLogo(file).subscribe({
      next: (res) => {
        this.logoUrl = res.logoUrl;
        this.logoFailed = false;
      },
      error: (err) => {
        console.error('Failed to upload logo:', err);
        this.logoUploadError = 'Failed to upload logo.';
      },
    });

    input.value = '';
  }

  onLogoError(): void {
    this.logoFailed = true;
  }

  getInitialsPublic(name: string): string {
    return this.getInitials(name);
  }

  // ── Private helpers ──────────────────────────────────────
  private loadUserProfileFromToken(): void {
    const name = this.authService.getCurrentName();
    const role = this.authService.getCurrentRole();

    this.userName    = name ?? 'User';
    this.userRole    = role ? (ROLE_LABELS[role] ?? role) : '';
    this.userInitial = this.getInitials(this.userName);
    this.isAdmin     = this.authService.isAdmin();
  }

  private loadFullProfile(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile.name) {
          this.userName = profile.name;
          this.userInitial = this.getInitials(profile.name);
        }
        if (profile.schoolName) {
          this.schoolName = profile.schoolName;
        }
        this.logoUrl = profile.logoUrl ?? null;
        this.logoFailed = false;
      },
      error: (err) => {
        console.error('Failed to load full profile:', err);
      },
    });
  }

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