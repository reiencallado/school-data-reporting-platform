import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ResolutionModalComponent } from '../../../shared/components/resolution-modal/resolution-modal';
import { TemplateThumbnailComponent } from '../../../shared/components/template-thumbnail/template-thumbnail';
import { STARTER_TEMPLATES, StarterTemplate } from '../../starter-templates.manifest';
import { AuthService } from '../../../services/auth.service';
import { ROLE_STUDENT_TYPE_ACCESS } from '../../../services/student.model';

export type WizardStudentType = 'K12' | 'COLLEGE' | 'ADMISSIONS';

interface StudentTypeOption {
  key: WizardStudentType;
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

  studentTypeOptions: StudentTypeOption[] = [
    { key: 'K12',        label: 'K12',        sub: 'Grade school & high school' },
    { key: 'COLLEGE',    label: 'College',    sub: 'Tertiary / university'       },
    { key: 'ADMISSIONS', label: 'Admissions', sub: 'Applicants, not yet enrolled' },
  ];

  step: 'type' | 'pick' = 'type';
  selectedStudentType: WizardStudentType | null = null;
  showResolutionModal = false;

  constructor(private router: Router, private authService: AuthService) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * The single StudentType a non-admin role is allowed to create
   * templates for, derived from ROLE_STUDENT_TYPE_ACCESS — non-admin
   * roles always map to exactly one type there (see student.model.ts).
   * Admins get null here since they pick manually via the 'type' step.
   */
  private get assignedStudentType(): WizardStudentType | null {
    const role = this.authService.getCurrentRole();
    if (!role || role === 'ROLE_ADMIN') return null;
    const types = ROLE_STUDENT_TYPE_ACCESS[role];
    return (types?.[0] as WizardStudentType) ?? null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Skip the "Who is this template for?" step entirely for non-admins —
    // their student type is fixed by role, not a choice, same pattern
    // already applied to pdf-designer/students/generate-report.
    if (!changes['isOpen'] || !this.isOpen) return;

    if (!this.isAdmin && this.assignedStudentType) {
      this.selectedStudentType = this.assignedStudentType;
      this.step = 'pick';
    } else {
      this.step = 'type';
      this.selectedStudentType = null;
    }
  }

  chooseStudentType(type: WizardStudentType): void {
    this.selectedStudentType = type;
    this.step = 'pick';
  }

  back(): void {
    // Non-admins never had a 'type' step to return to — their flow starts
    // at 'pick' — so this is a no-op for them. The template also hides
    // the back button in that case; this guard is defense-in-depth.
    if (this.step === 'pick' && this.isAdmin) this.step = 'type';
  }

  get matchingStarters(): StarterTemplate[] {
    if (!this.selectedStudentType) return [];
    const wantCategory = this.selectedStudentType === 'ADMISSIONS' ? 'ADMISSIONS' : this.selectedStudentType;
    return STARTER_TEMPLATES.filter(t => t.category === wantCategory);
  }

  pickStarter(t: StarterTemplate): void {
    this.router.navigate(['/editor'], {
      state: { template: t.template, studentType: this.selectedStudentType },
    });
    this.reset();
  }

  pickCustom(): void {
    this.showResolutionModal = true;
  }

  get customExtraState(): Record<string, any> {
    return { studentType: this.selectedStudentType };
  }

  closeResolutionModal(): void {
    this.showResolutionModal = false;
  }

  reset(): void {
    // Re-derive rather than hardcode 'type', so a non-admin who closes
    // and reopens doesn't flash the type-selection screen they're not
    // supposed to see, even before ngOnChanges runs again.
    if (this.isAdmin) {
      this.step = 'type';
      this.selectedStudentType = null;
    } else {
      this.step = 'pick';
      this.selectedStudentType = this.assignedStudentType;
    }
    this.showResolutionModal = false;
    this.closed.emit();
  }
}