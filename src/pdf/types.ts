import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type SignType = 'signature' | 'initial';

export interface PdfPageMeta {
  pageIndex: number;
  widthPt: number;
  heightPt: number;
  rotationDeg: number;
}

export interface PdfDocumentState {
  fileName: string;
  bytes: Uint8Array;
  pageCount: number;
  pages: PdfPageMeta[];
  proxy: PDFDocumentProxy;
}

export interface SignaturePlacement {
  id: string;
  pageIndex: number;
  type: SignType;
  assetIndex: number;
  centerXPt: number;
  centerYFromTopPt: number;
  heightPt: number;
}

export interface PreviewRenderState {
  pageIndex: number;
  status: 'idle' | 'rendering' | 'ready' | 'error';
  cssWidthPx: number;
  cssHeightPx: number;
  bitmapWidthPx: number;
  bitmapHeightPx: number;
}
