import type { PdfDocumentState, PdfPageMeta, PreviewRenderState } from './types';
import { getCanvasCssHeight } from './coordinates';

export const PREVIEW_MAX_LONG_EDGE_PX = 1600;

const createCanvas = ({ width, height }: { width: number; height: number }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const getPreviewRenderState = ({
  pageMeta,
  cssWidthPx,
  devicePixelRatio,
}: {
  pageMeta: PdfPageMeta;
  cssWidthPx: number;
  devicePixelRatio: number;
}): PreviewRenderState => {
  const safeCssWidth = Math.max(1, cssWidthPx);
  const safeDevicePixelRatio = Math.max(1, devicePixelRatio);
  const requestedBitmapWidth = Math.max(1, Math.round(safeCssWidth * safeDevicePixelRatio));
  const requestedBitmapHeight = Math.max(1, Math.round(getCanvasCssHeight(pageMeta, safeCssWidth) * safeDevicePixelRatio));
  const currentLongEdge = Math.max(requestedBitmapWidth, requestedBitmapHeight);
  const capScale = currentLongEdge > PREVIEW_MAX_LONG_EDGE_PX ? PREVIEW_MAX_LONG_EDGE_PX / currentLongEdge : 1;

  return {
    pageIndex: pageMeta.pageIndex,
    status: 'idle',
    cssWidthPx: safeCssWidth,
    cssHeightPx: getCanvasCssHeight(pageMeta, safeCssWidth),
    bitmapWidthPx: Math.max(1, Math.round(requestedBitmapWidth * capScale)),
    bitmapHeightPx: Math.max(1, Math.round(requestedBitmapHeight * capScale)),
  };
};

export const renderPreviewPage = async ({
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
  const renderState = getPreviewRenderState({
    pageMeta,
    cssWidthPx,
    devicePixelRatio,
  });
  const renderCanvas = createCanvas({
    width: renderState.bitmapWidthPx,
    height: renderState.bitmapHeightPx,
  });
  const page = await pdfDocument.proxy.getPage(pageMeta.pageIndex + 1);
  const viewportScale = renderState.bitmapWidthPx / pageMeta.widthPt;
  const viewport = page.getViewport({ scale: viewportScale });
  const context = renderCanvas.getContext('2d');
  if (!context) throw new Error('No preview render context found');

  await page.render({
    canvas: renderCanvas,
    canvasContext: context,
    viewport,
  }).promise;
  page.cleanup();

  return {
    baseCanvas: renderCanvas,
    renderState: {
      ...renderState,
      status: 'ready' as const,
    },
  };
};
