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
  // TODO: replace with real values from AuthService once auth is wired
  userName    = 'UserName';
  userRole    = 'Admin User';
  userInitial = 'U';
  isAdmin     = true;

  constructor(private router: Router, private authService: AuthService) {}

  // ── Lifecycle ────────────────────────────────────────────
  ngOnInit(): void {
    // this.loadUserProfile();
    this.restoreSidebarPreference();
  }

  // ── Sidebar ──────────────────────────────────────────────
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
  }

  // ── Auth 
  logout(): void {
    // this.authService.logout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ── Private helpers 

  /*
  private loadUserProfile(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.userName    = user.name;
    this.userRole    = user.role;
    this.userInitial = user.name.charAt(0).toUpperCase();
    this.isAdmin     = user.role.toLowerCase() === 'admin';
  }
  */

  private restoreSidebarPreference(): void {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      this.sidebarCollapsed = saved === 'true';
    }
  }
}