import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import signatureUrl from './signature.png';
import { useParsePdf } from './lib';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString();

const signatureImg = new Image();
signatureImg.src = signatureUrl;

const getCanvasCoordinates = (canvas: HTMLCanvasElement, event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

export const draw = (
  mouseEvent: React.MouseEvent<HTMLCanvasElement, MouseEvent> | null,
  renderedPdfImage: HTMLImageElement,
  signatureHeight: number,
  signedLocations: { x: number; y: number }[],
  canvasElement?: HTMLCanvasElement,
) => {
  let canvas: HTMLCanvasElement;
  if (mouseEvent) {
    canvas = mouseEvent.currentTarget;
  } else if (canvasElement) {
    canvas = canvasElement;
  } else {
    throw new Error('No canvas element specified');
  }

  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(renderedPdfImage, 0, 0);
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
  if (mouseEvent && mouseEvent.type === 'mousemove') {
    const coordinates = getCanvasCoordinates(canvas, mouseEvent);
    signAtLocation(coordinates.x, coordinates.y);
  }
};

interface SignedLocation {
  pageIndex: number;
  x: number;
  y: number;
}

const Canvas = ({
  image,
  signedLocations,
  setSignedLocations,
  index,
  canvasArray,
}: {
  image: HTMLImageElement;
  signedLocations: { x: number; y: number }[];
  setSignedLocations: React.Dispatch<React.SetStateAction<SignedLocation[]>>;
  index: number;
  canvasArray: React.MutableRefObject<HTMLCanvasElement[]>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    // eslint-disable-next-line no-param-reassign
    canvasArray.current[index] = canvasRef.current;
    canvasRef.current.width = image.width;
    canvasRef.current.height = image.height;
    draw(null, image, 200, [], canvasRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <canvas
      ref={canvasRef}
      onMouseMove={(e) => draw(e, image, 200, signedLocations)}
      onMouseLeave={(e) => draw(e, image, 200, signedLocations)}
      onMouseUp={(e) => {
        const canvas = e.target as HTMLCanvasElement;
        setSignedLocations((s) => [...s, { pageIndex: index, ...getCanvasCoordinates(canvas, e) }]);
      }}
    />
  );
};

const App = () => {
  const [signedLocations, setSignedLocations] = useState<SignedLocation[]>([]);
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
                index={index}
                image={image}
                signedLocations={signedLocations.filter((s) => s.pageIndex === index)}
                setSignedLocations={setSignedLocations}
                canvasArray={canvasArray}
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
            const lastSignedLocation = signedLocations[signedLocations.length - 1];
            if (!lastSignedLocation) return;
            const image = parsedPdf.images[lastSignedLocation.pageIndex];
            if (!image) return;
            const canvas = canvasArray.current[lastSignedLocation.pageIndex];
            if (!canvas) return;
            setSignedLocations((s) => s.slice(0, -1));
            draw(
              null,
              image,
              200,
              signedLocations.slice(0, -1).filter((s) => s.pageIndex === lastSignedLocation.pageIndex),
              canvas,
            );
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
            for (const [index, canvas] of canvasArray.current.entries()) {
              const image = parsedPdf.images[index];
              if (canvas && image) draw(null, image, 200, [], canvas);
            }
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
