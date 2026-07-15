import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReportStreamService } from '../../services/report-stream.service';
import { Subscription } from 'rxjs';

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
export class Layout implements OnInit, OnDestroy {

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

  toastVisible = false;
  toastHiding = false; // Slide out
  toastMessage = '';
  toastStatus: 'DONE' | 'FAILED' = 'DONE';
  private toastSub?: Subscription;

  // ── Role checks ──────────────────────────────────────────
  get currentRole(): string | null {
    return this.authService.getCurrentRole();
  }

  get canManageSchool(): boolean {
    return this.isAdmin;
  }
  
  // ── Lifecycle ────────────────────────────────────────────
  constructor(
    private router: Router, 
    private authService: AuthService,
    private reportStream: ReportStreamService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserProfileFromToken();
    this.loadFullProfile();
    this.restoreSidebarPreference();

    this.toastSub = this.reportStream.toastUpdates$.subscribe(update => {
      this.toastMessage = update.message || '';
      this.toastStatus = update.status as 'DONE' | 'FAILED';
      
      // Reset states
      this.toastHiding = false;
      this.toastVisible = true;
      this.cdr.detectChanges();

      // Auto-hide after 5 seconds
      setTimeout(() => this.closeToast(), 5000);
    });
  }

  ngOnDestroy(): void {
    if (this.toastSub) this.toastSub.unsubscribe();
  }

  closeToast(event?: Event): void {
    if (event) event.stopPropagation();
    
    this.toastHiding = true; // Slide out
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toastVisible = false;
      this.toastHiding = false;
      this.cdr.detectChanges();
    }, 300);
  }

  onToastClick(): void {
    this.router.navigate(['/archives']);
    this.closeToast();
  }

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