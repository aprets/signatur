import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PdfDocumentState, PdfPageMeta } from './types';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

export const loadPdfDocument = async (file: File): Promise<PdfDocumentState> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const proxy = await getDocument({ data: bytes.slice() }).promise;
  const pageNumbers = Array.from({ length: proxy.numPages }, (_, index) => index + 1);
  const pages = await Promise.all(
    pageNumbers.map(async (pageNumber): Promise<PdfPageMeta> => {
      const page = await proxy.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      page.cleanup();
      return {
        pageIndex: pageNumber - 1,
        widthPt: viewport.width,
        heightPt: viewport.height,
        rotationDeg: viewport.rotation,
      };
    }),
  );

  return {
    fileName: file.name,
    bytes,
    pageCount: proxy.numPages,
    pages,
    proxy,
  };
};
