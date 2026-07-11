import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import {
  StudentSummary,
  StudentType,
  typeFilterFields,
  typeColumns,
  FilterFieldConfig,
  ColumnConfig,
  getStatusBadgeClass,
} from '../../services/student.model';

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

  // ── Type tabs — no "ALL"; columns genuinely differ per type ──
  selectedType: StudentType = 'K12';

  // ── Status filter (value-based multi-select) ──
  // NOTE: Active/Enrolled currently overlap conceptually — see student.model.ts note.
  statusOptions = ['ACTIVE', 'ENROLLED', 'DROPPED', 'PENDING', 'INACTIVE'];
  selectedStatuses = new Set<string>();
  statusDropdownOpen = false;

  // ── Search field scope: which extra fields the search term matches against ──
  searchTerm = '';
  searchFieldsOpen = false;
  enabledSearchFields = new Set<string>();

  // ── Column sort — null means default (most recently added first) ──
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  pageSize = 16;
  totalPages = 1;
  totalPagesArray: number[] = [];

  // Exposed to template for status badge coloring
  getStatusBadgeClass = getStatusBadgeClass;

  constructor(private studentService: StudentService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.resetSearchFieldsForType();
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

  // ── Columns / search fields for the active type ──
  get columns(): ColumnConfig[] {
    return typeColumns[this.selectedType];
  }

  get searchFieldOptions(): FilterFieldConfig[] {
    return typeFilterFields[this.selectedType];
  }

  private resetSearchFieldsForType(): void {
    this.enabledSearchFields = new Set(this.searchFieldOptions.map(f => f.key));
  }

  // ── Type tabs ──
  selectType(type: StudentType): void {
    if (this.selectedType === type) return;
    this.selectedType = type;
    this.currentPage = 1;
    this.sortColumn = null; // previous sort column may not exist on the new type's columns
    this.resetSearchFieldsForType();
    this.applyFiltersAndCalculations();
  }

  // ── Status dropdown ──
  toggleStatusDropdown(event: Event): void {
    event.stopPropagation();
    const next = !this.statusDropdownOpen;
    this.closeAllDropdowns();
    this.statusDropdownOpen = next;
  }

  onStatusToggle(value: string): void {
    if (this.selectedStatuses.has(value)) this.selectedStatuses.delete(value);
    else this.selectedStatuses.add(value);
    this.currentPage = 1;
    this.applyFiltersAndCalculations();
  }

  clearStatusFilter(): void {
    this.selectedStatuses.clear();
    this.currentPage = 1;
    this.applyFiltersAndCalculations();
  }

  getStatusLabel(): string {
    if (this.selectedStatuses.size === 0) return 'Status';
    if (this.selectedStatuses.size === 1) return `Status: ${Array.from(this.selectedStatuses)[0]}`;
    return `Status: ${this.selectedStatuses.size} selected`;
  }

  // ── Search field scope dropdown ──
  toggleSearchFieldsPanel(event: Event): void {
    event.stopPropagation();
    const next = !this.searchFieldsOpen;
    this.closeAllDropdowns();
    this.searchFieldsOpen = next;
  }

  onSearchFieldToggle(key: string): void {
    if (this.enabledSearchFields.has(key)) this.enabledSearchFields.delete(key);
    else this.enabledSearchFields.add(key);
    this.applyFiltersAndCalculations();
  }

  isSearchFieldEnabled(key: string): boolean {
    return this.enabledSearchFields.has(key);
  }

  onSearchChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.currentPage = 1;
    this.applyFiltersAndCalculations();
  }

  // ── Column sort ──
  // 3-state cycle per column: ascending -> descending -> back to default (recency)
  toggleSort(key: string): void {
    if (this.sortColumn !== key) {
      this.sortColumn = key;
      this.sortDirection = 'asc';
    } else if (this.sortDirection === 'asc') {
      this.sortDirection = 'desc';
    } else {
      this.sortColumn = null; // third click resets to default recency order
    }
    this.applyFiltersAndCalculations();
  }

  get tableHeading(): string {
    if (this.selectedType === 'ADMISSIONS') return 'Recent Students';

    const isFiltered = !!this.searchTerm || this.selectedStatuses.size > 0 || this.sortColumn !== null;
    const count = this.filteredStudents.length;

    return isFiltered
      ? `Results (${count})`
      : `Recent Students (${count})`;
  }

  private closeAllDropdowns(): void {
    this.statusDropdownOpen = false;
    this.searchFieldsOpen = false;
  }

  onPanelClick(event: Event): void {
    event.stopPropagation();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAllDropdowns();
  }

  private applyFiltersAndCalculations(): void {
    if (this.selectedType === 'ADMISSIONS') {
      this.filteredStudents = [];
      this.totalPages = 1;
      this.totalPagesArray = [1];
      this.pagedStudents = [];
      return;
    }

    const query = this.searchTerm;

    this.filteredStudents = this.allStudents.filter(student => {
      const matchesType = student.studentType === this.selectedType;

      const matchesCore =
        student.name.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query);

      const matchesExtraField = this.searchFieldOptions.some(field =>
        this.enabledSearchFields.has(field.key) &&
        (field.getValue(student) ?? '').toLowerCase().includes(query)
      );

      const matchesSearch = !query || matchesCore || matchesExtraField;
      const matchesStatus = this.selectedStatuses.size === 0 || this.selectedStatuses.has(student.status);

      return matchesType && matchesSearch && matchesStatus;
    });

    this.filteredStudents = this.applySort(this.filteredStudents);

    this.totalPages = Math.ceil(this.filteredStudents.length / this.pageSize) || 1;
    this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePagedSlice();
  }

  private applySort(list: StudentSummary[]): StudentSummary[] {
    if (!this.sortColumn) {
      // Default: most recently added first. Falls back to name if createdAt is missing.
      return [...list].sort((a, b) => {
        if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
        return a.name.localeCompare(b.name);
      });
    }

    const col = this.columns.find(c => c.key === this.sortColumn);
    if (!col) return list;

    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...list].sort((a, b) =>
      col.getValue(a).localeCompare(col.getValue(b), undefined, { numeric: true }) * dir
    );
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedSlice();
  }

  private updatePagedSlice(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedStudents = this.filteredStudents.slice(start, start + this.pageSize);
  }
}