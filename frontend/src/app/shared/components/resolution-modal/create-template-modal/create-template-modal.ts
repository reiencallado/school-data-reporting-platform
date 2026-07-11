import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { STARTER_TEMPLATES, StarterTemplate } from '../../../../pages/starter-templates.manifest';
import { TemplateCard } from '../../../../pages/templates/templates';
import { StudentType } from '../../../../services/student.model';

@Component({
  selector: 'app-create-template-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './create-template-modal.html',
  styleUrl: './create-template-modal.css',
})
export class CreateTemplateModal {
  @Input() isOpen = false;
  @Input() recentTemplates: TemplateCard[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() blankSelected = new EventEmitter<void>();
  @Output() templateSelected = new EventEmitter<StarterTemplate>();
  @Output() recentSelected = new EventEmitter<TemplateCard>();

  starterTemplates = STARTER_TEMPLATES;
  activeCategory: 'RECENT' | 'ALL' | StudentType = 'ALL';

  templatesForCategory(category: StudentType): StarterTemplate[] {
    return this.starterTemplates.filter(t => t.category === category);
  }

  onBackdropClick(): void {
    this.close.emit();
  }
}