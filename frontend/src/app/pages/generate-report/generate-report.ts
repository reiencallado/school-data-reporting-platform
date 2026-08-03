import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Template } from '@pdfme/common';
import { HttpClient } from '@angular/common/http';

import { ReportTemplateService } from '../../services/report-template.service';
import { ReportTemplate as ApiReportTemplate, TemplateReportKind } from '../../services/report-template.model';
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
export type ReportKindFilter = TemplateReportKind | 'ALL';

export interface ReportTemplate {
  id:            string;
  name:          string;
  lastUsed:      string;
  thumbnailUrl?: string;
  configuration: string; 
  studentType?:  StudentType;
  reportKind:    TemplateReportKind;
  schoolId?:     string;
  schoolName?:   string; 
}

export interface ReportDetails {
  academicYear:   string;
  term:           string;
  signatoryName:  string;
  signatoryTitle: string;
  purpose:        string;
  remarks:        string;
}

interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  kind: 'text' | 'date' | 'image';
}

@Component({
  selector: 'app-generate-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-report.html',
  styleUrl: './generate-report.css',
})
export class GenerateReport implements OnInit {
  get steps(): string[] {
    if (this.selectedTemplate?.reportKind === 'DATA') {
      return ['Select template', 'Fill details & generate'];
    }
    return ['Select template', 'Select students', 'Review & generate'];
  }

  get isStudentSelectionStep(): boolean {
    return this.selectedTemplate?.reportKind !== 'DATA' && this.currentStep === 2;
  }

  get isReviewStep(): boolean {
    return this.currentStep === this.steps.length;
  }

  currentStep = 1;

  // ── Step 1: Template ─────────────────────────────────────
  templateSearch = '';
  selectedTemplate: ReportTemplate | null = null;
  templates: ReportTemplate[] = [];
  templatesLoading = false;
  templatesError: string | null = null;
  filterReportKind: ReportKindFilter = 'ALL';
  filterStudentType: StudentTypeFilter = 'ALL';
  filterReportKindDropdownOpen = false;

  readonly reportKindFilterOptions: { value: ReportKindFilter; label: string }[] = [
    { value: 'ALL', label: 'All Templates' },
    { value: 'STUDENT', label: 'Student Records' },
    { value: 'DATA', label: 'School Data' },
  ];

  get filterReportKindLabel(): string {
    return this.reportKindFilterOptions.find(o => o.value === this.filterReportKind)?.label ?? 'All Templates';
  }

  toggleFilterReportKindDropdown(event: Event): void {
    event.stopPropagation();
    this.filterReportKindDropdownOpen = !this.filterReportKindDropdownOpen;
  }

  selectFilterReportKind(kind: ReportKindFilter): void {
    this.filterReportKind = kind;
    this.filterReportKindDropdownOpen = false;
    if (kind === 'DATA') this.filterStudentType = 'ALL';
  }

  selectFilterStudentType(type: StudentTypeFilter): void {
    if (!this.isAdmin) return;
    this.filterStudentType = type;
  }

  // ── School filter (Step 1, browse-only) ──
  selectedFilterSchools = new Set<string>();
  filterSchoolDropdownOpen = false;

  get availableFilterSchools(): { id: string; name: string }[] {
    const byId = new Map<string, string>();
    for (const t of this.templates) {
      if (t.schoolId && t.schoolName) byId.set(t.schoolId, t.schoolName);
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get filterSchoolLabel(): string {
    if (this.selectedFilterSchools.size === 0) return 'All Schools';
    if (this.selectedFilterSchools.size === 1) {
      const match = this.availableFilterSchools.find(s => s.id === Array.from(this.selectedFilterSchools)[0]);
      return match?.name ?? '1 selected';
    }
    return `${this.selectedFilterSchools.size} selected`;
  }

  toggleFilterSchoolDropdown(event: Event): void {
    event.stopPropagation();
    this.filterSchoolDropdownOpen = !this.filterSchoolDropdownOpen;
  }

  onFilterSchoolToggle(id: string): void {
    if (this.selectedFilterSchools.has(id)) this.selectedFilterSchools.delete(id);
    else this.selectedFilterSchools.add(id);
  }

  clearFilterSchools(): void {
    this.selectedFilterSchools.clear();
  }

  get filteredTemplates(): ReportTemplate[] {
    const q = this.templateSearch.toLowerCase();
    return this.templates.filter(t => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q);
      const matchesReportKind = this.filterReportKind === 'ALL' || t.reportKind === this.filterReportKind;
      const matchesType = this.filterStudentType === 'ALL' || t.studentType === this.filterStudentType;
      const matchesSchool = this.selectedFilterSchools.size === 0 || (!!t.schoolId && this.selectedFilterSchools.has(t.schoolId));
      return matchesSearch && matchesReportKind && matchesType && matchesSchool;
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
          schoolId: t.school?.id,
          schoolName: t.school?.name,
          // Backend does not persist reportKind on older records yet so
          // fall back to inferring it from studentType presence, same as
          // templates.ts.
          reportKind: t.reportKind ?? (t.studentType ? 'STUDENT' : 'DATA'),
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
    this.selectedStudents.clear();
    this.currentPage = 1;
    this.sortColumn = null;
    this.resetSearchFieldsForType();
    this._templateFieldsCache = this.computeTemplateFields();
    this.customImageValues = {};
    this.logoLoadFailed = false;

    if (this.resolvedSchoolLogo && this._templateFieldsCache.some(f => f.kind === 'image' && f.key === 'schoollogo')) {
      const logoUrl = this.resolvedSchoolLogo;
      this.fetchLogoAsBase64(logoUrl)
        .then(base64 => {
          // Guard: bail if the user switched templates/schools while this was in flight.
          if (this.resolvedSchoolLogo === logoUrl) {
            this.customImageValues['schoollogo'] = base64;
            this.cdr.detectChanges();
          }
        })
        .catch(err => {
          console.error('Failed to load school logo:', err);
          if (this.resolvedSchoolLogo === logoUrl) {
            this.logoLoadFailed = true;
            this.cdr.detectChanges();
          }
        });
    }

    if (!this.reportDetails.academicYear) {
      this.reportDetails.academicYear = this.currentAcademicYear;
    }
    if (!this.termOptions.includes(this.reportDetails.term)) {
      this.reportDetails.term = this.termOptions[0];
    }
  }

  // Fetch an image URL and converts it to a base64 data URI for pdfme image fields
  private logoBase64Cache = new Map<string, string>();

  private async fetchLogoAsBase64(url: string): Promise<string> {
    const cached = this.logoBase64Cache.get(url);
    if (cached) return cached;
    const token = localStorage.getItem('token');
    const proxyUrl = `http://localhost:8080/api/storage/file?key=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`Failed to fetch logo (${response.status})`);
    const blob = await response.blob();

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    this.logoBase64Cache.set(url, base64);
    return base64;
  }

  private async ensureSchoolLogoResolved(): Promise<void> {
    const needsLogo = this._templateFieldsCache.some(f => f.kind === 'image' && f.key === 'schoollogo');
    if (!needsLogo || !this.resolvedSchoolLogo) return;

    const current = this.customImageValues['schoollogo'];
    if (current && current.startsWith('data:')) return; // already a proper data URI

    try {
      this.customImageValues['schoollogo'] = await this.fetchLogoAsBase64(this.resolvedSchoolLogo);
      this.logoLoadFailed = false;
    } catch (err) {
      console.error('Failed to resolve school logo before generation:', err);
      this.logoLoadFailed = true;
    }
  }

  // The template's own school, resolved automatically
  get resolvedSchoolName(): string {
    return this.selectedTemplate?.schoolName ?? '';
  }

  // Best-effort logo resolution: School doesn't carry its own logoUrl in
  // the current data model (see report-template.model.ts's School
  // interface), so the only reliable source right now is the logged-in
  // user's OWN school logo (from their profile) - which only applies
  // when they're viewing a template that belongs to their own school.
  // An admin browsing another school's template has no client-side way
  // to know that school's logo yet - falls back to the manual upload
  // field in that case, same as before this change.
  //
  // SEAM: once School gets its own logoUrl (returned alongside
  // name/id on ReportTemplate.school), this can resolve unconditionally
  // for every template, not just the user's own school.
  get resolvedSchoolLogo(): string | null {
    if (!this.selectedTemplate?.schoolId) return null;
    if (this.authService.getCurrentSchoolId() !== this.selectedTemplate.schoolId) return null;
    return this.authService.getCurrentUser()?.logoUrl ?? null;
  }

  // ── Step 2: Students (STUDENT-kind templates only) ───────
  studentSearch = '';

  // The student type Step 2's roster comes directly from the chosen template
  get selectedStudentType(): StudentType | null {
    return this.selectedTemplate?.studentType ?? null;
  }

  isAdmin = false;

  selectedStudents = new Set<string>();

  statusOptions = ['ACTIVE', 'INACTIVE', 'ENROLLED', 'DROPPED', 'PENDING'];
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
    return this.selectedStudentType ? typeColumns[this.selectedStudentType] : [];
  }

  get searchFieldOptions(): FilterFieldConfig[] {
    return this.selectedStudentType ? typeFilterFields[this.selectedStudentType] : [];
  }

  private resetSearchFieldsForType(): void {
    this.enabledSearchFields = new Set(this.searchFieldOptions.map(f => f.key));
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
    this.filterReportKindDropdownOpen = false;
    this.filterSchoolDropdownOpen = false;
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
    const type = this.selectedStudentType;
    if (!type) return [];

    const filtered = this.allStudents.filter(s => {
      const matchesType = s.studentType === type;
      const matchesSchool = !this.selectedTemplate?.schoolId || s.schoolId === this.selectedTemplate.schoolId;

      const matchesCore = !q ||
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q);

      const matchesExtraField = this.searchFieldOptions.some(field =>
        this.enabledSearchFields.has(field.key) &&
        (field.getValue(s) ?? '').toLowerCase().includes(q)
      );

      const matchesSearch = !q || matchesCore || matchesExtraField;
      const matchesStatus = this.selectedStatuses.size === 0 || this.selectedStatuses.has(s.status);

      return matchesType && matchesSchool && matchesSearch && matchesStatus;
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

  toggleStudent(id: string): void {
    if (this.selectedStudents.has(id)) this.selectedStudents.delete(id);
    else this.selectedStudents.add(id);
    this.selectedStudents = new Set(this.selectedStudents);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // ── Step 3 (or Step 2 for DATA templates): Review & Generate ──
  reportDetails: ReportDetails = {
    // TODO: pull academicYear/term from a school-settings endpoint once
    // one exists, instead of defaulting to whatever academicYearOptions
    // computes as "current."
    academicYear:   '',
    term:           '',
    signatoryName:  '',
    signatoryTitle: '',
    purpose:        '',
    remarks:        '',
  };

  get academicYearOptions(): string[] {
    const today = new Date();
    const startYear = today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1;
    const years: string[] = [];
    for (let offset = -1; offset <= 2; offset++) {
      years.push(`${startYear + offset} - ${startYear + offset + 1}`);
    }
    return years;
  }

  private get currentAcademicYear(): string {
    const today = new Date();
    const startYear = today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1;
    return `${startYear} - ${startYear + 1}`;
  }

  get termOptions(): string[] {
    switch (this.selectedTemplate?.studentType) {
      case 'K12':
        return ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Summer'];
      case 'COLLEGE':
        return ['1st Semester', '2nd Semester', 'Summer Term'];
      default:
        return ['Term 1', 'Term 2', 'Term 3', 'Term 4', '1st Semester', '2nd Semester', 'Summer'];
    }
  }

  customFieldValues: Record<string, string> = {};
  customImageValues: Record<string, string> = {};
  customDateFieldValues: Record<string, string> = {};

  logoLoadFailed = false;

  onDateFieldChange(key: string, value: string): void {
    this.customDateFieldValues[key] = value;
    this.customFieldValues[key] = this.formatDisplayDate(value);
  }

  private formatDisplayDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return '';
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  // Single source of truth for every field a student record can auto-fill
  private readonly AUTO_LABEL_MAP: Record<string, string> = {
    studentname: 'Student name', studentid: 'Student ID',
    firstname: 'First name', lastname: 'Last name',
    schoolname: 'School name', status: 'Status',
    grade: 'Grade level', gradelevel: 'Grade level',
    strand: 'Strand', section: 'Section',
    strandsection: 'Strand / Section', gradesection: 'Grade & Section',
    course: 'Course', program: 'Course', yearlevel: 'Year level',
    schoolyear: 'School year',
    issuancedate: "Today's date",
    generateddate: 'Generation date',
  };

  private readonly AUTO_DATE_KEYS = new Set(['issuancedate', 'generateddate']);

  private readonly STUDENT_AUTO_KEYS = new Set(
    Object.keys(this.AUTO_LABEL_MAP).filter(k => !this.AUTO_DATE_KEYS.has(k))
  );

  private studentAutoFields(student: StudentSummary): Record<string, string> {
    const strandSection = [student.strand, student.section].filter(Boolean).join(' - ');
    const gradeSection = [student.grade, student.section].filter(Boolean).join(' - ');

    return {
      studentname: student.name,
      studentid: student.studentId,
      firstname: student.firstName,
      lastname: student.lastName,
      schoolname: student.schoolName || this.resolvedSchoolName || '',
      status: student.status,
      grade: student.grade ?? '',
      gradelevel: student.grade ?? '',
      strand: student.strand ?? '',
      section: student.section ?? '',
      strandsection: strandSection,
      gradesection: gradeSection,
      course: student.course ?? '',
      program: student.course ?? '',
      yearlevel: student.yearLevel ?? '',
    };
  }

  private readonly REPORT_DETAIL_FIELDS: { key: string; label: string }[] = [
    { key: 'academicyear',   label: 'Academic year' },
    { key: 'term',           label: 'Term' },
    { key: 'signatoryname',  label: 'Issued by (signatory name)' },
    { key: 'signatorytitle', label: 'Signatory Title' },
    { key: 'purpose',        label: 'Purpose' },
    { key: 'remarks',        label: 'Special notes / remarks' },
  ];

  private _templateFieldsCache: TemplateField[] = [];

  get templateFields(): TemplateField[] {
    return this._templateFieldsCache;
  }

  // Extracts every genuinely fillable field from the template's saved pdfme JSON
  private computeTemplateFields(): TemplateField[] {
    if (!this.selectedTemplate) return [];
    try {
      const parsed = JSON.parse(this.selectedTemplate.configuration);
      const fields: TemplateField[] = [];
      const seen = new Set<string>();

      for (const row of parsed.schemas ?? []) {
        for (const schema of row as any[]) {
          if (!schema?.name) continue;

          if (schema.type === 'multiVariableText' && Array.isArray(schema.variables)) {
            for (const variable of schema.variables) {
              const key = String(variable).toLowerCase().replace(/[\s_-]/g, '');
              if (seen.has(key)) continue;
              seen.add(key);
              const isDateField = key.includes('date')
                && !this.STUDENT_AUTO_KEYS.has(key)
                && !this.AUTO_DATE_KEYS.has(key);
              fields.push({
                key,
                label: this.extractSavedLabel(schema, variable) ?? this.humanizeKey(variable),
                required: !!schema.required,
                kind: isDateField ? 'date' : 'text',
              });
            }
          } else if (schema.type === 'image') {
            const key = (schema.name as string).toLowerCase().replace(/[\s_-]/g, '');
            if (seen.has(key)) continue;
            seen.add(key);
            fields.push({
              key,
              label: this.humanizeKey(schema.name),
              required: !!schema.required,
              kind: 'image',
            });
          }
        }
      }
      return fields;
    } catch {
      return [];
    }
  }

  private extractSavedLabel(schema: any, variable: string): string | null {
    try {
      const parsed = JSON.parse(schema.content ?? '{}');
      return typeof parsed[variable] === 'string' && parsed[variable].trim() ? parsed[variable] : null;
    } catch {
      return null;
    }
  }

  get autoFilledFieldLabels(): string[] {
    const autoKeys = new Set([...this.STUDENT_AUTO_KEYS, ...this.AUTO_DATE_KEYS]);
    const seen = new Set<string>();
    const labels = this.templateFields
      .filter(f => f.kind === 'text' && autoKeys.has(f.key))
      .map(f => this.AUTO_LABEL_MAP[f.key] ?? f.label)
      .filter(label => (seen.has(label) ? false : (seen.add(label), true)));

    const hasAutoLogo = this.resolvedSchoolLogo
      && this.templateFields.some(f => f.kind === 'image' && f.key === 'schoollogo');
    if (hasAutoLogo) labels.push('School logo');

    return labels;
  }

  get manualReportFields(): { key: string; label: string; required: boolean }[] {
    const byKey = new Map(this.templateFields.map(f => [f.key, f]));
    return this.REPORT_DETAIL_FIELDS
      .filter(f => byKey.has(f.key))
      .map(f => ({ ...f, required: byKey.get(f.key)!.required }));
  }

  private readonly PERIOD_FIELD_KEYS = new Set(['academicyear', 'term']);

  // For DATA-kind templates, academicYear/term aren't just two more form
  // fields alongside signatory/purpose - they're the closest thing a Data
  // report has to a "selection" (a Student Record template has you pick
  // students; a Data report has you pick a period). Broken out separately
  // so Step 3 can frame them as "what period is this report for?" instead
  // of burying them in the generic details list.
  //
  // SEAM for later: once a backend aggregation endpoint exists (e.g.
  // GET /api/reports/financial-summary?schoolId=&academicYear=&term=),
  // this becomes a real period picker that, on change, calls that
  // endpoint and auto-fills the stat fields below (customTextFields) from
  // real numbers - the same way student records auto-fill studentName/
  // grade for Student Record templates today. Until that endpoint exists,
  // the stat fields stay manually typed.
  get periodFields(): { key: string; label: string; required: boolean }[] {
    return this.manualReportFields.filter(f => this.PERIOD_FIELD_KEYS.has(f.key));
  }

  get showPeriodSection(): boolean {
    return this.selectedTemplate?.reportKind === 'DATA' && this.periodFields.length > 0;
  }

  get otherReportFields(): { key: string; label: string; required: boolean }[] {
    if (!this.showPeriodSection) return this.manualReportFields;
    return this.manualReportFields.filter(f => !this.PERIOD_FIELD_KEYS.has(f.key));
  }

  get hasOtherFillableFields(): boolean {
    return this.otherReportFields.length > 0 || this.customTextFields.length > 0
      || this.dateFields.length > 0 || this.imageFields.length > 0;
  }

  get customTextFields(): TemplateField[] {
    const known = new Set([...this.STUDENT_AUTO_KEYS, ...this.AUTO_DATE_KEYS, ...this.REPORT_DETAIL_FIELDS.map(f => f.key)]);
    return this.templateFields.filter(f => f.kind === 'text' && !known.has(f.key));
  }

  get dateFields(): TemplateField[] {
    return this.templateFields.filter(f => f.kind === 'date');
  }

  get imageFields(): TemplateField[] {
    return [];
  }

  get hasAnyFillableFields(): boolean {
    return this.manualReportFields.length > 0 || this.customTextFields.length > 0
      || this.dateFields.length > 0 || this.imageFields.length > 0;
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

    if (this.selectedTemplate?.reportKind === 'DATA') {
      const scopeLabel = this.resolvedSchoolName
        ? `School-wide data report — ${this.resolvedSchoolName}`
        : 'School-wide data report';
      rows.push({ key: 'Scope', val: scopeLabel, accent: true });
    } else {
      rows.push({ key: 'Students', val: `${this.selectedStudents.size} student(s)`, accent: true });
    }
    return rows;
  }

  get selectionBreakdown(): { label: string; count: number }[] {
    if (this.selectedTemplate?.reportKind === 'DATA') return [];

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
        this.filterStudentType = allowed[0];
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
    if (this.currentStep === 1) {
      return !!this.selectedTemplate;
    }
    if (this.isStudentSelectionStep) {
      return this.selectedStudents.size > 0;
    }
    if (this.isReviewStep) {
      const reportFieldsOk = this.manualReportFields.every(f => {
        if (!f.required) return true;
        const formKey = this.reportDetailFormKey(f.key);
        return formKey ? !!this.reportDetails[formKey] : true;
      });
      const customTextOk = this.customTextFields.every(f =>
        !f.required || !!this.customFieldValues[f.key]?.trim()
      );
      const dateFieldsOk = this.dateFields.every(f =>
        !f.required || !!this.customDateFieldValues[f.key]
      );
      const imagesOk = this.imageFields.every(f =>
        !f.required || !!this.customImageValues[f.key]
      );
      return reportFieldsOk && customTextOk && dateFieldsOk && imagesOk && !this.generating;
    }
    return false;
  }

  onNext(): void {
    if (!this.canProceed()) return;
    if (this.currentStep < this.steps.length) this.currentStep++;
    else this.generate();
  }

  onBack(): void {
    if (this.generating) return; // don't let them navigate away mid-job
    if (this.currentStep === 1) this.router.navigate(['/dashboard']);
    else this.currentStep--;
  }

  // Builds pdfme inputs for one student
  private buildInputsForStudent(template: Template, student: StudentSummary): Record<string, string> {
    const today = new Date();
    const issuanceDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const known: Record<string, string> = {
      academicyear:   this.reportDetails.academicYear,
      schoolyear:     this.reportDetails.academicYear,
      term:           this.reportDetails.term,
      issuancedate:   issuanceDate,
      signatoryname:  this.reportDetails.signatoryName,
      signatorytitle: this.reportDetails.signatoryTitle,
      purpose:        this.reportDetails.purpose,
      remarks:        this.reportDetails.remarks,
      ...this.studentAutoFields(student),
      ...this.customFieldValues,
    };

    return this.buildPageInputs(template, known);
  }

  // Builds pdfme inputs for a DATA-kind template
  private buildInputsForReport(template: Template): Record<string, string> {
    const today = new Date();
    const generatedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const known: Record<string, string> = {
      academicyear:   this.reportDetails.academicYear,
      schoolyear:     this.reportDetails.academicYear,
      term:           this.reportDetails.term,
      issuancedate:   generatedDate,
      generateddate:  generatedDate,
      signatoryname:  this.reportDetails.signatoryName,
      signatorytitle: this.reportDetails.signatoryTitle,
      purpose:        this.reportDetails.purpose,
      remarks:        this.reportDetails.remarks,
      schoolname:     this.resolvedSchoolName,
      ...this.customFieldValues,
    };


    return this.buildPageInputs(template, known);
  }

  private buildPageInputs(template: Template, known: Record<string, string>): Record<string, string> {
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

        } else if (schema.type === 'image') {
          const key = (schema.name as string).toLowerCase().replace(/[\s_-]/g, '');
          const candidate = this.customImageValues[key] ?? schema.content;
          if (typeof candidate === 'string' && candidate.startsWith('data:')) {
            page[schema.name] = candidate;
          }

        } else {
          page[schema.name] = schema.content ?? '';
        }
      }
    }

    return page;
  }

  async generate(): Promise<void> {
    if (!this.selectedTemplate) return;
    this.generating = false;
    this.generateError = null;

    try {
      let parsedTemplate: Template;
      try {
        parsedTemplate = JSON.parse(this.selectedTemplate.configuration);
      } catch (e) {
        throw new Error('This template\u2019s layout data is corrupted and can\u2019t be used to generate reports.');
      }

      // Make sure the school logo is a real base64 data URI before it's baked into any pdfme input
      await this.ensureSchoolLogoResolved();

      let inputs: { pdfmeInput: Record<string, string>; student?: Record<string, string> }[];
      let detailString: string;

      if (this.selectedTemplate.reportKind === 'DATA') {
        inputs = [{ pdfmeInput: this.buildInputsForReport(parsedTemplate) }];
        detailString = 'School data report';
        this.generateProgress = { done: 0, total: 1 };
      } else {
        const selected = this.allStudents.filter(s => this.selectedStudents.has(s.id));
        this.generateProgress = { done: 0, total: selected.length };
        inputs = selected.map(student => ({
          pdfmeInput: this.buildInputsForStudent(parsedTemplate, student),
          student: {
            studentId: student.studentId,
            studentName: student.name,
            grade: student.grade ?? '',
            section: student.section ?? '',
            strand: student.strand ?? '',
            course: student.course ?? '',
            yearLevel: student.yearLevel ?? '',
          },
        }));

        const topCategories = this.selectionBreakdown.slice(0, 2).map(b => b.label);
        detailString = '';
        if (topCategories.length > 0) {
          detailString += topCategories.join(', ');
          if (this.selectionBreakdown.length > 2) detailString += '...';
          detailString += ' • ';
        }
        detailString += `${selected.length} student(s)`;
      }

      const payload = { templateId: this.selectedTemplate.id, details: detailString, inputs };

      this.http.post('http://localhost:8080/api/report-jobs', payload).subscribe({
        next: () => { this.generating = false; this.router.navigate(['/archives']); },
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