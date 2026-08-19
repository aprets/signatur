import { useEffect, useRef, useState } from 'react';
import Loader from '../loader';
import { composePage } from '../pdf/compositor';
import { domPointToPdfPoint, getCanvasCssHeight } from '../pdf/coordinates';
import { renderPreviewPage } from '../pdf/preview';
import type { PdfDocumentState, PdfPageMeta, SignType, SignaturePlacement } from '../pdf/types';

interface PageCanvasProps {
  initials: HTMLImageElement[];
  isRenderActive: boolean;
  nextAssetIndex: number;
  onPlacement: (placement: Omit<SignaturePlacement, 'id'>) => void;
  onPreviewReady: (pageIndex: number) => void;
  pageMeta: PdfPageMeta;
  pdfDocument: PdfDocumentState;
  pendingHeightPt: number;
  placements: SignaturePlacement[];
  signType: SignType;
  signatures: HTMLImageElement[];
}

const PageCanvas = ({
  initials,
  isRenderActive,
  nextAssetIndex,
  onPlacement,
  onPreviewReady,
  pageMeta,
  pdfDocument,
  pendingHeightPt,
  placements,
  signType,
  signatures,
}: PageCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [hoverPlacement, setHoverPlacement] = useState<SignaturePlacement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(container);
    setContainerWidth(container.getBoundingClientRect().width);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    baseCanvasRef.current = null;
    setHoverPlacement(null);
    setRenderError(null);
  }, [pageMeta.pageIndex, pdfDocument]);

  useEffect(() => {
    if (!isRenderActive || !containerWidth) return;

    let isCancelled = false;
    setIsRendering(true);
    setRenderError(null);

    void renderPreviewPage({
      pdfDocument,
      pageMeta,
      cssWidthPx: containerWidth,
      devicePixelRatio: window.devicePixelRatio || 1,
    })
      .then(({ baseCanvas, renderState }) => {
        if (isCancelled) return;
        baseCanvasRef.current = baseCanvas;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = renderState.bitmapWidthPx;
        canvas.height = renderState.bitmapHeightPx;
        canvas.style.width = `${renderState.cssWidthPx}px`;
        canvas.style.height = `${renderState.cssHeightPx}px`;
        composePage({
          canvas,
          basePageRender: baseCanvas,
          pageMeta,
          placements,
          signatures,
          initials,
        });
        onPreviewReady(pageMeta.pageIndex);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to render page preview';
        setRenderError(message);
        onPreviewReady(pageMeta.pageIndex);
      })
      .finally(() => {
        if (isCancelled) return;
        setIsRendering(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [containerWidth, isRenderActive, onPreviewReady, pageMeta, pdfDocument]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!canvas || !baseCanvas) return;

    composePage({
      canvas,
      basePageRender: baseCanvas,
      pageMeta,
      placements: hoverPlacement ? [...placements, hoverPlacement] : placements,
      signatures,
      initials,
    });
  }, [hoverPlacement, initials, pageMeta, placements, signatures]);

  const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const assetArray = signType === 'signature' ? signatures : initials;
    if (!assetArray.length) return;

    const nextPlacementPoint = domPointToPdfPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      pageMeta,
    });
    setHoverPlacement({
      id: 'hover',
      pageIndex: pageMeta.pageIndex,
      type: signType,
      assetIndex: nextAssetIndex,
      heightPt: pendingHeightPt,
      ...nextPlacementPoint,
    });
  };

  const handlePointerLeave = () => {
    setHoverPlacement(null);
  };

  const handlePointerUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const assetArray = signType === 'signature' ? signatures : initials;
    if (!assetArray.length) return;

    const nextPlacementPoint = domPointToPdfPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      pageMeta,
    });
    onPlacement({
      pageIndex: pageMeta.pageIndex,
      type: signType,
      assetIndex: nextAssetIndex,
      heightPt: pendingHeightPt,
      ...nextPlacementPoint,
    });
  };

  const fallbackHeightPx = getCanvasCssHeight(pageMeta, Math.max(containerWidth, 1));

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl border border-slate-200 bg-white shadow-sm"
      style={{ minHeight: `${fallbackHeightPx}px` }}
    >
      <canvas
        ref={canvasRef}
        className={`block w-full ${!baseCanvasRef.current ? 'invisible' : 'visible'}`}
        style={{ minHeight: `${fallbackHeightPx}px` }}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onMouseUp={handlePointerUp}
      />
      {!baseCanvasRef.current && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 text-slate-500">
          {renderError ? (
            <p className="px-6 text-center text-sm text-red-600">{renderError}</p>
          ) : isRendering ? (
            <>
              <Loader className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm font-medium text-slate-600">Rendering page {pageMeta.pageIndex + 1}</p>
            </>
          ) : (
            <p className="text-sm font-medium text-slate-500">Queued for rendering</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PageCanvas;
