import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Template } from '@pdfme/common';

export type PaperSize   = 'A4' | 'Letter' | 'Legal' | 'Custom';
export type Orientation = 'portrait' | 'landscape';

export interface SizeOption {
  key:      PaperSize;
  label:    string;      // e.g. "210 × 297 mm"
  widthMm:  number;      
  heightMm: number;      
}

@Component({
  selector: 'app-resolution-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe], //removed TitleCasePipe in the meantime
  templateUrl: './resolution-modal.html',
  styleUrl: './resolution-modal.css',
})
export class ResolutionModalComponent {

  @Input()  isOpen = false;
  @Output() close  = new EventEmitter<void>();

  // ── State ────────────────────────────────────────────────
  selectedSize: PaperSize   = 'A4';
  orientation:  Orientation = 'portrait';

  // Custom dimensions (only used when selectedSize === 'Custom')
  customWidth  = 210;
  customHeight = 297;

  // renderScale is internal — always 2x; not exposed to the user
  private readonly renderScale = 2;

  // ── Size catalogue ───────────────────────────────────────
  readonly sizes: SizeOption[] = [
    { key: 'A4',     label: '210 × 297 mm',       widthMm: 210,   heightMm: 297   },
    { key: 'Letter', label: '215.9 × 279.4 mm',   widthMm: 215.9, heightMm: 279.4 },
    { key: 'Legal',  label: '215.9 × 355.6 mm',   widthMm: 215.9, heightMm: 355.6 },
    { key: 'Custom', label: 'Set your own size',   widthMm: 210,   heightMm: 297   },
  ];

  constructor(private router: Router) {}

  // ── Computed dimensions (orientation applied) ────────────
  get effectiveWidth(): number {
    const base = this.selectedSize === 'Custom'
      ? this.customWidth
      : this.sizes.find(s => s.key === this.selectedSize)!.widthMm;
    const alt  = this.selectedSize === 'Custom'
      ? this.customHeight
      : this.sizes.find(s => s.key === this.selectedSize)!.heightMm;
    return this.orientation === 'landscape' ? Math.max(base, alt) : Math.min(base, alt);
  }

  get effectiveHeight(): number {
    const base = this.selectedSize === 'Custom'
      ? this.customWidth
      : this.sizes.find(s => s.key === this.selectedSize)!.widthMm;
    const alt  = this.selectedSize === 'Custom'
      ? this.customHeight
      : this.sizes.find(s => s.key === this.selectedSize)!.heightMm;
    return this.orientation === 'landscape' ? Math.min(base, alt) : Math.max(base, alt);
  }

  // CSS aspect-ratio for the live preview strip
  get livePreviewRatio(): string {
    return `${this.effectiveWidth} / ${this.effectiveHeight}`;
  }

  // aspect-ratio for each size card thumbnail (always portrait shape in card)
  getPreviewRatio(s: SizeOption): string {
    return s.key === 'Custom'
      ? '210 / 297'
      : `${s.widthMm} / ${s.heightMm}`;
  }

  // ── Helpers ──────────────────────────────────────────────
  selectSize(key: PaperSize): void {
    this.selectedSize = key;
  }

  canProceed(): boolean {
    if (this.selectedSize === 'Custom') {
      return this.customWidth  > 0 && this.customWidth  <= 1000
          && this.customHeight > 0 && this.customHeight <= 1000;
    }
    return true;
  }

  emitClose(): void {
    this.close.emit();
  }

  // ── Launch ───────────────────────────────────────────────
  launchPdfDesigner(): void {
    if (!this.canProceed()) return;

    const freshTemplate: Template = {
      basePdf: {
        width:   this.effectiveWidth,
        height:  this.effectiveHeight,
        padding: [0, 0, 0, 0],
      },
      schemas: [[]],
    };

    this.emitClose();

    this.router.navigate(['/editor'], {
      state: {
        template: freshTemplate,
        scale:    this.renderScale,
      },
    });
  }
}