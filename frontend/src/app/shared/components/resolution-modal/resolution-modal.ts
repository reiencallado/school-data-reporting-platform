// resolution-modal.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Template } from '@pdfme/common';

export type PaperSize   = 'A4' | 'Letter' | 'Legal' | 'Custom';
export type Orientation = 'portrait' | 'landscape';
export type ModalMode   = 'create' | 'update';

export interface SizeOption {
  key:      PaperSize;
  label:    string;
  widthMm:  number;
  heightMm: number;
}

export interface SizeSelection {
  paperSizeId: PaperSize;
  orientation: Orientation;
  width:  number;
  height: number;
}

@Component({
  selector: 'app-resolution-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './resolution-modal.html',
  styleUrl: './resolution-modal.css',
})
export class ResolutionModalComponent implements OnChanges {

  @Input()  isOpen = false;
  @Output() close  = new EventEmitter<void>();

  @Input()  mode: ModalMode = 'create';
  @Output() sizeConfirmed = new EventEmitter<SizeSelection>();

  @Input() initialSize?: PaperSize;
  @Input() initialOrientation?: Orientation;
  @Input() initialCustomWidth?: number;
  @Input() initialCustomHeight?: number;
  @Input() initialSchemas?: any[][];
  @Input() extraState?: Record<string, any>;

  selectedSize: PaperSize   = 'A4';
  orientation:  Orientation = 'portrait';
  customWidth  = 210;
  customHeight = 297;

  private readonly renderScale = 2;

  readonly sizes: SizeOption[] = [
    { key: 'A4',     label: '210 × 297 mm',      widthMm: 210,   heightMm: 297   },
    { key: 'Letter', label: '215.9 × 279.4 mm',  widthMm: 215.9, heightMm: 279.4 },
    { key: 'Legal',  label: '215.9 × 355.6 mm',  widthMm: 215.9, heightMm: 355.6 },
    { key: 'Custom', label: 'Set your own size',  widthMm: 210,   heightMm: 297   },
  ];

  constructor(private router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.mode === 'update') {
      this.selectedSize = this.initialSize        ?? this.selectedSize;
      this.orientation  = this.initialOrientation ?? this.orientation;
      this.customWidth  = this.initialCustomWidth  ?? this.customWidth;
      this.customHeight = this.initialCustomHeight ?? this.customHeight;
    }
  }

  get effectiveWidth(): number {
    const base = this.selectedSize === 'Custom' ? this.customWidth  : this.sizes.find(s => s.key === this.selectedSize)!.widthMm;
    const alt  = this.selectedSize === 'Custom' ? this.customHeight : this.sizes.find(s => s.key === this.selectedSize)!.heightMm;
    return this.orientation === 'landscape' ? Math.max(base, alt) : Math.min(base, alt);
  }

  get effectiveHeight(): number {
    const base = this.selectedSize === 'Custom' ? this.customWidth  : this.sizes.find(s => s.key === this.selectedSize)!.widthMm;
    const alt  = this.selectedSize === 'Custom' ? this.customHeight : this.sizes.find(s => s.key === this.selectedSize)!.heightMm;
    return this.orientation === 'landscape' ? Math.min(base, alt) : Math.max(base, alt);
  }

  get livePreviewRatio(): string {
    return `${this.effectiveWidth} / ${this.effectiveHeight}`;
  }

  getPreviewRatio(s: SizeOption): string {
    return s.key === 'Custom' ? '210 / 297' : `${s.widthMm} / ${s.heightMm}`;
  }

  get confirmLabel(): string {
    return this.mode === 'update' ? 'Update Size' : 'Open Editor';
  }

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

  confirm(): void {
    if (!this.canProceed()) return;

    if (this.mode === 'update') {
      this.sizeConfirmed.emit({
        paperSizeId: this.selectedSize,
        orientation: this.orientation,
        width:  this.effectiveWidth,
        height: this.effectiveHeight,
      });
      this.emitClose();
      return;
    }

    const freshTemplate: Template = {
      basePdf: { width: this.effectiveWidth, height: this.effectiveHeight, padding: [0, 0, 0, 0] },
      schemas: this.initialSchemas ?? [[]],
    };

    this.emitClose();

    this.router.navigate(['/editor'], {
      state: { template: freshTemplate, scale: this.renderScale, ...(this.extraState ?? {}) },
    });
  }
}