import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-template-thumbnail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-thumbnail.html',
  styleUrl: './template-thumbnail.css',
})
export class TemplateThumbnailComponent {
  @Input() thumbnailUrl?: string | null;
  @Input() template?: any;
  @Input() label = '';

  get basePdfWidth(): number {
    return this.template?.basePdf?.width ?? 210;
  }

  get basePdfHeight(): number {
    return this.template?.basePdf?.height ?? 297;
  }

  get blocks(): { x: number; y: number; w: number; h: number; kind: string }[] {
    const page = this.template?.schemas?.[0];
    if (!Array.isArray(page)) return [];
    return page
      .filter((s: any) => s && typeof s === 'object')
      .map((s: any) => ({
        x: s.position?.x ?? 0,
        y: s.position?.y ?? 0,
        w: s.width ?? 10,
        h: s.height ?? 5,
        kind: this.blockKind(s.type),
      }));
  }

  private blockKind(type: string): string {
    if (type === 'image') return 'image';
    if (type === 'qrcode' || type === 'barcode') return 'code';
    if (type === 'line') return 'line';
    return 'text'; // text, multiVariableText, and anything unrecognized
  }

  get hasLivePreview(): boolean {
    return !this.thumbnailUrl && this.blocks.length > 0;
  }
}