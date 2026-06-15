import { Component, OnInit } from '@angular/core';
import { Designer } from '@pdfme/ui';
import { text, barcodes, image, multiVariableText, rectangle, ellipse, line, table } from '@pdfme/schemas';

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

@Component({
  selector: 'app-pdf-designer',
  imports: [],
  templateUrl: './pdf-designer.html',
  styleUrl: './pdf-designer.css',
})
export class PdfDesigner implements OnInit {
  ngOnInit() {
    const designer: Designer = new Designer({
      domContainer: document.getElementById('designer')!,
      template: {
        basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
        schemas: [[]]
      },
      plugins: PLUGINS,
    });
  }
}
