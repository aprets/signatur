import type { PdfDocumentState, PdfPageMeta } from './types';

const PREVIEW_MAX_LONG_EDGE_PX = 1600;

const renderPreviewPage = async ({
  pdfDocument,
  pageMeta,
  cssWidthPx,
  devicePixelRatio,
}: {
  pdfDocument: PdfDocumentState;
  pageMeta: PdfPageMeta;
  cssWidthPx: number;
  devicePixelRatio: number;
}) => {
  const safeCssWidth = Math.max(1, cssWidthPx);
  const cssHeightPx = (safeCssWidth * pageMeta.heightPt) / pageMeta.widthPt;
  const safeDevicePixelRatio = Math.max(1, devicePixelRatio);
  const requestedBitmapWidth = Math.max(1, Math.round(safeCssWidth * safeDevicePixelRatio));
  const requestedBitmapHeight = Math.max(1, Math.round(cssHeightPx * safeDevicePixelRatio));
  const currentLongEdge = Math.max(requestedBitmapWidth, requestedBitmapHeight);
  const capScale = currentLongEdge > PREVIEW_MAX_LONG_EDGE_PX ? PREVIEW_MAX_LONG_EDGE_PX / currentLongEdge : 1;
  const dimensions = {
    cssWidthPx: safeCssWidth,
    cssHeightPx,
    bitmapWidthPx: Math.max(1, Math.round(requestedBitmapWidth * capScale)),
    bitmapHeightPx: Math.max(1, Math.round(requestedBitmapHeight * capScale)),
  };
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = dimensions.bitmapWidthPx;
  renderCanvas.height = dimensions.bitmapHeightPx;
  const page = await pdfDocument.proxy.getPage(pageMeta.pageIndex + 1);
  try {
    const viewportScale = dimensions.bitmapWidthPx / pageMeta.widthPt;
    const viewport = page.getViewport({ scale: viewportScale });
    const context = renderCanvas.getContext('2d');
    if (!context) throw new Error('No preview render context found');

    await page.render({
      canvas: renderCanvas,
      canvasContext: context,
      viewport,
    }).promise;

    return {
      baseCanvas: renderCanvas,
      dimensions,
    };
  } finally {
    page.cleanup();
  }
};

export default renderPreviewPage;
