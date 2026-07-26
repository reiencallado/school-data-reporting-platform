import { Component, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ReportTemplateService } from '../../services/report-template.service';
import { ReportTemplate as ApiReportTemplate, TemplateReportKind } from '../../services/report-template.model';
import { StudentType, ROLE_STUDENT_TYPE_ACCESS } from '../../services/student.model';
import { AuthService } from '../../services/auth.service';
import { TemplateThumbnailComponent } from '../../shared/components/template-thumbnail/template-thumbnail';
import { TemplateCreationWizard } from './template-creation-wizard/template-creation-wizard';

export type StudentTypeFilter = StudentType | 'ALL';
export type ReportKindFilter = TemplateReportKind | 'ALL';

export interface TemplateCard {
  id: string;
  name: string;
  lastUsed: string;
  thumbnailUrl?: string;
  configuration?: string;
  studentType?: StudentType;
  reportKind: TemplateReportKind;
  schoolId?: string;
  schoolName?: string;
}

@Component({
  selector: 'app-report-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, TemplateThumbnailComponent, TemplateCreationWizard],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
})
export class Templates implements OnInit, OnDestroy {

  search = '';
  openMenuId: string | null = null;
  loading = false;
  error: string | null = null;

  templates: TemplateCard[] = [];

  selectedType: StudentTypeFilter = 'ALL';

  selectedReportKind: ReportKindFilter = 'ALL';
  reportKindDropdownOpen = false;

  readonly reportKindOptions: { value: ReportKindFilter; label: string }[] = [
    { value: 'ALL', label: 'All Templates' },
    { value: 'STUDENT', label: 'Student Records' },
    { value: 'DATA', label: 'School Data' },
  ];

  // ── School filter (admin only, value-based multi-select) ──
  selectedSchools = new Set<string>();
  schoolDropdownOpen = false;

  wizardOpen = false;

  private navSubscription?: Subscription;

  constructor(
    private router: Router,
    private reportTemplateService: ReportTemplateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    if (!this.isAdmin) {
      const role = this.authService.getCurrentRole();
      const assigned = role ? ROLE_STUDENT_TYPE_ACCESS[role]?.[0] : undefined;
      this.selectedType = assigned ?? 'ALL';
    }

    this.fetchTemplates();
    this.navSubscription = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects.startsWith('/templates')) {
          this.fetchTemplates();
        }
      });
  }

  ngOnDestroy(): void {
    this.navSubscription?.unsubscribe();
  }

  fetchTemplates(): void {
    this.loading = true;
    this.error = null;

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
          // Backend does not persist reportKind on older/existing records
          // yet so fall back to inferring it from studentType presence:
          // a template with no student type tagged is (for now) treated
          // as a DATA-kind report, since that's the only other bucket.
          reportKind: t.reportKind ?? (t.studentType ? 'STUDENT' : 'DATA'),
          schoolId: t.school?.id,
          schoolName: t.school?.name,
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch report templates:', err);
        this.error = 'Could not load templates. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectType(type: StudentTypeFilter): void {
    if (!this.isAdmin) return;
    this.selectedType = type;
  }

  selectReportKind(kind: ReportKindFilter): void {
    this.selectedReportKind = kind;
    this.reportKindDropdownOpen = false;
    if (kind === 'DATA') {
      this.selectedType = 'ALL';
    }
  }

  get reportKindLabel(): string {
    return this.reportKindOptions.find(o => o.value === this.selectedReportKind)?.label ?? 'All Templates';
  }

  toggleReportKindDropdown(event: Event): void {
    event.stopPropagation();
    const next = !this.reportKindDropdownOpen;
    this.closeAllDropdowns();
    this.reportKindDropdownOpen = next;
  }

  // ── School dropdown (admin only) ──
  get schoolOptions(): { id: string; name: string }[] {
    const map = new Map<string, string>();
    for (const t of this.templates) {
      if (t.schoolId) map.set(t.schoolId, t.schoolName || 'Unnamed School');
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  toggleSchoolDropdown(event: Event): void {
    event.stopPropagation();
    const next = !this.schoolDropdownOpen;
    this.closeAllDropdowns();
    this.schoolDropdownOpen = next;
  }

  onSchoolToggle(id: string): void {
    if (this.selectedSchools.has(id)) this.selectedSchools.delete(id);
    else this.selectedSchools.add(id);
  }

  clearSchoolFilter(): void {
    this.selectedSchools.clear();
  }

  getSchoolLabel(): string {
    if (this.selectedSchools.size === 0) return 'School';
    if (this.selectedSchools.size === 1) {
      const match = this.schoolOptions.find(s => s.id === Array.from(this.selectedSchools)[0]);
      return `School: ${match?.name ?? '1 selected'}`;
    }
    return `School: ${this.selectedSchools.size} selected`;
  }

  get filteredTemplates(): TemplateCard[] {
    const q = this.search.toLowerCase();
    return this.templates.filter(t => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q);
      const matchesReportKind = this.selectedReportKind === 'ALL' || t.reportKind === this.selectedReportKind;
      const matchesType = this.selectedType === 'ALL' || t.studentType === this.selectedType;
      const matchesSchool = this.selectedSchools.size === 0 || (!!t.schoolId && this.selectedSchools.has(t.schoolId));
      return matchesSearch && matchesReportKind && matchesType && matchesSchool;
    });
  }

  get untaggedCount(): number {
    return this.templates.filter(t => t.reportKind === 'STUDENT' && !t.studentType).length;
  }

  get showUntaggedNote(): boolean {
    return this.selectedType !== 'ALL' && this.untaggedCount > 0;
  }

  parsedConfiguration(t: TemplateCard): any {
    if (!t.configuration) return null;
    try { return JSON.parse(t.configuration); } catch { return null; }
  }

  onSearchChange(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }

  toggleMenu(id: string): void {
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  private closeAllDropdowns(): void {
    this.reportKindDropdownOpen = false;
    this.schoolDropdownOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
    this.closeAllDropdowns();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAllDropdowns();
  }

  editTemplate(t: TemplateCard): void {
    this.router.navigate(['/reports/templates', t.id, 'edit']);
  }

  previewTemplate(t: TemplateCard): void {
    this.router.navigate(['/reports/templates', t.id, 'preview']);
  }

  deleteTemplate(t: TemplateCard): void {
    this.reportTemplateService.deleteTemplate(t.id).subscribe({
      next: () => {
        this.templates = this.templates.filter(x => x.id !== t.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete template:', err);
        this.error = 'Could not delete template. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  openWizard(): void {
    this.wizardOpen = true;
  }

  closeWizard(): void {
    this.wizardOpen = false;
  }
}