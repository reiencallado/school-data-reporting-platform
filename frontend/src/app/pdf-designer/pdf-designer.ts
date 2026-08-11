import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Designer } from '@pdfme/ui';
import { Template } from '@pdfme/common';
import { text, barcodes, image, multiVariableText, rectangle, ellipse, line, table } from '@pdfme/schemas';
import { ReportTemplateService } from '../services/report-template.service';
import { ReportTemplate } from '../services/report-template.model';
import { StudentType, ROLE_STUDENT_TYPE_ACCESS } from '../services/student.model';
import { AuthService } from '../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import html2canvas from 'html2canvas';
import { ResolutionModalComponent, SizeSelection, PaperSize as ModalPaperSize } from '../shared/components/resolution-modal/resolution-modal';

export const PLUGINS = {
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

export const PAPER_SIZES = [
  { id: 'a4', name: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  { id: 'letter', name: 'Letter (215.9 × 279.4 mm)', width: 215.9, height: 279.4 },
  { id: 'legal', name: 'Legal (215.9 × 355.6 mm)', width: 215.9, height: 355.6 },
  { id: 'certificate', name: 'Certificate (279.4 × 215.9 mm, landscape)', width: 279.4, height: 215.9 },
  { id: 'a3', name: 'A3 (297 × 420 mm)', width: 297, height: 420 },
  { id: 'a5', name: 'A5 (148 × 210 mm)', width: 148, height: 210 },
  { id: 'custom', name: 'Custom size', width: 210, height: 297 },
];

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

export interface PresetField {
  label: string;
  variable: string;
}

export interface PresetFieldGroup {
  label: string;
  fields: PresetField[];
}

export const PRESET_FIELD_GROUPS: PresetFieldGroup[] = [
  {
    label: 'Student Info',
    fields: [
      { label: 'Student Name', variable: 'studentName' },
      { label: 'Student ID', variable: 'studentId' },
    ],
  },
  {
    label: 'K12',
    fields: [
      { label: 'Grade Level', variable: 'gradeLevel' },
      { label: 'Strand', variable: 'strand' },
      { label: 'Section', variable: 'section' },
    ],
  },
  {
    label: 'College',
    fields: [
      { label: 'Course', variable: 'course' },
      { label: 'Year Level', variable: 'yearLevel' },
    ],
  },
  {
    label: 'Document Info',
    fields: [
      { label: 'Issuance Date', variable: 'issuanceDate' },
    ],
  },
];

export const PRESET_FIELDS: PresetField[] = PRESET_FIELD_GROUPS.flatMap(g => g.fields);

export const STUDENT_TYPES: { id: StudentType; label: string }[] = [
  { id: 'K12', label: 'K12' },
  { id: 'COLLEGE', label: 'College' },
  { id: 'ADMISSIONS', label: 'Admissions' },
];

@Component({
  selector: 'app-pdf-designer',
  imports: [CommonModule, FormsModule, ResolutionModalComponent],
  templateUrl: './pdf-designer.html',
  styleUrl: './pdf-designer.css',
})
export class PdfDesigner implements OnInit, OnDestroy {

  private designer!: Designer;
  templateId: string | null = null;
  private paramSub?: Subscription;
  private incomingTemplate?: Template;
  currentStudentType: StudentType | null = null;
  studentTypes = STUDENT_TYPES;

  // The type dropdown is only shown to ROLE_ADMIN — every other role can
  // only ever create templates for their own single accessible type
  // anyway, so it's auto-assigned instead (see applyRoleDefaultStudentType).
  isAdmin = false;

  currentName = 'Untitled Template';
  currentSchoolId = '';
  schools = SEED_SCHOOLS;
  currentPaperSizeId = 'a4';
  paperSizes = PAPER_SIZES;
  saveError: string | null = null;

  showSizeModal = false;

  // ── Preset field drawer ──────────────────────────────────
  presetFieldGroups = PRESET_FIELD_GROUPS;
  showPresetDrawer = false;

  togglePresetDrawer(): void {
    this.showPresetDrawer = !this.showPresetDrawer;
  }

  insertPresetField(preset: PresetField): void {
    if (!this.designer) return;

    const current = this.designer.getTemplate();
    // Shallow-copy pages/rows so we don't mutate pdfme's internal state directly.
    const schemas = current.schemas.map((page: any[]) => [...page]) as any[][];
    if (!schemas[0]) schemas[0] = [];
    const targetPage = schemas[0];

    const name = this.uniqueSchemaName(preset.variable, targetPage);

    targetPage.push({
      name,
      type: 'multiVariableText',
      content: JSON.stringify({ [preset.variable]: preset.label }),
      text: `{${preset.variable}}`,
      variables: [preset.variable],
      position: { x: 20, y: 20 },
      width: 60,
      height: 10,
    });

    this.designer.updateTemplate({ ...current, schemas });

    // This is a genuine user edit - let autosave pick it up like any
    // other canvas change (mirrors onChangeTemplate's behavior).
    this.autosaveStatus = 'Unsaved changes…';
    this.changeSubject.next();
  }

  onStudentTypeChange(): void {
    this.autosaveStatus = 'Unsaved changes…';
    this.changeSubject.next();
  }

  // Guards against two presets silently colliding on the same schema name,
  // which would make one overwrite the other's value in
  // buildInputsForStudent()'s output map at generation time.
  private uniqueSchemaName(base: string, page: any[]): string {
    const existing = new Set(page.map((s) => s.name));
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base}_${i}`)) i++;
    return `${base}_${i}`;
  }

  // ── Autosave ─────────────────────────────────────────────
  autosaveStatus: string | null = null;
  private autosaveSub?: Subscription;
  private changeSubject = new Subject<void>();
  private suppressAutosave = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reportTemplateService: ReportTemplateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {
    this.isAdmin = this.authService.isAdmin();

    const navState = this.router.getCurrentNavigation()?.extras?.state as
      { template?: Template; scale?: number; studentType?: StudentType } | undefined;
    this.incomingTemplate = navState?.template;

    if (this.isAdmin) {
      // Admins pick both explicitly — they aren't tied to one school or
      // one student type, so nothing to auto-assign here.
      this.currentStudentType = navState?.studentType ?? null;
    } else {
      // Non-admins are locked to their own account's school and single
      // accessible student type — no picker needed, and this also
      // prevents e.g. a ROLE_K12 user creating a template tagged for a
      // different school or type than their own.
      this.currentSchoolId = this.authService.getCurrentSchoolId() ?? '';
      this.currentStudentType = this.getRoleDefaultStudentType();
    }
  }

  /**
   * The single StudentType a non-admin role is allowed to create
   * templates for, derived from the same role→type access map used
   * elsewhere (student.model.ts). Returns null if the role has no
   * mapped type at all (shouldn't normally happen for a logged-in user).
   */
  private getRoleDefaultStudentType(): StudentType | null {
    const role = this.authService.getCurrentRole();
    const allowed = role ? ROLE_STUDENT_TYPE_ACCESS[role] : [];
    return allowed && allowed.length > 0 ? allowed[0] : null;
  }

  ngOnInit() {
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.templateId = id;
      this.loadTemplate(id);
    });

    this.autosaveSub = this.changeSubject.pipe(debounceTime(1500)).subscribe(() => {
      this.autosaveStatus = 'Saving…';
      this.saveTemplate(true);
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
    this.autosaveSub?.unsubscribe();
  }

  private loadTemplate(id: string | null): void {
    this.currentName = 'Untitled Template';

    if (id) {
      // About to load real data for a specific existing template — reset
      // first so stale values from a previous template (if this component
      // instance is reused) don't briefly show before the fetch resolves.
      this.currentSchoolId = '';
      this.currentStudentType = null;

      this.reportTemplateService.getTemplateById(id).subscribe({
        next: (template: ReportTemplate) => {
          this.currentName = template.name;
          this.currentSchoolId = (template.school as any)?.id ?? '';
          this.currentStudentType = template.studentType ?? null;

          let parsedTemplate = BLANK_TEMPLATE;
          try {
            parsedTemplate = JSON.parse(template.configuration);
          } catch (e) {
            console.error('Failed to parse template configuration JSON, falling back to blank template:', e);
          }

          this.currentPaperSizeId = this.detectPaperSizeId(parsedTemplate?.basePdf);
          this.cdr.detectChanges();
          this.initDesigner(parsedTemplate);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Failed to fetch report template:', err);
          this.initDesigner(BLANK_TEMPLATE);
        },
      });
    } else if (this.incomingTemplate) {
      // No reset here — currentSchoolId/currentStudentType were already
      // correctly set in the constructor (auto-assigned for non-admins,
      // or from navState/left for the dropdown for admins).
      this.currentPaperSizeId = this.detectPaperSizeId(this.incomingTemplate.basePdf as any);
      this.cdr.detectChanges();
      this.initDesigner(this.incomingTemplate);
    } else {
      // Same reasoning — brand new blank template, constructor's values stand.
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

  private detectPaperSizeId(basePdf: { width: number; height: number } | undefined): string {
    if (!basePdf) return 'a4';
    const EPSILON = 0.5;
    const match = this.paperSizes.find(s =>
      s.id !== 'custom' &&
      Math.abs(s.width - basePdf.width) < EPSILON &&
      Math.abs(s.height - basePdf.height) < EPSILON
    );
    return match?.id ?? 'custom';
  }

  // ── Resolution modal (resize existing template) ──────────
  get currentBasePdfDims(): { width: number; height: number } {
    const bp = this.designer?.getTemplate()?.basePdf as any;
    if (bp) return { width: bp.width, height: bp.height };
    const preset = this.paperSizes.find(s => s.id === this.currentPaperSizeId) ?? this.paperSizes[0];
    return { width: preset.width, height: preset.height };
  }

  get paperSizeButtonLabel(): string {
    const { width, height } = this.currentBasePdfDims;
    const preset = this.paperSizes.find(s => s.id === this.currentPaperSizeId);
    const orient = width > height ? 'Landscape' : 'Portrait';
    return preset && preset.id !== 'custom'
      ? `${preset.name.split(' (')[0]} · ${orient}`
      : `Custom · ${width.toFixed(1)} × ${height.toFixed(1)} mm`;
  }

  get modalInitialSize(): ModalPaperSize {
    const map: Record<string, ModalPaperSize> = { a4: 'A4', letter: 'Letter', legal: 'Legal' };
    return map[this.currentPaperSizeId] ?? 'Custom';
  }

  get modalInitialOrientation(): 'portrait' | 'landscape' {
    const { width, height } = this.currentBasePdfDims;
    return width > height ? 'landscape' : 'portrait';
  }

  get modalInitialCustomWidth(): number  { return this.currentBasePdfDims.width; }
  get modalInitialCustomHeight(): number { return this.currentBasePdfDims.height; }

  onSizeModalConfirm(sel: SizeSelection): void {
    const idMap: Record<ModalPaperSize, string> = { A4: 'a4', Letter: 'letter', Legal: 'legal', Custom: 'custom' };
    this.currentPaperSizeId = idMap[sel.paperSizeId];

    const existingSchemas = this.designer ? this.designer.getTemplate().schemas : [[]];
    this.initDesigner({
      basePdf: { width: sel.width, height: sel.height, padding: [10, 10, 10, 10] },
      schemas: existingSchemas,
    });
  }

  private initDesigner(template: any) {
    const container = document.getElementById('designer')!;
    container.innerHTML = '';

    this.suppressAutosave = true;

    this.designer = new Designer({
      domContainer: container,
      template,
      plugins: PLUGINS,
    });

    this.designer.onChangeTemplate(() => {
      if (this.suppressAutosave) return;
      this.autosaveStatus = 'Unsaved changes…';
      this.changeSubject.next();
    });

    // Let the initial onChangeTemplate fire (if any) settle before
    // treating further changes as real user edits.
    setTimeout(() => { this.suppressAutosave = false; }, 0);
  }

  saveTemplate(isAutosave = false): void {
    if (!this.designer) return;

    if (!this.currentSchoolId) {
      if (!isAutosave) this.saveError = 'Please select a school before saving.';
      return;
    }

    const currentTemplate = this.designer.getTemplate();
    const configuration = JSON.stringify(currentTemplate);

    const payload: ReportTemplate = {
      name: this.currentName,
      configuration,
      school: { id: this.currentSchoolId } as any,
      studentType: this.currentStudentType ?? undefined,
    };

    this.saveError = null;

    if (this.templateId) {
      this.reportTemplateService.updateTemplate(this.templateId, payload).subscribe({
        next: () => {
          const thumbPromise = this.captureAndUploadThumbnail(this.templateId!);
          if (isAutosave) {
            this.autosaveStatus = 'Saved';
            setTimeout(() => this.autosaveStatus = null, 1500);
          } else {
            thumbPromise.finally(() => this.router.navigate(['/templates']));
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error('Failed to update template:', err);
          if (!isAutosave) this.saveError = 'Failed to save template.';
          this.autosaveStatus = 'Save failed';
        },
      });
    } else {
      this.reportTemplateService.createTemplate(payload).subscribe({
        next: (created) => {
          this.templateId = created.id ?? null;
          const thumbPromise = this.templateId
            ? this.captureAndUploadThumbnail(this.templateId)
            : Promise.resolve();
          if (isAutosave) {
            this.autosaveStatus = 'Saved';
            setTimeout(() => this.autosaveStatus = null, 1500);
          } else {
            thumbPromise.finally(() => this.router.navigate(['/templates']));
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error('Failed to create template:', err);
          if (!isAutosave) this.saveError = 'Failed to create template.';
          this.autosaveStatus = 'Save failed';
        },
      });
    }
  }

  private captureAndUploadThumbnail(id: string): Promise<void> {
    const container = document.getElementById('designer');
    if (!container) return Promise.resolve();

    return html2canvas(container, { scale: 0.5 }).then((canvas: HTMLCanvasElement) => {
      return new Promise<void>((resolve) => {
        canvas.toBlob((blob: Blob | null) => {
          if (!blob) { resolve(); return; }
          this.reportTemplateService.uploadThumbnail(id, blob).subscribe({
            next: () => resolve(),
            error: (err: HttpErrorResponse) => {
              console.error('Failed to upload thumbnail:', err);
              resolve();
            },
          });
        }, 'image/png');
      });
    }).catch((err: unknown) => {
      console.error('Failed to capture thumbnail:', err);
    });
  }
}