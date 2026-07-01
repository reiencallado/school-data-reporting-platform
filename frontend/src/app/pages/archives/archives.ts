import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { ReportService } from '../../services/report.service';

export interface ArchiveReport {
  id:          string;
  name:        string;
  template:    string;
  type:        string;
  generatedBy: string;
  date:        string;
  status:      'DONE' | 'PROCESSING' | 'FAILED';
  downloadUrl?: string;
}

@Component({
  selector: 'app-report-archives',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archives.html',
  styleUrl: './archives.css',
})
export class Archives {

  search      = '';
  selectedIds = new Set<string>();
  currentPage = 1;
  totalPages  = 10;
  pageNumbers = [1, 2, 3, 4, 5];

  // TODO: replace with ReportService.getArchives() + pagination
  reports: ArchiveReport[] = Array.from({ length: 16 }, (_, i) => ({
    id:          String(i + 1),
    name:        'Enrollment Certificate',
    template:    'Certificate of Enrollment',
    type:        'CERT',
    generatedBy: 'Principal',
    date:        'June 1, 2026',
    status:      'DONE' as const,
    downloadUrl: '#',
  }));

  get filteredReports(): ArchiveReport[] {
    const q = this.search.toLowerCase();
    return q
      ? this.reports.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.template.toLowerCase().includes(q) ||
          r.generatedBy.toLowerCase().includes(q))
      : this.reports;
  }

  // ── Selection ────────────────────────────────────────────
  get allSelected(): boolean {
    return this.filteredReports.length > 0 &&
           this.filteredReports.every(r => this.selectedIds.has(r.id));
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredReports.forEach(r => {
      if (checked) this.selectedIds.add(r.id);
      else         this.selectedIds.delete(r.id);
    });
    this.selectedIds = new Set(this.selectedIds);
  }

  toggleRow(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.selectedIds.add(id);
    else         this.selectedIds.delete(id);
    this.selectedIds = new Set(this.selectedIds);
  }

  // ── Actions ──────────────────────────────────────────────
  downloadReport(r: ArchiveReport): void {
    // TODO: ReportService.download(r.id) → trigger zip download
    console.log('Downloading', r.id, r.downloadUrl);
  }

  downloadSelected(): void {
    const ids = Array.from(this.selectedIds);
    // TODO: ReportService.downloadBatch(ids) → trigger zip of selected
    console.log('Batch download', ids);
  }

  // ── Pagination ───────────────────────────────────────────
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.selectedIds.clear();
    // TODO: fetch page from ReportService
  }
}