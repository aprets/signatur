import type { PDFDocumentProxy } from 'pdfjs-dist';

export type ImagePlacementType = 'signature' | 'initial';
export type PlacementTool = ImagePlacementType | 'text';

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

interface PlacementBase {
  id: string;
  pageIndex: number;
  centerXPt: number;
  centerYFromTopPt: number;
}

export interface ImagePlacement extends PlacementBase {
  type: ImagePlacementType;
  assetIndex: number;
  heightPt: number;
}

export interface TextPlacement extends PlacementBase {
  type: 'text';
  text: string;
  fontSizePt: number;
}

export type Placement = ImagePlacement | TextPlacement;
export type NewPlacement = Omit<ImagePlacement, 'id'> | Omit<TextPlacement, 'id'>;
