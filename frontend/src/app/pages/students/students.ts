import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import { StudentSummary, StudentType } from '../../services/student.model';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './students.html',
  styleUrl: './students.css'
})
export class Students implements OnInit {

  allStudents: StudentSummary[] = [];
  filteredStudents: StudentSummary[] = [];
  pagedStudents: StudentSummary[] = [];

  loading = false;
  error: string | null = null;

  typeOptions: StudentType[] = ['K12', 'COLLEGE'];
  statusOptions = ['ACTIVE', 'INACTIVE'];

  selectedTypes = new Set<string>();
  selectedStatuses = new Set<string>();

  dropdownStates: { [key: string]: boolean } = {
    type: false,
    status: false
  };

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalPagesArray: number[] = [];
  searchTerm = '';

  constructor(private studentService: StudentService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchStudents();
  }

  fetchStudents(): void {
    this.loading = true;
    this.error = null;

    this.studentService.getAllStudents().subscribe({
      next: (data) => {
        this.allStudents = data;
        this.loading = false;
        this.applyFiltersAndCalculations();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch students:', err);
        this.error = 'Could not load students. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleDropdown(type: string, event: Event): void {
    event.stopPropagation();
    const targetState = !this.dropdownStates[type];
    this.closeAllDropdowns();
    this.dropdownStates[type] = targetState;
  }

  closeDropdown(type: string): void {
    this.dropdownStates[type] = false;
  }

  private closeAllDropdowns(): void {
    Object.keys(this.dropdownStates).forEach(key => this.dropdownStates[key] = false);
  }

  onCheckboxClick(event: Event): void {
    event.stopPropagation();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAllDropdowns();
  }

  onCheckboxToggle(filterType: 'type' | 'status', value: string): void {
    const targetSet = filterType === 'type' ? this.selectedTypes : this.selectedStatuses;
    if (targetSet.has(value)) targetSet.delete(value);
    else targetSet.add(value);

    this.currentPage = 1;
    this.applyFiltersAndCalculations();
  }

  clearFilter(filterType: 'type' | 'status'): void {
    if (filterType === 'type') this.selectedTypes.clear();
    else this.selectedStatuses.clear();

    this.currentPage = 1;
    this.applyFiltersAndCalculations();
  }

  getDropdownLabel(filterType: 'type' | 'status', fallbackLabel: string): string {
    const targetSet = filterType === 'type' ? this.selectedTypes : this.selectedStatuses;
    if (targetSet.size === 0) return fallbackLabel;
    if (targetSet.size === 1) return `${fallbackLabel}: ${Array.from(targetSet)[0]}`;
    return `${fallbackLabel}: ${targetSet.size} selected`;
  }

  onSearchChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm = inputElement.value.toLowerCase();
    this.currentPage = 1;
    this.applyFiltersAndCalculations();
  }

  private applyFiltersAndCalculations(): void {
    this.filteredStudents = this.allStudents.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(this.searchTerm) ||
        student.studentId.toLowerCase().includes(this.searchTerm);

      const matchesType = this.selectedTypes.size === 0 || this.selectedTypes.has(student.studentType);
      const matchesStatus = this.selectedStatuses.size === 0 || this.selectedStatuses.has(student.status);

      return matchesSearch && matchesType && matchesStatus;
    });

    this.totalPages = Math.ceil(this.filteredStudents.length / this.pageSize) || 1;
    this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePagedSlice();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedSlice();
  }

  private updatePagedSlice(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedStudents = this.filteredStudents.slice(startIndex, endIndex);
  }

  getGradeOrYear(s: StudentSummary): string {
    return (s.studentType === 'K12' ? s.grade : s.yearLevel) || '—';
  }

  getStrandOrProgram(s: StudentSummary): string {
    return (s.studentType === 'K12' ? s.strand : s.course) || '—';
  }

  getSection(s: StudentSummary): string {
    return s.studentType === 'K12' ? (s.section || '—') : '—';
  }
}