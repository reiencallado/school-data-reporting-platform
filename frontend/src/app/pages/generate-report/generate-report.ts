import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Template } from '@pdfme/common';
import { HttpClient } from '@angular/common/http';

import { ReportTemplateService } from '../../services/report-template.service';
import { ReportTemplate as ApiReportTemplate } from '../../services/report-template.model';
import { StudentService } from '../../services/student.service';
import {
  StudentSummary,
  StudentType,
  typeFilterFields,
  typeColumns,
  FilterFieldConfig,
  ColumnConfig,
  getStatusBadgeClass,
  ROLE_STUDENT_TYPE_ACCESS,
} from '../../services/student.model';
import { AuthService } from '../../services/auth.service';

export type StudentTypeFilter = StudentType | 'ALL';

export interface ReportTemplate {
  id:            string;
  name:          string;
  lastUsed:      string;
  thumbnailUrl?: string;
  configuration: string;   // raw pdfme JSON - needed to actually generate PDFs
  studentType?:  StudentType;   // ⚠️ mirror of templates.ts - not yet returned by backend for all rows
}

export interface ReportDetails {
  academicYear:   string;
  term:           string;
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

  steps = ['Select template', 'Select students', 'Review & generate'];
  currentStep = 1;

  // ── Step 1: Template ─────────────────────────────────────
  templateSearch = '';
  selectedTemplate: ReportTemplate | null = null;
  templates: ReportTemplate[] = [];
  templatesLoading = false;
  templatesError: string | null = null;

  get filteredTemplates(): ReportTemplate[] {
    const q = this.templateSearch.toLowerCase();
    return this.templates.filter(t => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q);
      // TEMP: template studentType tagging is still being rolled out
      // (backend migration + pdf-designer UI) — until that's fully in
      // place and existing templates are retagged, show every template
      // regardless of the selected K12/COLLEGE/ADMISSIONS filter instead
      // of hiding untagged ones. Restore the real check
      // (t.studentType === this.selectedType) once that's done.
      const matchesType = true;
      return matchesSearch && matchesType;
    });
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
          studentType: t.studentType,
        }));
        this.templatesLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Failed to fetch report templates:', err);
        this.templatesError = 'Could not load templates. Please try again.';
        this.templatesLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectTemplate(t: ReportTemplate): void {
    this.selectedTemplate = this.selectedTemplate?.id === t.id ? null : t;
  }

  // ── Step 2: Students ─────────────────────────────────────
  studentSearch = '';
  // Shared between Step 1 and Step 2 
  // A specific type must be chosen in Step 1 before proceeding
  selectedType: StudentTypeFilter = 'ALL';

  // The type-toggle tabs (K12/College/Admissions/All) are only shown to
  // ROLE_ADMIN — every other role only ever has access to exactly one
  // type, so selectedType is locked to that instead of the 'ALL' default
  // (which would otherwise leave Step 2's student list permanently empty
  // for non-admins, since 'ALL' never strictly equals a real StudentType).
  isAdmin = false;

  selectedStudents = new Set<string>();

  statusOptions = ['ACTIVE', 'ENROLLED', 'DROPPED', 'PENDING', 'INACTIVE'];
  selectedStatuses = new Set<string>();
  statusDropdownOpen = false;

  searchFieldsOpen = false;
  enabledSearchFields = new Set<string>();

  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  studentsPerPage = 10;
  allStudents: StudentSummary[] = [];
  studentsLoading = false;
  studentsError: string | null = null;

  getStatusBadgeClass = getStatusBadgeClass;

  get columns(): ColumnConfig[] {
    return typeColumns[this.selectedType as StudentType];
  }

  get searchFieldOptions(): FilterFieldConfig[] {
    return typeFilterFields[this.selectedType as StudentType];
  }

  private resetSearchFieldsForType(): void {
    this.enabledSearchFields = new Set(this.searchFieldOptions.map(f => f.key));
  }

  selectTemplateType(type: StudentTypeFilter): void {
    if (this.selectedType === type) return;
    this.selectedType = type;
    this.selectedTemplate = null;   // previously selected template may not match the new type
    this.currentPage = 1;
    this.sortColumn = null;
    this.resetSearchFieldsForType();
  }

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
  }

  clearStatusFilter(): void {
    this.selectedStatuses.clear();
    this.currentPage = 1;
  }

  getStatusLabel(): string {
    if (this.selectedStatuses.size === 0) return 'Status';
    if (this.selectedStatuses.size === 1) return `Status: ${Array.from(this.selectedStatuses)[0]}`;
    return `Status: ${this.selectedStatuses.size} selected`;
  }

  toggleSearchFieldsPanel(event: Event): void {
    event.stopPropagation();
    const next = !this.searchFieldsOpen;
    this.closeAllDropdowns();
    this.searchFieldsOpen = next;
  }

  onSearchFieldToggle(key: string): void {
    if (this.enabledSearchFields.has(key)) this.enabledSearchFields.delete(key);
    else this.enabledSearchFields.add(key);
  }

  isSearchFieldEnabled(key: string): boolean {
    return this.enabledSearchFields.has(key);
  }

  onSearchChange(event: Event): void {
    this.studentSearch = (event.target as HTMLInputElement).value.toLowerCase();
    this.currentPage = 1;
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

  // 3-state cycle per column: ascending -> descending -> back to default order
  toggleSort(key: string): void {
    if (this.sortColumn !== key) {
      this.sortColumn = key;
      this.sortDirection = 'asc';
    } else if (this.sortDirection === 'asc') {
      this.sortDirection = 'desc';
    } else {
      this.sortColumn = null;
    }
  }

  fetchStudents(): void {
    this.studentsLoading = true;
    this.studentsError = null;

    this.studentService.getAllStudents().subscribe({
      next: (data: StudentSummary[]) => {
        this.allStudents = data;
        this.studentsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Failed to fetch students:', err);
        this.studentsError = 'Could not load students. Please try again.';
        this.studentsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get filteredStudents(): StudentSummary[] {
    const q = this.studentSearch;

    const filtered = this.allStudents.filter(s => {
      const matchesType = s.studentType === this.selectedType;

      const matchesCore = !q ||
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q);

      const matchesExtraField = this.searchFieldOptions.some(field =>
        this.enabledSearchFields.has(field.key) &&
        (field.getValue(s) ?? '').toLowerCase().includes(q)
      );

      const matchesSearch = !q || matchesCore || matchesExtraField;
      const matchesStatus = this.selectedStatuses.size === 0 || this.selectedStatuses.has(s.status);

      return matchesType && matchesSearch && matchesStatus;
    });

    return this.applySort(filtered);
  }

  private applySort(list: StudentSummary[]): StudentSummary[] {
    if (!this.sortColumn) return list;
    const col = this.columns.find(c => c.key === this.sortColumn);
    if (!col) return list;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...list].sort((a, b) =>
      col.getValue(a).localeCompare(col.getValue(b), undefined, { numeric: true }) * dir
    );
  }

  get pagedStudents(): StudentSummary[] {
    const start = (this.currentPage - 1) * this.studentsPerPage;
    return this.filteredStudents.slice(start, start + this.studentsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredStudents.length / this.studentsPerPage) || 1;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Scoped to the currently filtered list, not the entire dataset
  get allSelected(): boolean {
    const list = this.filteredStudents;
    return list.length > 0 && list.every(s => this.selectedStudents.has(s.id));
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredStudents.forEach(s => {
      if (checked) this.selectedStudents.add(s.id);
      else this.selectedStudents.delete(s.id);
    });
    this.selectedStudents = new Set(this.selectedStudents);
  }

  // Single toggle used by both the row click and the checkbox itself
  toggleStudent(id: string): void {
    if (this.selectedStudents.has(id)) this.selectedStudents.delete(id);
    else this.selectedStudents.add(id);
    this.selectedStudents = new Set(this.selectedStudents);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // ── Step 3: Review & Generate ──
  reportDetails: ReportDetails = {
    // TODO: pull academicYear/term from a school-settings endpoint once
    // one exists, instead of a hardcoded default that goes stale yearly.
    academicYear:   '2025 - 2026',
    term:           'Term 1',
    signatoryName:  '',
    signatoryTitle: '',
    purpose:        '',
    remarks:        '',
  };

  customFieldValues: Record<string, string> = {};

  private readonly STUDENT_AUTO_KEYS = new Set([
    'studentname', 'studentid', 'gradelevel', 'strand', 'section', 'course', 'yearlevel',
  ]);

  private readonly REPORT_DETAIL_FIELDS: { key: string; label: string }[] = [
    { key: 'academicyear',   label: 'Academic year' },
    { key: 'term',           label: 'Term' },
    { key: 'signatoryname',  label: 'Issued by (signatory name)' },
    { key: 'signatorytitle', label: 'Signatory Title' },
    { key: 'purpose',        label: 'Purpose' },
    { key: 'remarks',        label: 'Special notes / remarks' },
  ];

  get templateFieldKeys(): string[] {
    if (!this.selectedTemplate) return [];
    try {
      const parsed = JSON.parse(this.selectedTemplate.configuration);
      const keys = new Set<string>();
      for (const row of parsed.schemas ?? []) {
        for (const schema of row as any[]) {
          if (!schema?.name) continue;
          if (schema.type === 'multiVariableText' && Array.isArray(schema.variables)) {
            schema.variables.forEach((v: string) => keys.add(v.toLowerCase().replace(/[\s_-]/g, '')));
          } else {
            keys.add((schema.name as string).toLowerCase().replace(/[\s_-]/g, ''));
          }
        }
      }
      return Array.from(keys);
    } catch {
      return [];
    }
  }

  get autoFilledFieldLabels(): string[] {
    const labelMap: Record<string, string> = {
      studentname: 'Student name', studentid: 'Student ID',
      gradelevel: 'Grade level', strand: 'Strand', section: 'Section',
      course: 'Course', yearlevel: 'Year level',
      issuancedate: "Today's date",
    };
    const autoKeys = new Set([...this.STUDENT_AUTO_KEYS, 'issuancedate']);
    const seen = new Set<string>();
    return this.templateFieldKeys
      .filter(k => autoKeys.has(k))
      .map(k => labelMap[k] ?? k)
      .filter(label => (seen.has(label) ? false : (seen.add(label), true)));
  }

  get manualReportFields(): { key: string; label: string }[] {
    const keys = this.templateFieldKeys;
    return this.REPORT_DETAIL_FIELDS.filter(f => keys.includes(f.key));
  }

  get customFieldKeys(): string[] {
    const known = new Set([...this.STUDENT_AUTO_KEYS, 'issuancedate', ...this.REPORT_DETAIL_FIELDS.map(f => f.key)]);
    return this.templateFieldKeys.filter(k => !known.has(k));
  }

  humanizeKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }

  private reportDetailFormKey(key: string): keyof ReportDetails | null {
    const map: Record<string, keyof ReportDetails> = {
      academicyear: 'academicYear', term: 'term',
      signatoryname: 'signatoryName', signatorytitle: 'signatoryTitle',
      purpose: 'purpose', remarks: 'remarks',
    };
    return map[key] ?? null;
  }

  get todayFormatted(): string {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  }

  // Report Summary rows - only includes fields that actually have a value
  get summaryRows(): { key: string; val: string; accent?: boolean }[] {
    const rows: { key: string; val: string; accent?: boolean }[] = [];
    if (this.selectedTemplate) rows.push({ key: 'Template', val: this.selectedTemplate.name });
    if (this.reportDetails.academicYear) rows.push({ key: 'Academic year', val: this.reportDetails.academicYear });
    if (this.reportDetails.term) rows.push({ key: 'Term', val: this.reportDetails.term });
    rows.push({ key: 'Date of issuance', val: this.todayFormatted });
    if (this.reportDetails.signatoryName) rows.push({ key: 'Issued by', val: this.reportDetails.signatoryName });
    if (this.reportDetails.signatoryTitle) rows.push({ key: 'Signatory Title', val: this.reportDetails.signatoryTitle });
    if (this.reportDetails.purpose) rows.push({ key: 'Purpose', val: this.reportDetails.purpose });
    rows.push({ key: 'Students', val: `${this.selectedStudents.size} student(s)`, accent: true });
    return rows;
  }

  // Composition breakdown of the selected batch
  get selectionBreakdown(): { label: string; count: number }[] {
    const selected = this.allStudents.filter(s => this.selectedStudents.has(s.id));
    const counts = new Map<string, number>();
    for (const s of selected) {
      const label = s.studentType === 'K12'
        ? [s.grade, s.section].filter(Boolean).join(' - ') || 'K12 (unspecified)'
        : s.course || 'College (unspecified)';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ── Generation ────────────────────────────────────────────
  generating = false;
  generateError: string | null = null;
  generateProgress = { done: 0, total: 0 };

  constructor(
    private router: Router,
    private reportTemplateService: ReportTemplateService,
    private studentService: StudentService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private authService: AuthService,
  ) {
    this.isAdmin = this.authService.isAdmin();
    if (!this.isAdmin) {
      const role = this.authService.getCurrentRole();
      const allowed = role ? ROLE_STUDENT_TYPE_ACCESS[role] : [];
      if (allowed && allowed.length > 0) {
        this.selectedType = allowed[0];
      }
    }
  }

  ngOnInit(): void {
    this.fetchTemplates();
    this.fetchStudents();
    this.resetSearchFieldsForType();
  }

  goToStep(n: number): void {
    if (n >= 1 && n <= this.steps.length) this.currentStep = n;
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1: return !!this.selectedTemplate && this.selectedType !== 'ALL';
      case 2: return this.selectedStudents.size > 0;
      case 3: {
        const reportFieldsOk = this.manualReportFields.every(f => {
          const formKey = this.reportDetailFormKey(f.key);
          return formKey ? !!this.reportDetails[formKey] : true;
        });
        const customFieldsOk = this.customFieldKeys.every(k => !!this.customFieldValues[k]?.trim());
        return reportFieldsOk && customFieldsOk && !this.generating;
      }
      default: return false;
    }
  }

  onNext(): void {
    // TEMP: canProceed() gate disabled per request while debugging why
    // Step 1 wasn't advancing (it required selectedType !== 'ALL' in
    // addition to a selected template — selecting a template via
    // selectTemplate() alone doesn't set selectedType; that only happens
    // through selectTemplateType()). Re-enable this guard once that flow
    // is sorted out, otherwise users can skip required fields on later
    // steps (e.g. Step 3's manualReportFields/customFieldKeys checks).
    // if (!this.canProceed()) return;
    if (this.currentStep < 3) this.currentStep++;
    else this.generate();
  }

  onBack(): void {
    if (this.generating) return; // don't let them navigate away mid-job
    if (this.currentStep === 1) this.router.navigate(['/dashboard']);
    else this.currentStep--;
  }

  private buildInputsForStudent(template: Template, student: StudentSummary): Record<string, string> {
    const today = new Date();
    const issuanceDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const known: Record<string, string> = {
      academicyear:   this.reportDetails.academicYear,
      term:           this.reportDetails.term,
      issuancedate:   issuanceDate,
      signatoryname:  this.reportDetails.signatoryName,
      signatorytitle: this.reportDetails.signatoryTitle,
      purpose:        this.reportDetails.purpose,
      remarks:        this.reportDetails.remarks,
      studentname:    student.name,
      studentid:      student.studentId,
      gradelevel:     student.grade ?? student.yearLevel ?? '',
      strand:         student.strand ?? student.course ?? '',
      section:        student.section ?? '',
      course:         student.course ?? '',
      yearlevel:      student.yearLevel ?? '',
      ...this.customFieldValues,
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

  generate(): void {
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

      const inputs = selected.map(student => this.buildInputsForStudent(parsedTemplate, student));

      // Details
      let detailString = '';
      const topCategories = this.selectionBreakdown.slice(0, 2).map(b => b.label);
      if (topCategories.length > 0) {
        detailString += topCategories.join(', ');
        if (this.selectionBreakdown.length > 2) detailString += '...';
        detailString += ' • ';
      }
      detailString += `${selected.length} student(s)`;

      const payload = {
        templateId: this.selectedTemplate.id,
        details: detailString,
        inputs: inputs
      };

      // Send to backend queue
      this.http.post('http://localhost:8080/api/report-jobs', payload).subscribe({
        next: () => {
          this.generating = false;
          this.router.navigate(['/archives']); // Redirect to archives page
        },
        error: (err) => {
          console.error('Failed to queue report:', err);
          this.generateError = 'Failed to communicate with the server. Please try again.';
          this.generating = false;
          this.cdr.detectChanges();
        }
      });

    } catch (e: any) {
      console.error('Data preparation failed:', e);
      this.generateError = e?.message ?? 'Something went wrong. Please try again.';
      this.generating = false;
    }
  }
}