import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import signatureUrl from './signature.png';
import { useParsePdf } from './lib';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString();

const signatureImg = new Image();
signatureImg.src = signatureUrl;

interface DrawOptions {
  canvas: HTMLCanvasElement;
  baseImage: HTMLImageElement;
  signatureHeight: number;
  signedLocations: { x: number; y: number }[];
}

export const draw = ({ canvas, baseImage, signatureHeight, signedLocations }: DrawOptions) => {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(baseImage, 0, 0);
  const signAtLocation = (x: number, y: number) => {
    context.drawImage(
      signatureImg,
      x - (signatureHeight * (signatureImg.width / signatureImg.height)) / 2,
      y - signatureHeight / 2,
      signatureHeight * (signatureImg.width / signatureImg.height),
      signatureHeight,
    );
  };
  for (const { x, y } of signedLocations) signAtLocation(x, y);
};

const mouseEventToCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
  const canvas = event.target as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

interface SignedLocation {
  x: number;
  y: number;
}
interface GlobalSignedLocation extends SignedLocation {
  pageIndex: number;
}

const Canvas = ({
  registerCanvas,
  drawOnCanvas,
  signOnPage,
}: {
  registerCanvas: (canvas: HTMLCanvasElement) => void;
  drawOnCanvas: (canvas: HTMLCanvasElement, extraSignLocation?: SignedLocation) => void;
  signOnPage: (signLocation: SignedLocation) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) registerCanvas(canvasRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (canvasRef.current) drawOnCanvas(canvasRef.current);
  });
  return (
    <canvas
      ref={canvasRef}
      onMouseMove={(e) => drawOnCanvas(e.target as HTMLCanvasElement, mouseEventToCanvasCoordinates(e))}
      onMouseLeave={(e) => drawOnCanvas(e.target as HTMLCanvasElement)}
      onMouseUp={(e) => signOnPage(mouseEventToCanvasCoordinates(e))}
    />
  );
};

const App = () => {
  const [signedLocations, setSignedLocations] = useState<GlobalSignedLocation[]>([]);
  const canvasArray = useRef<HTMLCanvasElement[]>([]);

  const { parsedPdf, pdfInputOnChange } = useParsePdf();
  useEffect(() => {
    if (parsedPdf === null) return;
    canvasArray.current = Array.from({ length: parsedPdf.images.length });
    setSignedLocations([]);
  }, [parsedPdf]);

  return (
    <main className="flex h-screen">
      <div className="flex flex-grow justify-center overflow-scroll bg-slate-100">
        {parsedPdf === null ? (
          <p className="flex select-none flex-col justify-center text-gray-500">No document selected</p>
        ) : (
          <div className="flex flex-col gap-16">
            {parsedPdf.images.map((image, index) => (
              <Canvas
                // eslint-disable-next-line react/no-array-index-key
                key={`${parsedPdf.parsedAtStr}-${index}`}
                registerCanvas={(canvas) => {
                  // eslint-disable-next-line no-param-reassign
                  canvas.height = image.height;
                  // eslint-disable-next-line no-param-reassign
                  canvas.width = image.width;
                  canvasArray.current[index] = canvas;
                }}
                drawOnCanvas={(canvas, extraSignLocation) => {
                  draw({
                    canvas,
                    baseImage: image,
                    signatureHeight: 200,
                    signedLocations: [
                      ...signedLocations.filter((s) => s.pageIndex === index),
                      ...(extraSignLocation ? [{ ...extraSignLocation, pageIndex: index }] : []),
                    ],
                  });
                }}
                signOnPage={(signLocation) => setSignedLocations((s) => [...s, { ...signLocation, pageIndex: index }])}
              />
            ))}
          </div>
        )}
      </div>
      <div className="w-96 border-l border-solid px-4">
        <input
          className="my-4 box-border w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-700 hover:file:bg-violet-100 active:file:bg-violet-200"
          type="file"
          accept=".pdf"
          onChange={pdfInputOnChange}
        />
        <button
          className="mr-1 rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 disabled:bg-gray-300"
          type="button"
          disabled={parsedPdf === null || signedLocations.length === 0}
          onClick={() => {
            if (parsedPdf === null) return;
            setSignedLocations((s) => s.slice(0, -1));
          }}
        >
          Undo
        </button>
        <button
          className="rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 disabled:bg-gray-300"
          type="button"
          disabled={parsedPdf === null || signedLocations.length === 0}
          onClick={() => {
            if (parsedPdf === null) return;
            setSignedLocations([]);
          }}
        >
          Reset
        </button>
        <button
          className="ml-1 rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 disabled:bg-gray-300"
          type="button"
          disabled={parsedPdf === null}
          onClick={() => {
            if (parsedPdf === null) return;
            // eslint-disable-next-line new-cap
            const pdf = new jsPDF({
              unit: 'px',
              hotfixes: ['px_scaling'],
            });
            pdf.deletePage(1);
            for (const canvas of canvasArray.current) {
              pdf.addPage([canvas.width, canvas.height]);
              pdf.addImage(canvas.toDataURL(), 'PNG', 0, 0, canvas.width, canvas.height);
            }
            pdf.save('test.pdf');
          }}
        >
          Export
        </button>
      </div>
    </main>
  );
};

export default App;
