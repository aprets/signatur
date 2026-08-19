import { PDFDocument } from 'pdf-lib';
import type { PdfDocumentState, Placement } from './types';
import { drawPlacementOverlays } from './compositor';

const EXPORT_MAX_LONG_EDGE_PX = 3600;
const EXPORT_JPEG_QUALITY = 0.5;
const EXPORT_CONCURRENCY = 3;
const SMALL_FILE_TARGET_BYTES = 24_000_000;
const MIN_SMALL_FILE_DPI = 150;
const MAX_ADAPTIVE_PASSES = 3;

export type ExportMode = 'print' | 'smaller';

export interface ExportProgress {
  currentPage: number;
  totalPages: number;
  pass: number;
  dpi: number;
}

export interface ExportResult {
  byteLength: number;
  dpi: number;
  targetMet: boolean;
}

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

const saveFlattenedPdf = async ({
  pdfDocument,
  placements,
  signatures,
  initials,
  mode,
  onProgress,
}: {
  pdfDocument: PdfDocumentState;
  placements: Placement[];
  signatures: HTMLImageElement[];
  initials: HTMLImageElement[];
  mode: ExportMode;
  onProgress?: (progress: ExportProgress) => void;
}): Promise<ExportResult> => {
  let dpi = 300;
  let pass = 1;
  let savedBytes: Uint8Array | null = null;
  let shouldRetry: boolean;

  do {
    // A retry deliberately rebuilds the whole PDF at one uniform resolution.
    // eslint-disable-next-line no-await-in-loop
    const outputPdf = await PDFDocument.create();
    const exportScale = dpi / 72;
    const maxLongEdgePx = EXPORT_MAX_LONG_EDGE_PX * (dpi / 300);

    for (let batchStart = 0; batchStart < pdfDocument.pages.length; batchStart += EXPORT_CONCURRENCY) {
      const batch = pdfDocument.pages.slice(batchStart, batchStart + EXPORT_CONCURRENCY);
      // Awaiting each batch bounds peak canvas memory for large documents.
      // eslint-disable-next-line no-await-in-loop
      const renderedPages = await Promise.all(
        batch.map(async (pageMeta) => {
          const currentPage = pageMeta.pageIndex + 1;
          const longEdgePt = Math.max(pageMeta.widthPt, pageMeta.heightPt);
          const cappedScale = Math.min(exportScale, maxLongEdgePx / longEdgePt);
          const canvasWidth = Math.max(1, Math.round(pageMeta.widthPt * cappedScale));
          const canvasHeight = Math.max(1, Math.round(pageMeta.heightPt * cappedScale));
          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const page = await pdfDocument.proxy.getPage(currentPage);

          try {
            const context = canvas.getContext('2d');
            if (!context) throw new Error('No export render context found');

            await page.render({
              canvas,
              canvasContext: context,
              viewport: page.getViewport({ scale: cappedScale }),
            }).promise;

            const pagePlacements = placements.filter((placement) => placement.pageIndex === pageMeta.pageIndex);
            drawPlacementOverlays({
              canvas,
              pageMeta,
              placements: pagePlacements,
              signatures,
              initials,
            });
            const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', EXPORT_JPEG_QUALITY);
            const jpegBytes = await jpegBlob.arrayBuffer();

            return {
              currentPage,
              jpegBytes,
              pageMeta,
            };
          } finally {
            page.cleanup();
            canvas.width = 0;
            canvas.height = 0;
          }
        }),
      );

      for (const renderedPage of renderedPages) {
        // Embedding sequentially keeps output page order deterministic.
        // eslint-disable-next-line no-await-in-loop
        const embeddedImage = await outputPdf.embedJpg(renderedPage.jpegBytes);
        const outputPage = outputPdf.addPage([renderedPage.pageMeta.widthPt, renderedPage.pageMeta.heightPt]);
        outputPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: renderedPage.pageMeta.widthPt,
          height: renderedPage.pageMeta.heightPt,
        });
        onProgress?.({
          currentPage: renderedPage.currentPage,
          totalPages: pdfDocument.pageCount,
          pass,
          dpi,
        });
      }
    }

    // eslint-disable-next-line no-await-in-loop
    const attemptBytes = await outputPdf.save();
    shouldRetry = mode === 'smaller' && attemptBytes.length > SMALL_FILE_TARGET_BYTES && dpi > MIN_SMALL_FILE_DPI;

    if (shouldRetry) {
      const estimatedDpi = Math.floor(dpi * Math.sqrt(SMALL_FILE_TARGET_BYTES / attemptBytes.length) * 0.95);
      dpi =
        pass >= MAX_ADAPTIVE_PASSES
          ? MIN_SMALL_FILE_DPI
          : Math.max(MIN_SMALL_FILE_DPI, Math.min(dpi - 10, estimatedDpi));
      pass += 1;
    } else {
      savedBytes = attemptBytes;
    }
  } while (shouldRetry);

  if (!savedBytes) throw new Error('PDF export completed without output');

  const blob = new Blob([savedBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${pdfDocument.fileName.replace(/\.pdf$/i, '')}_signed.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);

  return {
    byteLength: savedBytes.length,
    dpi,
    targetMet: savedBytes.length <= SMALL_FILE_TARGET_BYTES,
  };
};

export default saveFlattenedPdf;
