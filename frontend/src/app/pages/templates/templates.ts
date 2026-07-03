import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ReportTemplateService } from '../../services/report-template.service';
import { ReportTemplate as ApiReportTemplate } from '../../services/report-template.model';
import { ResolutionModalComponent } from '../../shared/components/resolution-modal/resolution-modal';

// Local shape used for display in this component's grid/cards
export interface TemplateCard {
  id:       string;
  name:     string;
  lastUsed: string;
  thumbnailUrl?: string;
}

@Component({
  selector: 'app-report-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, ResolutionModalComponent],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
})
export class Templates implements OnInit, OnDestroy {

  search = '';
  openMenuId: string | null = null;
  loading = false;
  error: string | null = null;

  templates: TemplateCard[] = [];

  private navSubscription?: Subscription;

  get filteredTemplates(): TemplateCard[] {
    const q = this.search.toLowerCase();
    return q ? this.templates.filter(t => t.name.toLowerCase().includes(q)) : this.templates;
  }

  constructor(
    private router: Router,
    private reportTemplateService: ReportTemplateService,
  ) {}

  ngOnInit(): void {
    this.fetchTemplates();

    // Re-fetch every time this route becomes active again (e.g. clicking the
    // sidebar link while already on/near this page), since Angular reuses
    // the component instance and ngOnInit alone won't re-fire in that case.
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
            ? new Date(t.lastOpenedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'Never opened',
          thumbnailUrl: t.thumbnailUrl,
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch report templates:', err);
        this.error = 'Could not load templates. Please try again.';
        this.loading = false;
      },
    });
  }

  // ── Kebab menu ───────────────────────────────────────────
  toggleMenu(id: string): void {
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  // Close on Escape key
  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeMenu(); }

  // ── Actions ──────────────────────────────────────────────
  createTemplate(): void {
    this.router.navigate(['/editor']);
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
      },
      error: (err) => {
        console.error('Failed to delete template:', err);
        this.error = 'Could not delete template. Please try again.';
      },
    }
    );
  }
  showConfigModal = false;

}