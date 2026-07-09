import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { ReportService } from '../../services/report.service';

export interface ArchiveReport {
  id:             string;
  name:           string;
  template:       string;
  type:           string;
  generatedBy:    string;
  date:           string;
  details:        string;
  status:         'DONE' | 'PROCESSING' | 'FAILED';
  generatedCount: number;
  totalCount:     number;
  downloadUrl?:   string;
}

@Component({
  selector: 'app-report-archives',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archives.html',
  styleUrl: './archives.css',
})
export class Archives {

  search = '';
  selectedIds = new Set<string>();
  selectedTemplates = new Set<string>();
  selectedStatuses = new Set<ArchiveReport['status']>();
  selectedDateFilter: 'ALL' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | 'CUSTOM' = 'ALL';
  customDateFrom = '';
  customDateTo = '';

  dropdownStates = {
    date: false,
    template: false,
    status: false,
  };

  currentPage = 1;
  pageSize = 8;

  statusClasses: Record<ArchiveReport['status'], string> = {
    DONE: 'status-badge-done',
    PROCESSING: 'status-badge-processing',
    FAILED: 'status-badge-failed',
  };

  // TODO: replace with ReportService.getArchives() + pagination
  reports: ArchiveReport[] = [
    {
      id: '1',
      name: 'Certificate of Enrollment',
      template: 'Certificate of Enrollment',
      type: 'CERT',
      generatedBy: 'Principal',
      date: '2026-06-01',
      details: 'Grade 11 • STEM • St. Jude',
      status: 'DONE',
      generatedCount: 30,
      totalCount: 30,
      downloadUrl: '#',
    },
    {
      id: '2',
      name: 'Diploma Certificate',
      template: 'Diploma Certificate',
      type: 'CERT',
      generatedBy: 'Registrar',
      date: '2026-05-30',
      details: 'Grade 12 • ABM • St. Thomas',
      status: 'FAILED',
      generatedCount: 25,
      totalCount: 30,
      downloadUrl: '#',
    },
    {
      id: '3',
      name: 'Monthly Student Report',
      template: 'Monthly Student Report',
      type: 'REPORT',
      generatedBy: 'Principal',
      date: '2026-05-28',
      details: 'Grade 11 • HUMSS • All sections',
      status: 'DONE',
      generatedCount: 45,
      totalCount: 45,
      downloadUrl: '#',
    },
    {
      id: '4',
      name: 'Honor Roll Certificate',
      template: 'Honor Roll Certificate',
      type: 'CERT',
      generatedBy: 'Dean',
      date: '2026-05-25',
      details: 'Grade 12 • STEM • St. Jude',
      status: 'FAILED',
      generatedCount: 0,
      totalCount: 18,
      downloadUrl: '#',
    },
    {
      id: '5',
      name: 'Graduation Report',
      template: 'Graduation Report',
      type: 'REPORT',
      generatedBy: 'Principal',
      date: '2026-05-20',
      details: 'Grade 11 • ABM • St. La Salle',
      status: 'PROCESSING',
      generatedCount: 18,
      totalCount: 30,
      downloadUrl: '#',
    },
    ...Array.from({ length: 11 }, (_, index) => ({
      id: String(6 + index),
      name: `Progress Report ${index + 1}`,
      template: index % 2 === 0 ? 'Certificate of Enrollment' : 'Monthly Student Report',
      type: 'REPORT',
      generatedBy: index % 3 === 0 ? 'Registrar' : 'Principal',
      date: `2026-05-${10 + index}`,
      details: index % 2 === 0 ? 'Grade 10 • ABM • St. Martin' : 'Grade 11 • HUMSS • St. Joseph',
      status: (index % 3 === 0 ? 'PROCESSING' : index % 2 === 0 ? 'DONE' : 'FAILED') as ArchiveReport['status'],
      generatedCount: index % 3 === 0 ? 10 + index : index % 2 === 0 ? 15 + index : 5 + index,
      totalCount: 20,
      downloadUrl: '#',
    })) as ArchiveReport[],
  ];

  get templateOptions(): string[] {
    return Array.from(new Set(this.reports.map(r => r.template)));
  }

  get statusOptions(): ArchiveReport['status'][] {
    return ['DONE', 'FAILED', 'PROCESSING'];
  }

  get filteredReports(): ArchiveReport[] {
    const query = this.search.toLowerCase();
    return this.reports.filter(report => {
      const matchesSearch =
        report.name.toLowerCase().includes(query) ||
        report.template.toLowerCase().includes(query) ||
        report.generatedBy.toLowerCase().includes(query);

      const matchesTemplate =
        this.selectedTemplates.size === 0 ||
        this.selectedTemplates.has(report.template);

      const matchesStatus =
        this.selectedStatuses.size === 0 ||
        this.selectedStatuses.has(report.status);

      const matchesDate = this.matchesDateFilter(report.date);

      return matchesSearch && matchesTemplate && matchesStatus && matchesDate;
    });
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredReports.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.pageCount }, (_, i) => i + 1);
  }

  get pagedReports(): ArchiveReport[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredReports.slice(start, start + this.pageSize);
  }

  get dateFilterLabel(): string {
    switch (this.selectedDateFilter) {
      case 'LAST_7': return 'Last 7 days';
      case 'LAST_30': return 'Last 30 days';
      case 'THIS_MONTH': return 'This month';
      case 'CUSTOM': return this.customDateFrom && this.customDateTo
        ? `${this.customDateFrom} to ${this.customDateTo}`
        : 'Custom range';
      default: return 'Date';
    }
  }

  get templateFilterLabel(): string {
    return this.selectedTemplates.size === 0
      ? 'Template'
      : `${this.selectedTemplates.size} selected`;
  }

  get statusFilterLabel(): string {
    return this.selectedStatuses.size === 0
      ? 'Status'
      : `${this.selectedStatuses.size} selected`;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAllDropdowns();
  }

  toggleDropdown(type: 'date' | 'template' | 'status', event: Event): void {
    event.stopPropagation();
    this.closeAllDropdowns();
    this.dropdownStates[type] = !this.dropdownStates[type];
  }

  closeAllDropdowns(): void {
    this.dropdownStates = {
      date: false,
      template: false,
      status: false,
    };
  }

  onDropdownClick(event: Event): void {
    event.stopPropagation();
  }

  setDateFilter(value: 'ALL' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | 'CUSTOM'): void {
    this.selectedDateFilter = value;
    this.currentPage = 1;
  }

  formatDate(value: string): string {
    const [year, month, day] = value.split('-');
    return `${month}-${day}-${year}`;
  }

  toggleTemplate(template: string): void {
    if (this.selectedTemplates.has(template)) this.selectedTemplates.delete(template);
    else this.selectedTemplates.add(template);
    this.selectedTemplates = new Set(this.selectedTemplates);
    this.currentPage = 1;
  }

  toggleStatus(status: ArchiveReport['status']): void {
    if (this.selectedStatuses.has(status)) this.selectedStatuses.delete(status);
    else this.selectedStatuses.add(status);
    this.selectedStatuses = new Set(this.selectedStatuses);
    this.currentPage = 1;
  }

  clearFilter(type: 'template' | 'status' | 'date'): void {
    if (type === 'template') this.selectedTemplates.clear();
    if (type === 'status') this.selectedStatuses.clear();
    if (type === 'date') {
      this.selectedDateFilter = 'ALL';
      this.customDateFrom = '';
      this.customDateTo = '';
    }
    this.currentPage = 1;
  }

  matchesDateFilter(value: string): boolean {
    if (this.selectedDateFilter === 'ALL') return true;

    const date = new Date(value);
    const now = new Date();
    const beginningOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    if (this.selectedDateFilter === 'LAST_7') return date >= sevenDaysAgo;
    if (this.selectedDateFilter === 'LAST_30') return date >= thirtyDaysAgo;
    if (this.selectedDateFilter === 'THIS_MONTH') return date >= beginningOfMonth;
    if (this.selectedDateFilter === 'CUSTOM') {
      if (!this.customDateFrom || !this.customDateTo) return true;
      const from = new Date(this.customDateFrom);
      const to = new Date(this.customDateTo);
      to.setHours(23, 59, 59, 999);
      return date >= from && date <= to;
    }

    return true;
  }

  viewReport(report: ArchiveReport): void {
    console.log('View reports for', report.id);
  }

  retryReport(report: ArchiveReport): void {
    console.log('Retry report generation for', report.id);
  }

  downloadReport(report: ArchiveReport): void {
    console.log('Downloading', report.id, report.downloadUrl);
  }

  downloadSelected(): void {
    const ids = Array.from(this.selectedIds);
    console.log('Batch download', ids);
  }

  get allSelected(): boolean {
    return this.filteredReports.length > 0 &&
      this.filteredReports.every(r => this.selectedIds.has(r.id));
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredReports.forEach(r => {
      if (checked) this.selectedIds.add(r.id);
      else this.selectedIds.delete(r.id);
    });
    this.selectedIds = new Set(this.selectedIds);
  }

  toggleRow(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
    this.selectedIds = new Set(this.selectedIds);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.pageCount) return;
    this.currentPage = page;
    this.selectedIds.clear();
  }
}