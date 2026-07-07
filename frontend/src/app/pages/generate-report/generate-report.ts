import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { generate } from '@pdfme/generator';
import { Template } from '@pdfme/common';

// ════════════════════════════════════════════════════════════════════
// ⚠️  THIRD-PARTY DEPENDENCY: JSZip (npm install jszip)
// ────────────────────────────────────────────────────────────────────
// Used ONLY to bundle multiple generated PDFs into a single .zip for
// client-side download in generate() below. This is a temporary,
// synchronous, client-side implementation — see the TODO on generate()
// for the planned move to an async backend job.
//
// When report generation moves server-side, the zipping will very
// likely move with it (e.g. java.util.zip / a Spring service), and
// this import + the `new JSZip()` usage inside generate() become
// dead code that can be deleted along with the `jszip` package.
//
// If you rip this out before that migration happens, just delete:
//   1. This import line
//   2. `npm uninstall jszip`
//   3. The `const zip = new JSZip();` block inside generate() below
//      (replace with whatever new bundling/upload strategy is used)
// ════════════════════════════════════════════════════════════════════
import JSZip from 'jszip';

import { ReportTemplateService } from '../../services/report-template.service';
import { ReportTemplate as ApiReportTemplate } from '../../services/report-template.model';
// TODO: Change the service and model for Students? Since data exposure for K12, College, and Admission students are different. 
// For now, just use the StudentService and StudentSummary model.
import { StudentService } from '../../services/student.service';
import { StudentSummary } from '../../services/student.model';
import { PLUGINS } from '../../pdf-designer/pdf-designer';

export interface ReportTemplate {
  id:            string;
  name:          string;
  lastUsed:      string;
  thumbnailUrl?: string;
  configuration: string;   // raw pdfme JSON — needed to actually generate PDFs
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
          configuration: t.configuration,
        }));
        this.templatesLoading = false;
      },
      error: (err: unknown) => {
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
  studentSearch    = '';
  selectedStudents = new Set<string>();
  currentPage      = 1;
  studentsPerPage  = 10;
  allStudents: StudentSummary[] = [];
  studentsLoading = false;
  studentsError: string | null = null;

  fetchStudents(): void {
    this.studentsLoading = true;
    this.studentsError = null;

    this.studentService.getAllStudents().subscribe({
      next: (data: StudentSummary[]) => {
        this.allStudents = data;
        this.studentsLoading = false;
      },
      error: (err: unknown) => {
        console.error('Failed to fetch students:', err);
        this.studentsError = 'Could not load students. Please try again.';
        this.studentsLoading = false;
      },
    });
  }

  private get searchFilteredStudents(): StudentSummary[] {
    const q = this.studentSearch.toLowerCase();
    return q
      ? this.allStudents.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q))
      : this.allStudents;
  }

  get pagedStudents(): StudentSummary[] {
    const start = (this.currentPage - 1) * this.studentsPerPage;
    return this.searchFilteredStudents.slice(start, start + this.studentsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.searchFilteredStudents.length / this.studentsPerPage) || 1;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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

  // ── Step 4: Generate ──────────────────────────────────────
  generating = false;
  generateError: string | null = null;
  generateProgress = { done: 0, total: 0 };

  constructor(
    private router: Router,
    private reportTemplateService: ReportTemplateService,
    private studentService: StudentService,
  ) {}

  ngOnInit(): void {
    this.fetchTemplates();
    this.fetchStudents();
  }

  goToStep(n: number): void {
    if (n >= 1 && n <= this.steps.length) this.currentStep = n;
  }

  // TODO: Validation should exist on the front-end?
  canProceed(): boolean {
    switch (this.currentStep) {
      case 1: return !!this.selectedTemplate;
      case 2: return this.selectedStudents.size > 0;
      case 3: return !!this.reportDetails.academicYear && !!this.reportDetails.signatoryName;
      case 4: return !this.generating;
      default: return false;
    }
  }

  onNext(): void {
    if (!this.canProceed()) return;
    if (this.currentStep < 4) this.currentStep++;
    else this.generate();
  }

  onBack(): void {
    if (this.generating) return; // don't let them navigate away mid-job
    if (this.currentStep === 1) this.router.navigate(['/dashboard']);
    else this.currentStep--;
  }

  /**
   * Best-effort match of a pdfme schema field to known report/student data.
   *
   * multiVariableText schemas store their substitutable fields in
   * `schema.variables` (an array of variable names) — NOT embedded as
   * {tokens} inside `schema.content`. `content` is itself already a JSON
   * string of variable→value pairs (pdfme's own saved defaults), and
   * `text` is just the display template for the editor UI. The correct
   * input value for this schema type is a fresh JSON string built from
   * `variables`, not a parse of `content`.
   *
   * If `variables` is empty (e.g. static text placed via this schema type
   * with nothing to substitute), the saved `content` is passed through
   * unchanged rather than treated as though it had tokens to resolve.
   *
   * For all other schema types (image, text, etc.), an unmatched field
   * name falls back to the schema's own saved `content` instead of being
   * left blank — this is what keeps static images/logos intact instead
   * of disappearing, since an Image schema with no matching input renders
   * nothing.
   */
  private buildInputsForStudent(template: Template, student: StudentSummary): Record<string, string> {
    const known: Record<string, string> = {
      academicyear:   this.reportDetails.academicYear,
      term:           this.reportDetails.term,
      issuancedate:   `${this.reportDetails.issuanceDay}/${this.reportDetails.issuanceMonth}/${this.reportDetails.issuanceYear}`,
      signatoryname:  this.reportDetails.signatoryName,
      signatorytitle: this.reportDetails.signatoryTitle,
      purpose:        this.reportDetails.purpose,
      remarks:        this.reportDetails.remarks,
      studentname:    student.name,
      name:           student.name, //bakit iba yung student meron {studentname} at {name}? Same lang sila lol
      studentid:      student.studentId,
      gradelevel:     student.grade ?? '',
      strand:         student.strand ?? '',
      section:        student.section ?? '',
      course:         student.course ?? '',
      yearlevel:      student.yearLevel ?? '',
    };

    const page: Record<string, string> = {};

    for (const row of template.schemas ?? []) {
      for (const schema of row as any[]) {
        if (!schema?.name) continue;

        if (schema.type === 'multiVariableText') {
          const variables: string[] = Array.isArray(schema.variables) ? schema.variables : [];

          if (variables.length === 0) {
            page[schema.name] = schema.content ?? '{}';
            continue;
          }

          const varMap: Record<string, string> = {};
          for (const varName of variables) {
            const key = varName.toLowerCase().replace(/[\s_-]/g, '');
            varMap[varName] = known[key] ?? '';
          }
          page[schema.name] = JSON.stringify(varMap);

        } else {
          const key = (schema.name as string).toLowerCase().replace(/[\s_-]/g, '');
          page[schema.name] = known[key] !== undefined ? known[key] : (schema.content ?? '');
        }
      }
    }

    return page;
  }

  /**
   * Synchronous, client-side, one-shot generation: builds one PDF per
   * selected student and bundles them into a single zip for download.
   *
   * TODO (future): move this to a backend job — POST the template id,
   * student ids, and report details to a /api/reports/generate endpoint,
   * get back a job id immediately, and let the job show up as a
   * "PROCESSING" row in Report Archives that flips to "DONE" with a
   * downloadUrl once the backend finishes. This synchronous version will
   * freeze the tab and hold everything in memory for large batches, which
   * is fine for now but won't scale to e.g. a few hundred students.
   */
  async generate(): Promise<void> {
    if (!this.selectedTemplate) return;

    this.generating = true;
    this.generateError = null;

    const selected = this.allStudents.filter(s => this.selectedStudents.has(s.id));
    this.generateProgress = { done: 0, total: selected.length };

    try {
      let parsedTemplate: Template;
      try {
        parsedTemplate = JSON.parse(this.selectedTemplate.configuration);
      } catch (e) {
        throw new Error('This template\u2019s layout data is corrupted and can\u2019t be used to generate reports.');
      }

      // JSZip usage — see the large comment at the top of this file if
      // this dependency is being removed/replaced.
      const zip = new JSZip();

      for (const student of selected) {
        const inputs = [this.buildInputsForStudent(parsedTemplate, student)];
        const pdfBytes = await generate({ template: parsedTemplate, inputs, plugins: PLUGINS });

        const safeName = student.name.replace(/[^a-z0-9]+/gi, '_');
        zip.file(`${safeName}_${student.studentId}.pdf`, pdfBytes);

        this.generateProgress.done++;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const safeTemplateName = this.selectedTemplate.name.replace(/[^a-z0-9]+/gi, '_');

      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTemplateName}_reports.zip`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (e: any) {
      console.error('Failed to generate reports:', e);
      this.generateError = e?.message ?? 'Something went wrong generating the reports. Please try again.';
    } finally {
      this.generating = false;
    }
  }
}