import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ResolutionModalComponent } from '../../../shared/components/resolution-modal/resolution-modal';
import { TemplateThumbnailComponent } from '../../../shared/components/template-thumbnail/template-thumbnail';
import { STARTER_TEMPLATES, StarterTemplate } from '../../starter-templates.manifest';
import { AuthService } from '../../../services/auth.service';
import { ROLE_STUDENT_TYPE_ACCESS } from '../../../services/student.model';
import { TemplateReportKind } from '../../../services/report-template.model';

export type WizardStudentType = 'K12' | 'COLLEGE' | 'ADMISSIONS';

interface StudentTypeOption {
  key: WizardStudentType;
  label: string;
  sub: string;
}

interface ReportKindOption {
  key: TemplateReportKind;
  label: string;
  sub: string;
}

@Component({
  selector: 'app-template-creation-wizard',
  standalone: true,
  imports: [CommonModule, ResolutionModalComponent, TemplateThumbnailComponent],
  templateUrl: './template-creation-wizard.html',
  styleUrl: './template-creation-wizard.css',
})
export class TemplateCreationWizard implements OnChanges {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  // ── Step 0: what kind of report is this? ──
  // Applies to EVERYONE, admin or not
  reportKindOptions: ReportKindOption[] = [
    { key: 'STUDENT', label: 'Student Records', sub: 'For individual student profiles and records' },
    { key: 'DATA',    label: 'School Data',      sub: 'For institutional metrics and aggregate reporting' },
  ];

  // ── Step 1 (STUDENT path only): which roster? ──
  studentTypeOptions: StudentTypeOption[] = [
    { key: 'K12',        label: 'K12',        sub: 'Grade school & high school' },
    { key: 'COLLEGE',    label: 'College',    sub: 'Tertiary / university'       },
    { key: 'ADMISSIONS', label: 'Admissions', sub: 'Applicants, not yet enrolled' },
  ];

  step: 'kind' | 'type' | 'pick' = 'kind';
  selectedReportKind: TemplateReportKind | null = null;
  selectedStudentType: WizardStudentType | null = null;
  showResolutionModal = false;

  constructor(private router: Router, private authService: AuthService) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  private get assignedStudentType(): WizardStudentType | null {
    const role = this.authService.getCurrentRole();
    if (!role || role === 'ROLE_ADMIN') return null;
    const types = ROLE_STUDENT_TYPE_ACCESS[role];
    return (types?.[0] as WizardStudentType) ?? null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen'] || !this.isOpen) return;
    this.step = 'kind';
    this.selectedReportKind = null;
    this.selectedStudentType = null;
  }

  chooseReportKind(kind: TemplateReportKind): void {
    this.selectedReportKind = kind;

    if (kind === 'DATA') {
      this.selectedStudentType = null;
      this.step = 'pick';
      return;
    }

    // STUDENT path: admins choose explicitly
    if (!this.isAdmin && this.assignedStudentType) {
      this.selectedStudentType = this.assignedStudentType;
      this.step = 'pick';
    } else {
      this.step = 'type';
    }
  }

  chooseStudentType(type: WizardStudentType): void {
    this.selectedStudentType = type;
    this.step = 'pick';
  }

  back(): void {
    if (this.step === 'pick') {
      this.step = (this.selectedReportKind === 'STUDENT' && this.isAdmin) ? 'type' : 'kind';
      return;
    }
    if (this.step === 'type') {
      this.step = 'kind';
    }
  }

  get matchingStarters(): StarterTemplate[] {
    if (!this.selectedReportKind) return [];

    if (this.selectedReportKind === 'DATA') {
      return STARTER_TEMPLATES.filter(t => t.reportKind === 'DATA');
    }

    if (!this.selectedStudentType) return [];
    return STARTER_TEMPLATES.filter(t => t.reportKind === 'STUDENT' && t.category === this.selectedStudentType);
  }

  pickStarter(t: StarterTemplate): void {
    this.router.navigate(['/editor'], {
      state: {
        template: t.template,
        studentType: this.selectedStudentType,
        reportKind: this.selectedReportKind,
      },
    });
    this.reset();
  }

  pickCustom(): void {
    this.showResolutionModal = true;
  }

  get customExtraState(): Record<string, any> {
    return { studentType: this.selectedStudentType, reportKind: this.selectedReportKind };
  }

  closeResolutionModal(): void {
    this.showResolutionModal = false;
  }

  reset(): void {
    this.step = 'kind';
    this.selectedReportKind = null;
    this.selectedStudentType = null;
    this.showResolutionModal = false;
    this.closed.emit();
  }
}