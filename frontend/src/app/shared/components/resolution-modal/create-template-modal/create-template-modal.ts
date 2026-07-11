import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { STARTER_TEMPLATES, StarterTemplate } from '../../../pages/starter-templates.manifest';
import { TemplateCard } from '../../../pages/templates/templates';

@Component({
  selector: 'app-create-template-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './create-template-modal.html',
  styleUrl: './create-template-modal.css',
})
export class CreateTemplateModal {
  @Input() isOpen = false;
  @Input() recentTemplates: TemplateCard[] = []; // pass in `this.templates` from Templates component, sliced/sorted

  @Output() close = new EventEmitter<void>();
  @Output() blankSelected = new EventEmitter<void>();
  @Output() templateSelected = new EventEmitter<StarterTemplate>();
  @Output() recentSelected = new EventEmitter<TemplateCard>();

  starterTemplates = STARTER_TEMPLATES;
  activeCategory: 'RECENT' | 'ALL' | 'K12' | 'COLLEGE' | 'ADMISSIONS' = 'ALL';

  templatesForCategory(category: string): StarterTemplate[] {
    return this.starterTemplates.filter(t => t.category === category);
  }
}