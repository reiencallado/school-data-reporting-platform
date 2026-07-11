import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../services/student.model';
import { SEED_SCHOOLS } from '../../pdf-designer/pdf-designer';

const ROLE_LABELS: Record<UserRole, string> = {
  ROLE_ADMIN: 'Admin',
  ROLE_K12: 'K-12 Staff',
  ROLE_COLLEGE: 'College Staff',
  ROLE_ADMISSIONS: 'Admissions Staff',
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
  schoolName?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {

  users: AdminUser[] = [];
  loading = false;
  error: string | null = null;

  // Hardcoded - there is no GET /api/schools endpoint yet, despite
  // School.java/SchoolRepository existing on the backend. Swap for a
  // real call once that endpoint exists.
  schools = SEED_SCHOOLS;

  roleOptions: UserRole[] = ['ROLE_ADMIN', 'ROLE_K12', 'ROLE_COLLEGE', 'ROLE_ADMISSIONS'];
  roleLabels = ROLE_LABELS;

  selectedRoles = new Set<UserRole>();
  searchTerm = '';

  dropdownStates: { [key: string]: boolean } = { role: false };
  modalState: 'closed' | 'add' | 'edit' = 'closed';
  selectedUser: AdminUser | null = null;
  formData: Partial<AdminUser> & { password?: string } = {};
  saveError: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  // NOTE: no GET /api/admin/users endpoint exists yet (AdminController
  // only has POST /users). Stubbed empty; newly created users are appended
  // locally in saveUser() so the page stays usable for this session.
  fetchUsers(): void {
    this.users = [];
  }

  get filtered(): AdminUser[] {
    const q = this.searchTerm.toLowerCase();
    return this.users.filter(u => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = this.selectedRoles.size === 0 || this.selectedRoles.has(u.role);
      return matchSearch && matchRole;
    });
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).map(p => p[0]).join('').toUpperCase();
  }

  roleLabel(role: UserRole): string {
    return this.roleLabels[role] ?? role;
  }

  roleBadgeClass(role: UserRole): string {
    return 'role-' + role.replace('ROLE_', '').toLowerCase();
  }

  toggleDropdown(type: string, e: Event): void {
    e.stopPropagation();
    const next = !this.dropdownStates[type];
    Object.keys(this.dropdownStates).forEach(k => this.dropdownStates[k] = false);
    this.dropdownStates[type] = next;
  }

  onDropdownPanelClick(event: Event): void {
    event.stopPropagation();
  }

  toggleFilter(role: UserRole): void {
    this.selectedRoles.has(role) ? this.selectedRoles.delete(role) : this.selectedRoles.add(role);
  }

  clearFilter(): void {
    this.selectedRoles.clear();
  }

  getLabel(): string {
    if (this.selectedRoles.size === 0) return 'Role';
    if (this.selectedRoles.size === 1) return `Role: ${this.roleLabel(Array.from(this.selectedRoles)[0])}`;
    return `Role: ${this.selectedRoles.size} selected`;
  }

  openAddModal(): void {
    this.selectedUser = null;
    this.saveError = null;
    this.formData = { role: 'ROLE_K12', schoolId: this.schools[0]?.id };
    this.modalState = 'add';
  }

  openEditModal(user: AdminUser): void {
    this.selectedUser = user;
    this.saveError = null;
    this.formData = { ...user };
    this.modalState = 'edit';
  }

  closeModal(): void {
    this.modalState = 'closed';
    this.saveError = null;
  }

  saveUser(): void {
    if (!this.formData.name?.trim() || !this.formData.email?.trim() || !this.formData.role || !this.formData.schoolId) {
      this.saveError = 'Please fill in all fields.';
      return;
    }

    if (this.modalState === 'add') {
      if (!this.formData.password?.trim()) {
        this.saveError = 'Please set a temporary password.';
        return;
      }

      this.authService.createUser({
        name: this.formData.name.trim(),
        email: this.formData.email.trim(),
        password: this.formData.password.trim(),
        role: this.formData.role,
        school: { id: this.formData.schoolId },
      }).subscribe({
        next: () => {
          this.users.unshift({
            id: `local-${Date.now()}`,
            name: this.formData.name!.trim(),
            email: this.formData.email!.trim(),
            role: this.formData.role as UserRole,
            schoolId: this.formData.schoolId!,
            schoolName: this.schools.find(s => s.id === this.formData.schoolId)?.name,
          });
          this.closeModal();
        },
        error: (err) => {
          console.error('Failed to create user:', err);
          this.saveError = 'Failed to create user. Please try again.';
        },
      });
    } else if (this.modalState === 'edit' && this.selectedUser) {
      // NOTE: no PUT /api/admin/users/{id} endpoint exists yet - local-only.
      Object.assign(this.selectedUser, this.formData);
      this.closeModal();
    }
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    Object.keys(this.dropdownStates).forEach(k => this.dropdownStates[k] = false);
  }
}