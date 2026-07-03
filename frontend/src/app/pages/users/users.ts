import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Registrar' | 'Designer' | 'Viewer';
  status: 'Active' | 'Inactive';
  lastActive: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  users: User[] = [
    { id: 'U-1001', name: 'Maria Abad', email: 'm.abad@school.edu', role: 'Admin', status: 'Active', lastActive: 'Jun 15, 2026 - 9:42 AM' },
    { id: 'U-1002', name: 'Jose Reyes', email: 'j.reyes@school.edu', role: 'Registrar', status: 'Active', lastActive: 'Jun 14, 2026 - 2:15 PM' },
    { id: 'U-1003', name: 'Ana Lim', email: 'a.lim@school.edu', role: 'Designer', status: 'Active', lastActive: 'Jun 13, 2026 - 10:00 AM' },
    { id: 'U-1004', name: 'Carlo Ramos', email: 'c.ramos@school.edu', role: 'Viewer', status: 'Inactive', lastActive: 'May 28, 2026 - 4:00 PM' },
    { id: 'U-1005', name: 'Sofia Garcia', email: 's.garcia@school.edu', role: 'Registrar', status: 'Active', lastActive: 'Jun 15, 2026 - 8:30 AM' },
  ];

  roleOptions = ['Admin', 'Registrar', 'Designer', 'Viewer'];
  statusOptions = ['Active', 'Inactive'];
  selectedRoles = new Set<string>();
  selectedStatuses = new Set<string>();
  searchTerm = '';

  dropdownStates: { [key: string]: boolean } = { role: false, status: false };
  modalState: 'closed' | 'add' | 'edit' | 'deactivate' = 'closed';
  selectedUser: User | null = null;
  formData: Partial<User> = {};

  get filtered(): User[] {
    return this.users.filter(u => {
      const matchSearch = !this.searchTerm || u.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || u.email.includes(this.searchTerm);
      const matchRole = this.selectedRoles.size === 0 || this.selectedRoles.has(u.role);
      const matchStatus = this.selectedStatuses.size === 0 || this.selectedStatuses.has(u.status);
      return matchSearch && matchRole && matchStatus;
    });
  }

  toggleDropdown(type: string, e: Event): void {
    e.stopPropagation();
    Object.keys(this.dropdownStates).forEach(k => this.dropdownStates[k] = false);
    this.dropdownStates[type] = !this.dropdownStates[type];
  }

  onDropdownPanelClick(event: Event): void {
    event.stopPropagation();
  }

  toggleFilter(type: 'role' | 'status', value: string): void {
    const set = type === 'role' ? this.selectedRoles : this.selectedStatuses;
    set.has(value) ? set.delete(value) : set.add(value);
  }

  clearFilter(type: 'role' | 'status'): void {
    if (type === 'role') this.selectedRoles.clear();
    else this.selectedStatuses.clear();
  }

  getLabel(type: 'role' | 'status', fallback: string): string {
    const set = type === 'role' ? this.selectedRoles : this.selectedStatuses;
    if (set.size === 0) return fallback;
    if (set.size === 1) return `${fallback}: ${Array.from(set)[0]}`;
    return `${fallback}: ${set.size} selected`;
  }

  openAddModal(): void {
    this.selectedUser = null;
    this.formData = { role: 'Registrar', status: 'Active' };
    this.modalState = 'add';
  }

  openEditModal(user: User): void {
    this.selectedUser = user;
    this.formData = { ...user };
    this.modalState = 'edit';
  }

  openDeactivateModal(user: User): void {
    this.selectedUser = user;
    this.modalState = 'deactivate';
  }

  closeModal(): void {
    this.modalState = 'closed';
  }

  saveUser(): void {
    if (!this.formData.name?.trim() || !this.formData.email?.trim()) return;

    if (this.modalState === 'add') {
      this.users.unshift({
        id: `U-${Date.now()}`,
        name: this.formData.name.trim(),
        email: this.formData.email.trim(),
        role: (this.formData.role || 'Registrar') as any,
        status: (this.formData.status || 'Active') as any,
        lastActive: 'Just now',
      });
    } else if (this.modalState === 'edit' && this.selectedUser) {
      Object.assign(this.selectedUser, this.formData);
    }
    this.closeModal();
  }

  toggleStatus(): void {
    if (this.selectedUser) {
      this.selectedUser.status = this.selectedUser.status === 'Active' ? 'Inactive' : 'Active';
    }
    this.closeModal();
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    Object.keys(this.dropdownStates).forEach(k => this.dropdownStates[k] = false);
  }
}
