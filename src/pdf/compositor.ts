import type { PdfPageMeta, SignaturePlacement } from './types';

interface DrawPlacementOverlaysOptions {
  canvas: HTMLCanvasElement;
  pageMeta: PdfPageMeta;
  placements: SignaturePlacement[];
  signatures: HTMLImageElement[];
  initials: HTMLImageElement[];
}

interface ComposePageOptions extends DrawPlacementOverlaysOptions {
  basePageRender: CanvasImageSource;
}

export const drawPlacementOverlays = ({
  canvas,
  pageMeta,
  placements,
  signatures,
  initials,
}: DrawPlacementOverlaysOptions) => {
  const context = canvas.getContext('2d');
  if (!context) return;

  for (const placement of placements) {
    const sourceImages = placement.type === 'signature' ? signatures : initials;
    const asset = sourceImages[placement.assetIndex % sourceImages.length];
    if (asset?.height) {
      const xPx = (placement.centerXPt / pageMeta.widthPt) * canvas.width;
      const yPx = (placement.centerYFromTopPt / pageMeta.heightPt) * canvas.height;
      const heightPx = (placement.heightPt / pageMeta.heightPt) * canvas.height;
      const widthPx = heightPx * (asset.width / asset.height);

      context.drawImage(asset, xPx - widthPx / 2, yPx - heightPx / 2, widthPx, heightPx);
    }
  }
};

export const composePage = ({
  canvas,
  basePageRender,
  pageMeta,
  placements,
  signatures,
  initials,
}: ComposePageOptions) => {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(basePageRender, 0, 0, canvas.width, canvas.height);
  drawPlacementOverlays({
    canvas,
    pageMeta,
    placements,
    signatures,
    initials,
  });
};
