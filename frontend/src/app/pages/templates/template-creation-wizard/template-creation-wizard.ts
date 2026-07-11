import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ResolutionModalComponent } from '../../../shared/components/resolution-modal/resolution-modal';
import { TemplateThumbnailComponent } from '../../../shared/components/template-thumbnail/template-thumbnail';
import { STARTER_TEMPLATES, StarterTemplate, DOC_TYPES, DocType } from '../../starter-templates.manifest';

// Place at: app/pages/templates/template-creation-wizard/template-creation-wizard.ts

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
export class TemplateCreationWizard {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  studentTypeOptions: StudentTypeOption[] = [
    { key: 'K12',        label: 'K12',        sub: 'Grade school & high school' },
    { key: 'COLLEGE',    label: 'College',    sub: 'Tertiary / university'       },
    { key: 'ADMISSIONS', label: 'Admissionss', sub: 'Applicants, not yet enrolled' },
  ];

  // 2 steps instead of 3 — student type is a real technical constraint
  // (it determines which data fields exist to autofill), so it stays a
  // gate. "Purpose" (doc type) isn't structural, just a category label —
  // shown as a badge on each preset card instead of a forced step, since
  // with only a handful of starters, gating on both axes mostly produced
  // dead ends ("no default yet") rather than useful narrowing.
  step: 'type' | 'pick' = 'type';
  selectedStudentType: WizardStudentType | null = null;
  showResolutionModal = false;

  constructor(private router: Router) {}

  chooseStudentType(type: WizardStudentType): void {
    this.selectedStudentType = type;
    this.step = 'pick';
  }

  back(): void {
    if (this.step === 'pick') this.step = 'type';
  }

  get matchingStarters(): StarterTemplate[] {
    if (!this.selectedStudentType) return [];
    const wantCategory = this.selectedStudentType === 'ADMISSIONS' ? 'ADMISSIONS' : this.selectedStudentType;
    return STARTER_TEMPLATES.filter(t => t.category === wantCategory);
  }

  docTypeLabel(docType: DocType): string {
    return DOC_TYPES.find(d => d.key === docType)?.label ?? docType;
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
    this.step = 'type';
    this.selectedStudentType = null;
    this.showResolutionModal = false;
    this.closed.emit();
  }
}