import type { PdfPageMeta } from './types';

const POINTS_PER_INCH = 72;
const MILLIMETERS_PER_INCH = 25.4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const millimetersToPoints = (millimeters: number) => (millimeters * POINTS_PER_INCH) / MILLIMETERS_PER_INCH;

export const pointsToMillimeters = (points: number) => (points * MILLIMETERS_PER_INCH) / POINTS_PER_INCH;

export const getCanvasCssHeight = (pageMeta: PdfPageMeta, cssWidthPx: number) =>
  (cssWidthPx * pageMeta.heightPt) / pageMeta.widthPt;

export const domPointToPdfPoint = ({
  clientX,
  clientY,
  rect,
  pageMeta,
}: {
  clientX: number;
  clientY: number;
  rect: DOMRect;
  pageMeta: PdfPageMeta;
}) => {
  const normalizedX = clamp((clientX - rect.left) / rect.width, 0, 1);
  const normalizedY = clamp((clientY - rect.top) / rect.height, 0, 1);
  return {
    centerXPt: normalizedX * pageMeta.widthPt,
    centerYFromTopPt: normalizedY * pageMeta.heightPt,
  };
};

export const pdfPointToCanvasPoint = ({
  centerXPt,
  centerYFromTopPt,
  pageMeta,
  canvasWidthPx,
  canvasHeightPx,
}: {
  centerXPt: number;
  centerYFromTopPt: number;
  pageMeta: PdfPageMeta;
  canvasWidthPx: number;
  canvasHeightPx: number;
}) => ({
  xPx: (centerXPt / pageMeta.widthPt) * canvasWidthPx,
  yPx: (centerYFromTopPt / pageMeta.heightPt) * canvasHeightPx,
});

export const heightPointsToCanvasPixels = ({
  heightPt,
  pageMeta,
  canvasHeightPx,
}: {
  heightPt: number;
  pageMeta: PdfPageMeta;
  canvasHeightPx: number;
}) => (heightPt / pageMeta.heightPt) * canvasHeightPx;
