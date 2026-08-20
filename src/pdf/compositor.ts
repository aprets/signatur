import type { PdfPageMeta, Placement } from './types';

interface DrawPlacementOverlaysOptions {
  canvas: HTMLCanvasElement;
  pageMeta: PdfPageMeta;
  placements: Placement[];
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
    const xPx = (placement.centerXPt / pageMeta.widthPt) * canvas.width;
    const yPx = (placement.centerYFromTopPt / pageMeta.heightPt) * canvas.height;

    if (placement.type === 'text') {
      const fontSizePx = (placement.fontSizePt / pageMeta.heightPt) * canvas.height;
      context.save();
      context.fillStyle = '#111827';
      context.font = `${fontSizePx}px Helvetica, Arial, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(placement.text, xPx, yPx);
      context.restore();
    } else {
      const sourceImages = placement.type === 'signature' ? signatures : initials;
      const asset = sourceImages[placement.assetIndex % sourceImages.length];
      if (asset?.height) {
        const heightPx = (placement.heightPt / pageMeta.heightPt) * canvas.height;
        const widthPx = heightPx * (asset.width / asset.height);

        context.drawImage(asset, xPx - widthPx / 2, yPx - heightPx / 2, widthPx, heightPx);
      }
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
