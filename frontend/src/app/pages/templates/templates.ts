import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// import { TemplateService } from '../../services/template.service';

export interface ReportTemplate {
  id:       string;
  name:     string;
  lastUsed: string;
}

@Component({
  selector: 'app-report-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
})
export class Templates {

  search = '';
  openMenuId: string | null = null;

  // TODO: replace with TemplateService.getAll()
  templates: ReportTemplate[] = Array.from({ length: 10 }, (_, i) => ({
    id:       String(i + 1),
    name:     'Certificate of Enrollment',
    lastUsed: 'Jun 13, 2026',
  }));

  get filteredTemplates(): ReportTemplate[] {
    const q = this.search.toLowerCase();
    return q ? this.templates.filter(t => t.name.toLowerCase().includes(q)) : this.templates;
  }

  constructor(private router: Router) {}

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

  editTemplate(t: ReportTemplate): void {
    this.router.navigate(['/reports/templates', t.id, 'edit']);
  }

  previewTemplate(t: ReportTemplate): void {
    this.router.navigate(['/reports/templates', t.id, 'preview']);
  }

  deleteTemplate(t: ReportTemplate): void {
    // TODO: confirmation dialog -> TemplateService.delete(t.id)
    const confirmed = window.confirm(`Delete "${t.name}"? This cannot be undone.`);
    if (confirmed) {
      this.templates = this.templates.filter(x => x.id !== t.id);
    }
  }
}