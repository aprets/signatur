import { PDFDocument } from 'pdf-lib';
import type { PdfDocumentState, SignaturePlacement } from './types';
import { drawPlacementOverlays } from './compositor';

const EXPORT_SCALE = 144 / 72;
const EXPORT_MAX_LONG_EDGE_PX = 2200;
const EXPORT_JPEG_QUALITY = 0.82;

const canvasToBlob = async (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Failed to encode the exported page'));
      },
      type,
      quality,
    );
  });

const createExportCanvas = ({ width, height }: { width: number; height: number }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const downloadBytes = ({ bytes, fileName, mimeType }: { bytes: Uint8Array; fileName: string; mimeType: string }) => {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const saveFlattenedPdf = async ({
  pdfDocument,
  placements,
  signatures,
  initials,
  onProgress,
}: {
  pdfDocument: PdfDocumentState;
  placements: SignaturePlacement[];
  signatures: HTMLImageElement[];
  initials: HTMLImageElement[];
  onProgress?: (currentPage: number, totalPages: number) => void;
}) => {
  const outputPdf = await PDFDocument.create();
  const totalStart = performance.now();
  const totalPlacements = placements.length;
  const totals = {
    getPageMs: 0,
    renderMs: 0,
    overlayMs: 0,
    encodeMs: 0,
    blobReadMs: 0,
    embedMs: 0,
    pageDrawMs: 0,
    pageTotalMs: 0,
  };

  console.groupCollapsed('[signatur] PDF export started');
  console.info('[signatur] Export config', {
    dpi: EXPORT_SCALE * 72,
    jpegQuality: EXPORT_JPEG_QUALITY,
    maxLongEdgePx: EXPORT_MAX_LONG_EDGE_PX,
    pageCount: pdfDocument.pageCount,
    placementCount: totalPlacements,
    encoder: 'html-canvas-toBlob',
  });
  console.groupEnd();

  for (const pageMeta of pdfDocument.pages) {
    const pageStart = performance.now();
    const currentPage = pageMeta.pageIndex + 1;
    onProgress?.(currentPage, pdfDocument.pageCount);

    const baseScale = EXPORT_SCALE;
    const longEdgePt = Math.max(pageMeta.widthPt, pageMeta.heightPt);
    const cappedScale = Math.min(baseScale, EXPORT_MAX_LONG_EDGE_PX / longEdgePt);
    const canvasWidth = Math.max(1, Math.round(pageMeta.widthPt * cappedScale));
    const canvasHeight = Math.max(1, Math.round(pageMeta.heightPt * cappedScale));
    const canvas = createExportCanvas({
      width: canvasWidth,
      height: canvasHeight,
    });

    const getPageStart = performance.now();
    const page = await pdfDocument.proxy.getPage(currentPage);
    const getPageMs = performance.now() - getPageStart;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No export render context found');

    const renderStart = performance.now();
    await page.render({
      canvas,
      canvasContext: context,
      viewport: page.getViewport({ scale: cappedScale }),
    }).promise;
    const renderMs = performance.now() - renderStart;
    page.cleanup();

    const pagePlacements = placements.filter((placement) => placement.pageIndex === pageMeta.pageIndex);
    const overlayStart = performance.now();
    drawPlacementOverlays({
      canvas,
      pageMeta,
      placements: pagePlacements,
      signatures,
      initials,
    });
    const overlayMs = performance.now() - overlayStart;

    const encodeStart = performance.now();
    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', EXPORT_JPEG_QUALITY);
    const encodeMs = performance.now() - encodeStart;

    const blobReadStart = performance.now();
    const jpegBytes = await jpegBlob.arrayBuffer();
    const blobReadMs = performance.now() - blobReadStart;

    const embedStart = performance.now();
    const embeddedImage = await outputPdf.embedJpg(jpegBytes);
    const embedMs = performance.now() - embedStart;

    const outputPage = outputPdf.addPage([pageMeta.widthPt, pageMeta.heightPt]);
    const pageDrawStart = performance.now();
    outputPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: pageMeta.widthPt,
      height: pageMeta.heightPt,
    });
    const pageDrawMs = performance.now() - pageDrawStart;
    const pageTotalMs = performance.now() - pageStart;

    totals.getPageMs += getPageMs;
    totals.renderMs += renderMs;
    totals.overlayMs += overlayMs;
    totals.encodeMs += encodeMs;
    totals.blobReadMs += blobReadMs;
    totals.embedMs += embedMs;
    totals.pageDrawMs += pageDrawMs;
    totals.pageTotalMs += pageTotalMs;

    console.groupCollapsed(`[signatur] Export page ${currentPage}/${pdfDocument.pageCount}`);
    console.table({
      pageIndex: currentPage,
      placements: pagePlacements.length,
      pageWidthPt: Math.round(pageMeta.widthPt),
      pageHeightPt: Math.round(pageMeta.heightPt),
      renderScale: Number(cappedScale.toFixed(3)),
      canvasWidthPx: canvasWidth,
      canvasHeightPx: canvasHeight,
      getPageMs: Number(getPageMs.toFixed(1)),
      renderMs: Number(renderMs.toFixed(1)),
      overlayMs: Number(overlayMs.toFixed(1)),
      encodeMs: Number(encodeMs.toFixed(1)),
      blobReadMs: Number(blobReadMs.toFixed(1)),
      embedMs: Number(embedMs.toFixed(1)),
      pageDrawMs: Number(pageDrawMs.toFixed(1)),
      pageTotalMs: Number(pageTotalMs.toFixed(1)),
    });
    console.groupEnd();

    canvas.width = 0;
    canvas.height = 0;
  }

  onProgress?.(pdfDocument.pageCount, pdfDocument.pageCount);
  const pdfSaveStart = performance.now();
  const savedBytes = await outputPdf.save();
  const pdfSaveMs = performance.now() - pdfSaveStart;
  const totalMs = performance.now() - totalStart;

  console.groupCollapsed('[signatur] PDF export summary');
  console.table({
    pageCount: pdfDocument.pageCount,
    placementCount: totalPlacements,
    totalGetPageMs: Number(totals.getPageMs.toFixed(1)),
    totalRenderMs: Number(totals.renderMs.toFixed(1)),
    totalOverlayMs: Number(totals.overlayMs.toFixed(1)),
    totalEncodeMs: Number(totals.encodeMs.toFixed(1)),
    totalBlobReadMs: Number(totals.blobReadMs.toFixed(1)),
    totalEmbedMs: Number(totals.embedMs.toFixed(1)),
    totalPageDrawMs: Number(totals.pageDrawMs.toFixed(1)),
    totalPageLoopMs: Number(totals.pageTotalMs.toFixed(1)),
    pdfSaveMs: Number(pdfSaveMs.toFixed(1)),
    totalExportMs: Number(totalMs.toFixed(1)),
  });
  console.groupEnd();

  downloadBytes({
    bytes: savedBytes,
    fileName: `${pdfDocument.fileName.replace(/\.pdf/i, '')}_signed.pdf`,
    mimeType: 'application/pdf',
  });
};
