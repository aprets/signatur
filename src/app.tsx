import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { shuffle, useParsePdf } from './lib';
import StarterModal from './starter-modal';
import Loader from './loader';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString();

interface DrawOptions {
  canvas: HTMLCanvasElement;
  baseImage: HTMLImageElement;
  signatureImgArray: HTMLImageElement[];
  initialImgArray: HTMLImageElement[];
  signedLocations: SignedLocation[];
}

export const draw = ({ canvas, baseImage, signatureImgArray, initialImgArray, signedLocations }: DrawOptions) => {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(baseImage, 0, 0);
  for (const { x, y, i, height, type } of signedLocations) {
    const signImgArray = type === 'signature' ? signatureImgArray : initialImgArray;
    const signImg = signImgArray[i % signImgArray.length]!;
    context.drawImage(
      signImg,
      x - (height * (signImg.width / signImg.height)) / 2,
      y - height / 2,
      height * (signImg.width / signImg.height),
      height,
    );
  }
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
  i: number;
  height: number;
  type: SignType;
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
  drawOnCanvas: (canvas: HTMLCanvasElement, extraSignLocation?: Omit<SignedLocation, 'i' | 'height' | 'type'>) => void;
  signOnPage: (signLocation: Omit<SignedLocation, 'i' | 'height' | 'type'>) => void;
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

type SignType = 'signature' | 'initial';

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [signType, setSignType] = useState<SignType>('signature');
  const [signatureHeight, setSignatureHeight] = useState(150);
  const [signatures, setSignatures] = useState<HTMLImageElement[]>([]);
  const [initials, setInitials] = useState<HTMLImageElement[]>([]);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [signedLocations, setSignedLocations] = useState<GlobalSignedLocation[]>([]);
  const canvasArray = useRef<HTMLCanvasElement[]>([]);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const { parsedPdf, pdfInputOnChange } = useParsePdf();
  useEffect(() => {
    if (parsedPdf === null) return;
    canvasArray.current = Array.from({ length: parsedPdf.images.length });
    setSignedLocations([]);
  }, [parsedPdf]);

  return (
    <>
      <StarterModal
        isModalOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        canProceed={!!signatures.length}
        setSignatures={setSignatures}
        setInitials={setInitials}
      />
      <main className="flex h-screen">
        <div className="flex flex-grow justify-center overflow-scroll bg-slate-100">
          {parsedPdf === null ? (
            <p className="flex select-none flex-col justify-center text-gray-500 active:bg-violet-800">
              No document selected
            </p>
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
                      signatureImgArray: signatures,
                      initialImgArray: initials,
                      signedLocations: [
                        ...signedLocations.filter((s) => s.pageIndex === index),
                        ...(extraSignLocation
                          ? [
                              {
                                ...extraSignLocation,
                                i: signedLocations.filter((l) => l.type === signType).length,
                                pageIndex: index,
                                height: signatureHeight,
                                type: signType,
                              },
                            ]
                          : []),
                      ],
                    });
                  }}
                  signOnPage={(signLocation) =>
                    setSignedLocations((s) => [
                      ...s,
                      {
                        ...signLocation,
                        i: signedLocations.filter((l) => l.type === signType).length,
                        pageIndex: index,
                        height: signatureHeight,
                        type: signType,
                      },
                    ])
                  }
                />
              ))}
            </div>
          )}
        </div>
        <div className="w-96 border-l border-solid px-4 ">
          <button
            type="button"
            disabled={isModalOpen}
            className="my-4 rounded bg-violet-50 px-4 py-2 font-bold text-violet-700 hover:bg-violet-100 active:bg-violet-200 disabled:bg-gray-300 disabled:text-gray-400"
            onClick={() => setIsModalOpen(true)}
          >
            Back
          </button>
          <label htmlFor="pdf-input">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">
              {parsedPdf ? 'Now click to sign' : 'Select a file to sign'}
            </h2>
            <p className="mb-2 text-slate-800">
              {parsedPdf ? (
                <>
                  You can now look through your pdf on the left and click anywhere to sign. You can still change the pdf
                  by clicking below.
                </>
              ) : (
                <>Please select the pdf document you would like to sign.</>
              )}
            </p>
          </label>
          <div className="flex mb-4">
            {isParsingPdf && <Loader className="my-1 mr-3 inline h-7 w-7 animate-spin text-violet-500" />}
            <input
              id="pdf-input"
              disabled={isParsingPdf}
              className={`flex-grow text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:disabled:bg-gray-300 file:disabled:text-white ${
                parsedPdf
                  ? 'file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 file:active:bg-violet-200'
                  : 'file:bg-violet-500 file:text-white hover:file:bg-violet-700 file:active:bg-violet-800'
              }`}
              type="file"
              accept=".pdf"
              onChange={async (e) => {
                setIsParsingPdf(true);
                await pdfInputOnChange(e);
                setIsParsingPdf(false);
              }}
            />
          </div>
          <span className="flex mb-4 w-full rounded-md shadow-sm">
            <button
              type="button"
              className={`inline-flex flex-grow items-center justify-center rounded-l-md border border-gray-300 px-4 py-2 text-center text-sm font-medium ${
                signType === 'signature'
                  ? 'cursor-default bg-violet-500/90 text-white'
                  : 'cursor-pointer bg-white text-slate-700 hover:bg-gray-50'
              }`}
              onClick={() => setSignType('signature')}
            >
              Sign
            </button>
            <button
              type="button"
              disabled={initials.length === 0}
              title={
                initials.length === 0
                  ? 'Please go back and select initials if you want to initial a document'
                  : undefined
              }
              className={`-ml-px inline-flex flex-grow items-center justify-center rounded-r-md border border-gray-300  px-4 py-2 text-center text-sm font-medium disabled:bg-gray-300 disabled:text-gray-400 ${
                signType === 'initial'
                  ? 'cursor-default bg-violet-500/90 text-white'
                  : 'cursor-pointer bg-white text-slate-700 hover:bg-gray-50'
              }`}
              onClick={() => setSignType('initial')}
            >
              Initial
            </button>
          </span>
          <div className="flex mb-4 justify-center gap-1">
            <button
              className="rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
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
              className="rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              disabled={parsedPdf === null || signedLocations.length === 0}
              onClick={() => {
                if (parsedPdf === null) return;
                setSignedLocations([]);
              }}
            >
              Reset
            </button>
          </div>
          <label htmlFor="signature-size" className="mb-1 text-slate-800">
            Signature Size <span className="text-sm text-gray-500">({signatureHeight}px high)</span>
          </label>
          <input
            id="signature-size"
            type="range"
            value={signatureHeight}
            onChange={(e) => setSignatureHeight(Number.parseInt(e.target.value, 10))}
            min="1"
            max="1000"
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:bg-violet-500"
          />
          <div className="flex mt-8 justify-center">
            <button
              className={`w-48 rounded px-4 py-2 font-bold text-white ${
                parsedPdf
                  ? isSavingPdf
                    ? 'bg-violet-500/90'
                    : 'bg-violet-500 hover:bg-violet-700 active:bg-violet-800'
                  : 'bg-gray-300'
              }`}
              type="button"
              disabled={parsedPdf === null || isSavingPdf}
              onClick={() => {
                if (parsedPdf === null) return;
                setIsSavingPdf(true);
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                setTimeout(async () => {
                  // eslint-disable-next-line new-cap
                  const pdf = new jsPDF({
                    unit: 'px',
                    hotfixes: ['px_scaling'],
                  });
                  pdf.deletePage(1);
                  for (const canvas of canvasArray.current) {
                    pdf.addPage([canvas.width, canvas.height]);
                    pdf.addImage(canvas, 'PNG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
                  }
                  await pdf.save(`${parsedPdf.fileName.replace(/\.pdf/i, '')}_signed.pdf`, { returnPromise: true });
                  setIsSavingPdf(false);
                }, 0);
              }}
            >
              {isSavingPdf && <Loader className="mr-2 inline h-5 w-5 animate-spin text-white" />} Save as PDF 💾
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

export default App;
