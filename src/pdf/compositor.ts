import { heightPointsToCanvasPixels, pdfPointToCanvasPoint } from './coordinates';
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

const getPlacementAsset = ({
  placement,
  signatures,
  initials,
}: {
  placement: SignaturePlacement;
  signatures: HTMLImageElement[];
  initials: HTMLImageElement[];
}) => {
  const sourceImages = placement.type === 'signature' ? signatures : initials;
  if (!sourceImages.length) return null;
  return sourceImages[placement.assetIndex % sourceImages.length] ?? null;
};

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
    const asset = getPlacementAsset({ placement, signatures, initials });
    if (!asset || !asset.height) continue;

    const { xPx, yPx } = pdfPointToCanvasPoint({
      centerXPt: placement.centerXPt,
      centerYFromTopPt: placement.centerYFromTopPt,
      pageMeta,
      canvasWidthPx: canvas.width,
      canvasHeightPx: canvas.height,
    });
    const heightPx = heightPointsToCanvasPixels({
      heightPt: placement.heightPt,
      pageMeta,
      canvasHeightPx: canvas.height,
    });
    const widthPx = heightPx * (asset.width / asset.height);

    context.drawImage(asset, xPx - widthPx / 2, yPx - heightPx / 2, widthPx, heightPx);
  }
};

export const composePage = ({ canvas, basePageRender, pageMeta, placements, signatures, initials }: ComposePageOptions) => {
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
