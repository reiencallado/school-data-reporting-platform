import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportTemplateService } from '../../services/report-template.service';
import { ReportTemplate as ApiReportTemplate } from '../../services/report-template.model';

export interface ReportTemplate {
  id:            string;
  name:          string;
  lastUsed:      string;
  thumbnailUrl?: string;
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

  steps = ['Select template', 'Select students', 'Fill report details', 'Confirm & Submit'];
  currentStep = 1;

  // ── Step 1: Template ─────────────────────────────────────
  templateSearch = '';
  selectedTemplate: ReportTemplate | null = null;
  templates: ReportTemplate[] = [];
  templatesLoading = false;
  templatesError: string | null = null;

  get filteredTemplates(): ReportTemplate[] {
    const q = this.templateSearch.toLowerCase();
    return q
      ? this.templates.filter(t => t.name.toLowerCase().includes(q))
      : this.templates;
  }

  fetchTemplates(): void {
    this.templatesLoading = true;
    this.templatesError = null;

    this.reportTemplateService.getAllTemplates().subscribe({
      next: (data: ApiReportTemplate[]) => {
        this.templates = data.map(t => ({
          id: t.id ?? '',
          name: t.name,
          lastUsed: t.lastOpenedAt
            ? new Date(t.lastOpenedAt).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })
            : 'Never opened',
          thumbnailUrl: t.thumbnailUrl,
        }));
        this.templatesLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch report templates:', err);
        this.templatesError = 'Could not load templates. Please try again.';
        this.templatesLoading = false;
      },
    });
  }

  selectTemplate(t: ReportTemplate): void {
    this.selectedTemplate = this.selectedTemplate?.id === t.id ? null : t;
  }

  // ── Step 2: Students ─────────────────────────────────────
  studentSearch   = '';
  selectedStudents = new Set<string>();
  currentPage  = 1;
  studentsPerPage = 10;
  allStudents: StudentRow[] = Array.from({ length: 100 }, (_, i) => ({
    id:         `STU${1000 + i}`,
    name:       `Student ${i + 1}`,
    gradeLevel: 11 + (i % 2),
    strand:     i % 2 === 0 ? 'STEM' : 'HUMSS',
    section:    i % 3 === 0 ? 'St. Jude' : 'St. Teresa',
    status:     i % 4 === 0 ? 'Inactive' : 'Active',
  }));
  totalPages   = Math.ceil(this.allStudents.length / this.studentsPerPage);
  pageNumbers  = [1, 2, 3, 4, 5];

  get pagedStudents(): StudentRow[] {
    const start = (this.currentPage - 1) * this.studentsPerPage;
    return this.allStudents.slice(start, start + this.studentsPerPage);
  }

  get allSelected(): boolean {
    return this.allStudents.length > 0 &&
           this.allStudents.every(s => this.selectedStudents.has(s.id));
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.allStudents.forEach(s => this.selectedStudents.add(s.id));
    else this.allStudents.forEach(s => this.selectedStudents.delete(s.id));
    this.selectedStudents = new Set(this.selectedStudents);
  }

  toggleStudent(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.selectedStudents.add(id);
    else this.selectedStudents.delete(id);
    this.selectedStudents = new Set(this.selectedStudents);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
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

  constructor(
    private router: Router,
    private reportTemplateService: ReportTemplateService,
  ) {}

  ngOnInit(): void {
    this.fetchTemplates();
  }

  goToStep(n: number): void {
    if (n >= 1 && n <= this.steps.length) this.currentStep = n;
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
    if (this.currentStep < 4) this.currentStep++;
    else this.generate();
  }

  onBack(): void {
    if (this.currentStep === 1) this.router.navigate(['/dashboard']);
    else this.currentStep--;
  }

  generate(): void {
    console.log('Generating report…', {
      template: this.selectedTemplate,
      students: Array.from(this.selectedStudents),
      details:  this.reportDetails,
    });
  }
}