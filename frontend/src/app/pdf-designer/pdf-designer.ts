import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Designer } from '@pdfme/ui';
import { text, barcodes, image, multiVariableText, rectangle, ellipse, line, table } from '@pdfme/schemas';
import { ReportTemplateService } from '../services/report-template.service';
import { ReportTemplate } from '../services/report-template.model';
import { HttpErrorResponse } from '@angular/common/http';
import html2canvas from 'html2canvas';

const PLUGINS = {
  Text: text,
  'Multi-var Text': multiVariableText,
  'QR Code': barcodes.qrcode,
  'Barcode': barcodes.code128,
  Image: image,
  Table: table,
  Line: line,
  Rectangle: rectangle,
  Ellipse: ellipse,
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

  private designer!: Designer;
  templateId: string | null = null;
  private paramSub?: Subscription;

  // Bound to the editable title input in the header.
  currentName = 'Untitled Template';

  // Bound to the school dropdown, shown only when creating a new template.
  currentSchoolId = '';
  schools = SEED_SCHOOLS;

  // Bound to the resolution dropdown, shown only when creating a new template.
  currentPaperSizeId = 'a4';
  paperSizes = PAPER_SIZES;

  saveError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private reportTemplateService: ReportTemplateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // Reactive subscription instead of a one-time snapshot read, so this
    // correctly re-fetches every time the :id param actually changes —
    // including cases where Angular reuses this component instance
    // between navigations instead of destroying/recreating it.
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.templateId = id;
      this.loadTemplate(id);
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
  }

  private loadTemplate(id: string | null): void {
    // Reset to defaults before loading, so stale data from a previously
    // viewed template never lingers on screen while the new one fetches.
    this.currentName = 'Untitled Template';
    this.currentSchoolId = '';

    if (id) {
      this.reportTemplateService.getTemplateById(id).subscribe({
        next: (template: ReportTemplate) => {
          this.currentName = template.name;
          this.currentSchoolId = (template.school as any)?.id ?? '';

          // Force an immediate repaint here — without this, the input's
          // displayed value can lag behind the actual component state
          // until some unrelated DOM event (e.g. clicking into the field)
          // triggers Angular's next change detection cycle.
          this.cdr.detectChanges();

          let parsedTemplate = BLANK_TEMPLATE;
          try {
            parsedTemplate = JSON.parse(template.configuration);
          } catch (e) {
            console.error('Failed to parse template configuration JSON, falling back to blank template:', e);
          }
          this.initDesigner(parsedTemplate);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Failed to fetch report template:', err);
          this.initDesigner(BLANK_TEMPLATE);
        },
      });
    } else {
      // No id in the route (e.g. /editor for a brand new template): start
      // blank, using whatever paper size is currently selected.
      this.initDesigner(this.buildBlankTemplate());
    }
  }

  private buildBlankTemplate(): any {
    const size = this.paperSizes.find(s => s.id === this.currentPaperSizeId) ?? this.paperSizes[0];
    return {
      basePdf: { width: size.width, height: size.height, padding: [10, 10, 10, 10] },
      schemas: [[]],
    };
  }

  /**
   * Called when the resolution dropdown changes, while still creating a
   * brand new template (no id yet). Rebuilds the designer with the new
   * page size — only safe to do before any real content has been saved,
   * since changing basePdf dimensions on an existing template's saved
   * schemas would misalign already-placed elements.
   */
  onPaperSizeChange(): void {
    if (this.templateId) return; // don't resize an existing template
    this.initDesigner(this.buildBlankTemplate());
  }

  private initDesigner(template: any) {
    const container = document.getElementById('designer')!;
    container.innerHTML = ''; // clear any previously rendered designer instance
    this.designer = new Designer({
      domContainer: container,
      template,
      plugins: PLUGINS,
    });
  }

  saveTemplate(): void {
    if (!this.designer) return;

    if (!this.currentSchoolId) {
      this.saveError = 'Please select a school before saving.';
      return;
    }

    // Pull the current canvas state directly from pdfme — this is the
    // correct { basePdf, schemas } shape, generated by pdfme itself.
    const currentTemplate = this.designer.getTemplate();
    const configuration = JSON.stringify(currentTemplate);

    const payload: ReportTemplate = {
      name: this.currentName,
      configuration,
      school: { id: this.currentSchoolId } as any,
    };

    this.saveError = null;

    if (this.templateId) {
      // Silent update — no popup, no button state change (auto-save friendly)
      this.reportTemplateService.updateTemplate(this.templateId, payload).subscribe({
        next: () => this.captureAndUploadThumbnail(this.templateId!),
        error: (err: HttpErrorResponse) => {
          console.error('Failed to update template:', err);
          this.saveError = 'Failed to save template.';
        },
      });
    } else {
      this.reportTemplateService.createTemplate(payload).subscribe({
        next: (created) => {
          this.templateId = created.id ?? null;
          if (this.templateId) {
            this.captureAndUploadThumbnail(this.templateId);
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error('Failed to create template:', err);
          this.saveError = 'Failed to create template.';
        },
      });
    }
  }

  /**
   * Screenshots the rendered designer canvas and uploads it as the
   * template's grid thumbnail. Runs after a successful save, so the
   * thumbnail always reflects the latest saved state — not a live render
   * done every time the grid loads (too slow for a grid of many cards).
   */
  private captureAndUploadThumbnail(id: string): void {
    const container = document.getElementById('designer');
    if (!container) return;

    html2canvas(container, { scale: 0.5 }).then((canvas: HTMLCanvasElement) => {
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
        this.reportTemplateService.uploadThumbnail(id, blob).subscribe({
          error: (err: HttpErrorResponse) => {
            console.error('Failed to upload thumbnail:', err);
          },
        });
      }, 'image/png');
    }).catch((err: unknown) => {
      console.error('Failed to capture thumbnail:', err);
    });
  }
}