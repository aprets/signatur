import { PDFDocument } from 'pdf-lib';
import type { PdfDocumentState, SignaturePlacement } from './types';
import { drawPlacementOverlays } from './compositor';

const EXPORT_SCALE = 144 / 72;
const EXPORT_MAX_LONG_EDGE_PX = 2200;
const EXPORT_JPEG_QUALITY = 0.82;
const EXPORT_CONCURRENCY = 3;

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
  onProgress,
}: {
  pdfDocument: PdfDocumentState;
  placements: SignaturePlacement[];
  signatures: HTMLImageElement[];
  initials: HTMLImageElement[];
  onProgress?: (currentPage: number, totalPages: number) => void;
}) => {
  const outputPdf = await PDFDocument.create();

  for (let batchStart = 0; batchStart < pdfDocument.pages.length; batchStart += EXPORT_CONCURRENCY) {
    const batch = pdfDocument.pages.slice(batchStart, batchStart + EXPORT_CONCURRENCY);
    // Awaiting each batch bounds peak canvas memory for large documents.
    // eslint-disable-next-line no-await-in-loop
    const renderedPages = await Promise.all(
      batch.map(async (pageMeta) => {
        const currentPage = pageMeta.pageIndex + 1;
        const longEdgePt = Math.max(pageMeta.widthPt, pageMeta.heightPt);
        const cappedScale = Math.min(EXPORT_SCALE, EXPORT_MAX_LONG_EDGE_PX / longEdgePt);
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
      onProgress?.(renderedPage.currentPage, pdfDocument.pageCount);
    }
  }

  const savedBytes = await outputPdf.save();
  const blob = new Blob([savedBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${pdfDocument.fileName.replace(/\.pdf$/i, '')}_signed.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default saveFlattenedPdf;
