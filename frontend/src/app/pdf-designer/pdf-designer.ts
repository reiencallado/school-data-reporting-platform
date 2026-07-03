import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Template } from '@pdfme/common';
import { Subscription } from 'rxjs';
import { Designer } from '@pdfme/ui';
import { text, barcodes, image, multiVariableText, rectangle, ellipse, line, table } from '@pdfme/schemas';
import { ReportTemplateService } from '../services/report-template.service';
import { ReportTemplate } from '../services/report-template.model';
import { HttpErrorResponse } from '@angular/common/http';
import html2canvas from 'html2canvas';

const PLUGINS = {
  Text:             text,
  'Multi-var Text': multiVariableText,
  'QR Code':        barcodes.qrcode,
  'Barcode':        barcodes.code128,
  Image:            image,
  Table:            table,
  Line:             line,
  Rectangle:        rectangle,
  Ellipse:          ellipse,
};

const BLANK_TEMPLATE = {
  basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
  schemas: [[]],
};

// Common paper sizes, in millimeters, matching pdfme's basePdf.width/height units.
export const PAPER_SIZES = [
  { id: 'a4', name: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  { id: 'letter', name: 'Letter (215.9 × 279.4 mm)', width: 215.9, height: 279.4 },
  { id: 'legal', name: 'Legal (215.9 × 355.6 mm)', width: 215.9, height: 355.6 },
  { id: 'certificate', name: 'Certificate (279.4 × 215.9 mm, landscape)', width: 279.4, height: 215.9 },
  { id: 'a3', name: 'A3 (297 × 420 mm)', width: 297, height: 420 },
  { id: 'a5', name: 'A5 (148 × 210 mm)', width: 148, height: 210 },
];

// Known seed schools (from the reseed.sql script). Placeholder until a real
// GET /api/schools endpoint + dropdown fetch exists.
export const SEED_SCHOOLS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Ateneo de Manila University' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'De La Salle University' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'University of the Philippines Diliman' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'University of Santo Tomas' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Mapúa University' },
  { id: '66666666-6666-6666-6666-666666666666', name: 'Polytechnic University of the Philippines' },
  { id: '77777777-7777-7777-7777-777777777777', name: 'Far Eastern University' },
  { id: '88888888-8888-8888-8888-888888888888', name: 'University of the East' },
  { id: '99999999-9999-9999-9999-999999999999', name: 'Adamson University' },
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'San Beda University' },
];

@Component({
  selector: 'app-pdf-designer',
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-designer.html',
  styleUrl: './pdf-designer.css',
})
export class PdfDesigner implements OnInit, OnDestroy {

  private designer?: Designer;

  // ── File name ────────────────────────────────────────────
  fileName    = 'Untitled Template';
  editingName = false;
  private nameSnapshot = '';   // used to restore on Escape

  @ViewChild('nameInput') nameInputRef?: ElementRef<HTMLInputElement>;

  constructor(private router: Router) {}

  // ── Lifecycle ────────────────────────────────────────────
  ngOnInit(): void {
    const nav   = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? window.history.state) as Record<string, unknown> | null;

    const template: Template = (state?.['template'] as Template) ?? DEFAULT_TEMPLATE;
    const scale:    number   = (state?.['scale']    as number)   ?? DEFAULT_SCALE;

    const container = document.getElementById('designer');
    if (!container) {
      console.error('PdfDesigner: #designer element not found.');
      return;
    }

    this.designer = new Designer({
      domContainer: container,
      template,
      options: { zoom: scale },
      plugins: PLUGINS,
    });
  }

  ngOnDestroy(): void {
    this.designer?.destroy();
  }

  // ── File name editing ────────────────────────────────────
  startEdit(): void {
    this.nameSnapshot = this.fileName;
    this.editingName  = true;
    // Focus the input after Angular renders it
    setTimeout(() => this.nameInputRef?.nativeElement.select(), 0);
  }

  commitName(): void {
    const trimmed = this.fileName.trim();
    this.fileName    = trimmed || this.nameSnapshot;   // don't allow blank
    this.editingName = false;
  }

  cancelEdit(): void {
    this.fileName    = this.nameSnapshot;
    this.editingName = false;
  }
}