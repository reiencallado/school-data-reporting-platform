import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Human-readable labels for the raw ROLE_* strings stored in the JWT.
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

  constructor(private router: Router, private authService: AuthService) {}

  // ── Lifecycle ────────────────────────────────────────────
  ngOnInit(): void {
    // Fast initial paint from the JWT (no network wait)...
    this.loadUserProfileFromToken();
    // ...then refresh with the real profile, which has schoolName/logoUrl
    // that aren't (and shouldn't be) embedded in the JWT itself.
    this.loadFullProfile();
    this.restoreSidebarPreference();
  }

  // ── Sidebar ──────────────────────────────────────────────
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
  }

  // ── Auth
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
      },
      error: (err) => {
        console.error('Failed to upload logo:', err);
        this.logoUploadError = 'Failed to upload logo.';
      },
    });

    // Reset so selecting the same file again still fires a change event
    input.value = '';
  }

  // ── Private helpers

  private loadUserProfileFromToken(): void {
    const name = this.authService.getCurrentName();
    const role = this.authService.getCurrentRole();

    this.userName    = name ?? 'User';
    this.userRole    = role ? (ROLE_LABELS[role] ?? role) : '';
    this.userInitial = this.userName.charAt(0).toUpperCase();
    this.isAdmin     = this.authService.isAdmin();
  }

  private loadFullProfile(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile.name) {
          this.userName = profile.name;
          this.userInitial = profile.name.charAt(0).toUpperCase();
        }
        if (profile.schoolName) {
          this.schoolName = profile.schoolName;
        }
        this.logoUrl = profile.logoUrl ?? null;
      },
      error: (err) => {
        // Non-fatal — the JWT-derived values from loadUserProfileFromToken()
        // above are still shown, this just means school name/logo won't
        // update this session.
        console.error('Failed to load full profile:', err);
      },
    });
  }

  private restoreSidebarPreference(): void {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.sidebarCollapsed = saved === 'true';
    }
  }
}