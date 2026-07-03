import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

// values are hard-coded still

interface StudentRosterItem {
  studentId: string;
  name: string;
  gradeLevel: number;
  strand: string;
  section: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './students.html',
  styleUrl: './students.css'
})
export class Students implements OnInit {

  // ── DATA STORE MATRICES ──────────────────────────────────────
  allStudents: StudentRosterItem[] = [];
  filteredStudents: StudentRosterItem[] = [];
  pagedStudents: StudentRosterItem[] = [];

  // ── MULTI-SELECT OPTION BASES ─────────────────────────────
  gradeOptions = ['11', '12'];
  strandOptions = ['STEM', 'ABM', 'HUMSS'];
  sectionOptions = ['St. Jude', 'St. Thomas', 'St. Mutien-Marie', 'St. La Salle', 'St. Augustine', 'St. Benilde'];
  statusOptions = ['Active', 'Inactive'];

  // ── STATE TRACKING SETS ──────────────────────────────────
  selectedGrades = new Set<string>();
  selectedStrands = new Set<string>();
  selectedSections = new Set<string>();
  selectedStatuses = new Set<string>();

  // ── PANEL VISIBILITY METRICS ─────────────────────────────
  dropdownStates: { [key: string]: boolean } = {
    grade: false,
    strand: false,
    section: false,
    status: false
  };

  // ── PAGINATION ENGINE STATE ──────────────────────────────────
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalPagesArray: number[] = [];
  searchTerm = '';

  // ── IFECYCLE INITIALIZATION ────────────────────────────────
  ngOnInit(): void {
    this.generateMockRosterData();
    this.applyFiltersAndCalculations();
  }

  // ── INTERACTIVE DROPDOWN LAYER CONTROLS ──────────────────
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

  // ── CHECKBOX TOGGLE HANDLER ──────────────────────────────
  onCheckboxToggle(filterType: 'grade' | 'strand' | 'section' | 'status', value: string): void {
    let targetSet: Set<string>;
    
    if (filterType === 'grade') targetSet = this.selectedGrades;
    else if (filterType === 'strand') targetSet = this.selectedStrands;
    else if (filterType === 'section') targetSet = this.selectedSections;
    else targetSet = this.selectedStatuses;

    if (targetSet.has(value)) {
      targetSet.delete(value);
    } else {
      targetSet.add(value);
    }

    this.currentPage = 1; // Snaps view alignment back to page 1 upon configuration shifts
    this.applyFiltersAndCalculations();
  }

  clearFilter(filterType: 'grade' | 'strand' | 'section' | 'status'): void {
    if (filterType === 'grade') this.selectedGrades.clear();
    else if (filterType === 'strand') this.selectedStrands.clear();
    else if (filterType === 'section') this.selectedSections.clear();
    else this.selectedStatuses.clear();

    this.currentPage = 1;
    this.applyFiltersAndCalculations();
  }

  // ── BUTTON LABEL STRING GENERATOR ────────────────────────
  getDropdownLabel(filterType: 'grade' | 'strand' | 'section' | 'status', fallbackLabel: string): string {
    let targetSet: Set<string>;
    
    if (filterType === 'grade') targetSet = this.selectedGrades;
    else if (filterType === 'strand') targetSet = this.selectedStrands;
    else if (filterType === 'section') targetSet = this.selectedSections;
    else targetSet = this.selectedStatuses;

    if (targetSet.size === 0) return fallbackLabel;
    if (targetSet.size === 1) return `${fallbackLabel}: ${Array.from(targetSet)[0]}`;
    return `${fallbackLabel}: ${targetSet.size} selected`;
  }

  // ── TEXT INPUT SEARCH CAPTURES ───────────────────────────────
  onSearchChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm = inputElement.value.toLowerCase();
    this.currentPage = 1;
    this.applyFiltersAndCalculations();
  }

  // ── CORE CROSS-FILTERING ENGINE ───────────────────────────────
  private applyFiltersAndCalculations(): void {
    this.filteredStudents = this.allStudents.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(this.searchTerm) || 
                            student.studentId.toLowerCase().includes(this.searchTerm);
                            
      // Evaluates matching conditions over active parameter state structures
      const matchesGrade = this.selectedGrades.size === 0 || this.selectedGrades.has(student.gradeLevel.toString());
      const matchesStrand = this.selectedStrands.size === 0 || this.selectedStrands.has(student.strand);
      const matchesSection = this.selectedSections.size === 0 || this.selectedSections.has(student.section);
      const matchesStatus = this.selectedStatuses.size === 0 || this.selectedStatuses.has(student.status);

      return matchesSearch && matchesGrade && matchesSection && matchesStrand && matchesStatus;
    });

    this.totalPages = Math.ceil(this.filteredStudents.length / this.pageSize) || 1;
    this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePagedSlice();
  }

  // ── PAGINATION NAVIGATION CONTROLS ────────────────────────────
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

  // ── MOCK DATA INITIALIZATION ─────────────────────────────────
  private generateMockRosterData(): void {
  const recordsCount = 25;
  
  const firstNames = [
    'Juan', 'Maria', 'Jose', 'Mark', 'Angela', 'Paolo', 'Gabriel', 
    'Samantha', 'Christian', 'Dominic', 'Alyssa', 'Patricia', 'Anton', 'Miguel'
  ];
  
  const lastNames = [
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Del Rosario', 'Aquino', 
    'Villanueva', 'Mercado', 'Ramos', 'Mendoza', 'Torres', 'Garcia', 'Dela Cruz'
  ];

  const strands = ['STEM', 'ABM', 'HUMSS'];
  const sections11 = ['St. Benilde', 'St. La Salle', 'St. Mutien-Marie'];
  const sections12 = ['St. Jude', 'St. Thomas', 'St. Augustine'];

  for (let i = 1; i <= recordsCount; i++) {
    // 1. Generate clean, logical, unique 8-digit student IDs (e.g., 12600001, 12600002...)
    const studentIdString = (12600000 + i).toString();

    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${randomFirstName} ${randomLastName}`;

    const gradeLevel = i % 2 === 0 ? 11 : 12;

    const strand = strands[i % strands.length];
    const section = gradeLevel === 11 
      ? sections11[i % sections11.length] 
      : sections12[i % sections12.length];

    const status: 'Active' | 'Inactive' = (i === 6 || i === 13 || i === 20) ? 'Inactive' : 'Active';

    this.allStudents.push({
      studentId: studentIdString,
      name: fullName,
      gradeLevel: gradeLevel,
      strand: strand,
      section: section,
      status: status
    });
  }
}
}