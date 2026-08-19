import { useEffect, useRef, useState } from 'react';
import Loader from '../loader';
import { composePage } from '../pdf/compositor';
import renderPreviewPage from '../pdf/preview';
import type { NewPlacement, PdfDocumentState, PdfPageMeta, Placement, PlacementTool } from '../pdf/types';

interface PageCanvasProps {
  initials: HTMLImageElement[];
  isRenderActive: boolean;
  nextAssetIndex: number;
  onPlacement: (placement: NewPlacement) => void;
  onPreviewReady: (pageIndex: number) => void;
  pageMeta: PdfPageMeta;
  pdfDocument: PdfDocumentState;
  pendingFontSizePt: number;
  pendingHeightPt: number;
  pendingText: string;
  placementTool: PlacementTool;
  placements: Placement[];
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
  pendingFontSizePt,
  pendingHeightPt,
  pendingText,
  placementTool,
  placements,
  signatures,
}: PageCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseCanvas, setBaseCanvas] = useState<HTMLCanvasElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [hoverPlacement, setHoverPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) throw new Error('No page canvas container found');

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
    setBaseCanvas(null);
    setHoverPlacement(null);
    setRenderError(null);
  }, [pageMeta.pageIndex, pdfDocument]);

  useEffect(() => {
    setHoverPlacement(null);
  }, [nextAssetIndex, pendingFontSizePt, pendingHeightPt, pendingText, placementTool]);

  useEffect(() => {
    let isCancelled = false;
    if (isRenderActive && containerWidth) {
      setBaseCanvas(null);
      setIsRendering(true);
      setRenderError(null);

      renderPreviewPage({
        pdfDocument,
        pageMeta,
        cssWidthPx: containerWidth,
        devicePixelRatio: window.devicePixelRatio || 1,
      })
        .then(({ baseCanvas: renderedCanvas, dimensions }) => {
          if (isCancelled) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = dimensions.bitmapWidthPx;
          canvas.height = dimensions.bitmapHeightPx;
          canvas.style.width = `${dimensions.cssWidthPx}px`;
          canvas.style.height = `${dimensions.cssHeightPx}px`;
          setBaseCanvas(renderedCanvas);
          onPreviewReady(pageMeta.pageIndex);
        })
        .finally(() => {
          if (isCancelled) return;
          setIsRendering(false);
        })
        .catch((error: unknown) => {
          if (isCancelled) return;
          const message = error instanceof Error ? error.message : 'Failed to render page preview';
          setRenderError(message);
          onPreviewReady(pageMeta.pageIndex);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [containerWidth, isRenderActive, onPreviewReady, pageMeta, pdfDocument]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseCanvas) return;

    composePage({
      canvas,
      basePageRender: baseCanvas,
      pageMeta,
      placements: hoverPlacement ? [...placements, hoverPlacement] : placements,
      signatures,
      initials,
    });
  }, [baseCanvas, hoverPlacement, initials, pageMeta, placements, signatures]);

  const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (placementTool === 'text') {
      if (!pendingText.trim()) return;
    } else {
      const assetArray = placementTool === 'signature' ? signatures : initials;
      if (!assetArray.length) return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const normalizedY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const position = {
      id: 'hover',
      pageIndex: pageMeta.pageIndex,
      centerXPt: normalizedX * pageMeta.widthPt,
      centerYFromTopPt: normalizedY * pageMeta.heightPt,
    };
    setHoverPlacement(
      placementTool === 'text'
        ? { ...position, type: 'text', text: pendingText, fontSizePt: pendingFontSizePt }
        : {
            ...position,
            type: placementTool,
            assetIndex: nextAssetIndex,
            heightPt: pendingHeightPt,
          },
    );
  };

  const handlePointerLeave = () => {
    setHoverPlacement(null);
  };

  const handlePointerUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (placementTool === 'text') {
      if (!pendingText.trim()) return;
    } else {
      const assetArray = placementTool === 'signature' ? signatures : initials;
      if (!assetArray.length) return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const normalizedY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const position = {
      pageIndex: pageMeta.pageIndex,
      centerXPt: normalizedX * pageMeta.widthPt,
      centerYFromTopPt: normalizedY * pageMeta.heightPt,
    };
    onPlacement(
      placementTool === 'text'
        ? { ...position, type: 'text', text: pendingText, fontSizePt: pendingFontSizePt }
        : {
            ...position,
            type: placementTool,
            assetIndex: nextAssetIndex,
            heightPt: pendingHeightPt,
          },
    );
  };

  const fallbackHeightPx = (Math.max(containerWidth, 1) * pageMeta.heightPt) / pageMeta.widthPt;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl border border-slate-200 bg-white shadow-sm"
      style={{ minHeight: `${fallbackHeightPx}px` }}
    >
      <canvas
        ref={canvasRef}
        className={`block w-full ${baseCanvas ? 'visible' : 'invisible'}`}
        style={{ minHeight: `${fallbackHeightPx}px` }}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onMouseUp={handlePointerUp}
      />
      {baseCanvas === null ? (
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
      ) : null}
    </div>
  );
};

export default PageCanvas;
