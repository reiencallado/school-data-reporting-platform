import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// import { TemplateService } from '../../services/template.service';
// import { StudentService }  from '../../services/student.service';
// import { ReportService }   from '../../services/report.service';

// ── Interfaces ───────────────────────────────────────────────
export interface ReportTemplate {
  id:       string;
  name:     string;
  lastUsed: string;
}

export interface StudentRow {
  id:         string;
  name:       string;
  gradeLevel: number;
  strand:     string;
  section:    string;
  status:     string;
}

export interface ReportDetails {
  academicYear:   string;
  term:           string;
  issuanceDay:    string;
  issuanceMonth:  string;
  issuanceYear:   string;
  signatoryName:  string;
  signatoryTitle: string;
  purpose:        string;
  remarks:        string;
}

@Component({
  selector: 'app-generate-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-report.html',
  styleUrl: './generate-report.css',
})
export class GenerateReport implements OnInit {

  // ── Stepper ──────────────────────────────────────────────
  steps = ['Select template', 'Select students', 'Fill report details', 'Confirm & Submit'];
  currentStep = 1;

  // ── Step 1: Template ─────────────────────────────────────
  templateSearch = '';
  selectedTemplate: ReportTemplate | null = null;

  // TODO: replace with TemplateService.getAll()
  templates: ReportTemplate[] = [
    { id: '1', name: 'Certificate of Enrollment',  lastUsed: 'Jun 13, 2026' },
    { id: '2', name: 'Certificate of Enrollment',  lastUsed: 'Jun 13, 2026' },
    { id: '3', name: 'Certificate of Enrollment',  lastUsed: 'Jun 13, 2026' },
    { id: '4', name: 'Certificate of Enrollment',  lastUsed: 'Jun 13, 2026' },
    { id: '5', name: 'Certificate of Enrollment',  lastUsed: 'Jun 13, 2026' },
    { id: '6', name: 'Certificate of Enrollment',  lastUsed: 'Jun 13, 2026' },
    { id: '7', name: 'Certificate of Enrollment',  lastUsed: 'Jun 13, 2026' },
    { id: '8', name: 'Certificate of Enrollment',  lastUsed: 'Jun 13, 2026' },
  ];

  get filteredTemplates(): ReportTemplate[] {
    const q = this.templateSearch.toLowerCase();
    return q
      ? this.templates.filter(t => t.name.toLowerCase().includes(q))
      : this.templates;
  }

  selectTemplate(t: ReportTemplate): void {
    this.selectedTemplate = this.selectedTemplate?.id === t.id ? null : t;
  }

  // ── Step 2: Students ─────────────────────────────────────
  studentSearch   = '';
  selectedStudents = new Set<string>();
  currentPage  = 1;
  totalPages   = 10;
  pageNumbers  = [1, 2, 3, 4, 5];

  // TODO: replace with StudentService.getAll() + pagination
  students: StudentRow[] = Array.from({ length: 10 }, (_, i) => ({
    id:         '12XXXXX',
    name:       'John Doe',
    gradeLevel: 12,
    strand:     'STEM',
    section:    'St. Jude',
    status:     'Active',
  }));

  get allSelected(): boolean {
    return this.students.length > 0 &&
           this.students.every(s => this.selectedStudents.has(s.id));
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.students.forEach(s => this.selectedStudents.add(s.id));
    } else {
      this.students.forEach(s => this.selectedStudents.delete(s.id));
    }
    // trigger change detection
    this.selectedStudents = new Set(this.selectedStudents);
  }

  toggleStudent(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.selectedStudents.add(id);
    else         this.selectedStudents.delete(id);
    this.selectedStudents = new Set(this.selectedStudents);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    // TODO: fetch page from StudentService
  }

  // ── Step 3: Report Details ───────────────────────────────
  reportDetails: ReportDetails = {
    academicYear:   '2025 - 2026',
    term:           'Term 1',
    issuanceDay:    '',
    issuanceMonth:  '',
    issuanceYear:   '',
    signatoryName:  '',
    signatoryTitle: '',
    purpose:        '',
    remarks:        '',
  };

  // ── Navigation ───────────────────────────────────────────
  constructor(private router: Router) {}

  ngOnInit(): void {}

  goToStep(n: number): void {
    if (n >= 1 && n <= this.steps.length) {
      this.currentStep = n;
    }
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1: return !!this.selectedTemplate;
      case 2: return this.selectedStudents.size > 0;
      case 3: return !!this.reportDetails.academicYear && !!this.reportDetails.signatoryName;
      case 4: return true;
      default: return false;
    }
  }

  onNext(): void {
    if (!this.canProceed()) return;
    if (this.currentStep < 4) {
      this.currentStep++;
    } else {
      this.generate();
    }
  }

  onBack(): void {
    if (this.currentStep === 1) {
      this.router.navigate(['/dashboard']);
    } else {
      this.currentStep--;
    }
  }

  generate(): void {
    // TODO: call ReportService.generate({ template, students, details })
    console.log('Generating report…', {
      template: this.selectedTemplate,
      students: Array.from(this.selectedStudents),
      details:  this.reportDetails,
    });
    // On success -> navigate to archives or show toast
    // this.router.navigate(['/reports/archives']);
  }
}