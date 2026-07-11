import { Component, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ReportTemplateService } from '../../services/report-template.service';
import { ReportTemplate as ApiReportTemplate, TemplateStudentType } from '../../services/report-template.model';
import { TemplateThumbnailComponent } from '../../shared/components/template-thumbnail/template-thumbnail';
import { TemplateCreationWizard } from './template-creation-wizard/template-creation-wizard';

export type StudentTypeFilter = TemplateStudentType | 'ALL';

export interface TemplateCard {
  id: string;
  name: string;
  lastUsed: string;
  thumbnailUrl?: string;
  configuration?: string;          // raw pdfme JSON — feeds the live-preview fallback
  studentType?: TemplateStudentType; // ⚠️ not yet returned by backend, see report-template.model.ts
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

  // Type pills are meaningful now that templates can be tagged with a
  // student type at creation (see TemplateCreationWizard). 'GENERAL' has
  // no pill of its own — GENERAL-tagged templates are treated as
  // type-agnostic and shown under every pill, not just 'ALL'.
  selectedType: StudentTypeFilter = 'ALL';

  wizardOpen = false;

  private navSubscription?: Subscription;

  constructor(
    private router: Router,
    private reportTemplateService: ReportTemplateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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
          studentType: t.studentType, // undefined until backend actually returns this
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
    this.selectedType = type;
  }

  get filteredTemplates(): TemplateCard[] {
    const q = this.search.toLowerCase();
    return this.templates.filter(t => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q);
      const matchesType = this.selectedType === 'ALL' || t.studentType === this.selectedType;
      return matchesSearch && matchesType;
    });
  }

  // Legacy templates saved before student-type tagging existed — shown
  // only under "All" so filtering by a specific type never silently hides
  // work someone made before this feature existed. Surfaced only when
  // it's actually relevant (a specific pill is active and something's
  // being hidden by it).
  get untaggedCount(): number {
    return this.templates.filter(t => !t.studentType).length;
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

  // ── Kebab menu ───────────────────────────────────────────
  toggleMenu(id: string): void {
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeMenu(); }

  // ── Actions ──────────────────────────────────────────────
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
      },
      error: (err) => {
        console.error('Failed to delete template:', err);
        this.error = 'Could not delete template. Please try again.';
      },
    });
  }

  // ── Create flow — a single guided wizard (purpose -> student type ->
  // default or custom) instead of two disconnected entry points. ──
  openWizard(): void {
    this.wizardOpen = true;
  }

  closeWizard(): void {
    this.wizardOpen = false;
  }
}