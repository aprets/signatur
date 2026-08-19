import type { PDFDocumentProxy } from 'pdfjs-dist';

export type SignType = 'signature' | 'initial';

export interface PdfPageMeta {
  pageIndex: number;
  widthPt: number;
  heightPt: number;
}

export interface PdfDocumentState {
  fileName: string;
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
