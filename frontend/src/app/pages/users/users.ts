import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
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

type SortColumn = 'name' | 'role' | 'schoolName';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 10;

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

  schools = SEED_SCHOOLS;

  roleOptions: UserRole[] = ['ROLE_ADMIN', 'ROLE_K12', 'ROLE_COLLEGE', 'ROLE_ADMISSIONS'];
  roleLabels = ROLE_LABELS;

  selectedRoles = new Set<UserRole>();
  selectedSchools = new Set<string>();
  searchTerm = '';

  sortColumn: SortColumn = 'name';
  sortDirection: SortDirection = 'asc';

  currentPage = 1;
  pageSize = PAGE_SIZE;

  dropdownStates: { [key: string]: boolean } = { role: false, school: false };

  modalState: 'closed' | 'add' | 'edit' = 'closed';
  selectedUser: AdminUser | null = null;
  formData: Partial<AdminUser> & { password?: string } = {};
  saveError: string | null = null;
  saving = false;

  resetPasswordOpen = false;
  resetPasswordUser: AdminUser | null = null;
  resetPasswordValue = '';
  resetPasswordError: string | null = null;
  resetPasswordSaving = false;

  deleteModalOpen = false;
  userToDelete: AdminUser | null = null;
  deleteError: string | null = null;
  deleting = false;

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  // Runs `fn` inside Angular's zone and then forces a change-detection
  // pass. Some HTTP calls in AuthService resolve outside the Angular
  // zone (e.g. via native fetch instead of HttpClient), so without this
  // the UI would silently go stale until an unrelated event (like a
  // click anywhere on the page) happened to trigger the next CD cycle.
  private runInZone(fn: () => void): void {
    this.ngZone.run(() => {
      fn();
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.loading = true;
    this.error = null;
    this.authService.getUsers().subscribe({
      next: (users) => this.runInZone(() => {
        this.users = users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          schoolId: u.schoolId,
          schoolName: u.schoolName,
        }));
        this.loading = false;
      }),
      error: (err) => this.runInZone(() => {
        console.error('Failed to fetch users:', err);
        this.error = 'Failed to load users. Please try again.';
        this.loading = false;
      }),
    });
  }

  get filtered(): AdminUser[] {
    const q = this.searchTerm.toLowerCase();
    const result = this.users.filter(u => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = this.selectedRoles.size === 0 || this.selectedRoles.has(u.role);
      const matchSchool = this.selectedSchools.size === 0 || this.selectedSchools.has(u.schoolId);
      return matchSearch && matchRole && matchSchool;
    });

    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return result.sort((a, b) => {
      const av = this.sortColumn === 'name' ? a.name
        : this.sortColumn === 'role' ? this.roleLabel(a.role)
        : (a.schoolName ?? '');
      const bv = this.sortColumn === 'name' ? b.name
        : this.sortColumn === 'role' ? this.roleLabel(b.role)
        : (b.schoolName ?? '');
      return av.localeCompare(bv) * dir;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedUsers(): AdminUser[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  toggleSort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }

  initials(name: string): string {
    const words = name.trim().replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  roleLabel(role: UserRole): string {
    return this.roleLabels[role] ?? role;
  }

  roleBadgeClass(role: UserRole): string {
    return 'role-' + role.replace('ROLE_', '').toLowerCase();
  }

  isSelf(user: AdminUser): boolean {
    return user.email === this.authService.getCurrentEmail();
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

  toggleRoleFilter(role: UserRole): void {
    this.selectedRoles.has(role) ? this.selectedRoles.delete(role) : this.selectedRoles.add(role);
    this.currentPage = 1;
  }

  clearRoleFilter(): void {
    this.selectedRoles.clear();
    this.currentPage = 1;
  }

  getRoleLabel(): string {
    if (this.selectedRoles.size === 0) return 'Role';
    if (this.selectedRoles.size === 1) return `Role: ${this.roleLabel(Array.from(this.selectedRoles)[0])}`;
    return `Role: ${this.selectedRoles.size} selected`;
  }

  toggleSchoolFilter(schoolId: string): void {
    this.selectedSchools.has(schoolId) ? this.selectedSchools.delete(schoolId) : this.selectedSchools.add(schoolId);
    this.currentPage = 1;
  }

  clearSchoolFilter(): void {
    this.selectedSchools.clear();
    this.currentPage = 1;
  }

  getSchoolLabel(): string {
    if (this.selectedSchools.size === 0) return 'School';
    if (this.selectedSchools.size === 1) {
      const school = this.schools.find(s => s.id === Array.from(this.selectedSchools)[0]);
      return `School: ${school?.name ?? '1 selected'}`;
    }
    return `School: ${this.selectedSchools.size} selected`;
  }

  get isFiltering(): boolean {
    return !!this.searchTerm.trim() || this.selectedRoles.size > 0 || this.selectedSchools.size > 0;
  }

  get tableHeading(): string {
    return this.isFiltering ? `Results (${this.filtered.length})` : `Recent Users (${this.filtered.length})`;
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
    this.saving = false;
  }

  saveUser(): void {
    if (!this.formData.name?.trim() || !this.formData.email?.trim() || !this.formData.role || !this.formData.schoolId) {
      this.saveError = 'Please fill in all fields.';
      return;
    }

    this.saving = true;

    if (this.modalState === 'add') {
      if (!this.formData.password?.trim()) {
        this.saveError = 'Please set a temporary password.';
        this.saving = false;
        return;
      }

      this.authService.createUser({
        name: this.formData.name.trim(),
        email: this.formData.email.trim(),
        password: this.formData.password.trim(),
        role: this.formData.role,
        school: { id: this.formData.schoolId },
      }).subscribe({
        next: (created) => this.runInZone(() => {
          this.users.unshift({
            id: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
            schoolId: created.schoolId,
            schoolName: created.schoolName,
          });
          this.closeModal();
        }),
        error: (err) => this.runInZone(() => {
          console.error('Failed to create user:', err);
          this.saveError = 'Failed to create user. Please try again.';
          this.saving = false;
        }),
      });
    } else if (this.modalState === 'edit' && this.selectedUser) {
      const updates: Record<string, string> = {
        name: this.formData.name.trim(),
        email: this.formData.email.trim(),
        role: this.formData.role,
        schoolId: this.formData.schoolId,
      };

      this.authService.updateUser(this.selectedUser.id, updates).subscribe({
        next: (updated) => this.runInZone(() => {
          Object.assign(this.selectedUser!, {
            name: updated.name,
            email: updated.email,
            role: updated.role,
            schoolId: updated.schoolId,
            schoolName: updated.schoolName,
          });
          this.closeModal();
        }),
        error: (err) => this.runInZone(() => {
          console.error('Failed to update user:', err);
          this.saveError = 'Failed to update user. Please try again.';
          this.saving = false;
        }),
      });
    }
  }

  openResetPasswordModal(user: AdminUser): void {
    this.resetPasswordUser = user;
    this.resetPasswordValue = '';
    this.resetPasswordError = null;
    this.resetPasswordOpen = true;
  }

  closeResetPasswordModal(): void {
    this.resetPasswordOpen = false;
    this.resetPasswordUser = null;
    this.resetPasswordError = null;
    this.resetPasswordSaving = false;
  }

  confirmResetPassword(): void {
    if (!this.resetPasswordValue.trim() || this.resetPasswordValue.trim().length < 8) {
      this.resetPasswordError = 'Password must be at least 8 characters.';
      return;
    }
    if (!this.resetPasswordUser) return;

    this.resetPasswordSaving = true;
    this.authService.updateUser(this.resetPasswordUser.id, { password: this.resetPasswordValue.trim() }).subscribe({
      next: () => this.runInZone(() => {
        this.closeResetPasswordModal();
      }),
      error: (err) => this.runInZone(() => {
        console.error('Failed to reset password:', err);
        this.resetPasswordError = 'Failed to reset password. Please try again.';
        this.resetPasswordSaving = false;
      }),
    });
  }

  openDeleteModal(user: AdminUser): void {
    if (this.isSelf(user)) return;
    this.userToDelete = user;
    this.deleteError = null;
    this.deleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.deleteModalOpen = false;
    this.userToDelete = null;
    this.deleteError = null;
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.userToDelete) return;
    this.deleting = true;

    this.authService.deleteUser(this.userToDelete.id).subscribe({
      next: () => this.runInZone(() => {
        this.users = this.users.filter(u => u.id !== this.userToDelete!.id);
        if (this.pagedUsers.length === 0 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.closeDeleteModal();
      }),
      error: (err) => this.runInZone(() => {
        console.error('Failed to delete user:', err);
        this.deleteError = 'Failed to delete user. Please try again.';
        this.deleting = false;
      }),
    });
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    Object.keys(this.dropdownStates).forEach(k => this.dropdownStates[k] = false);
  }
}