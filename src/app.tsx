import { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useParsePdf } from './lib';
import StarterModal from './starter-modal';
import Loader from './loader';

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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      <main className="flex h-screen flex-col">
        <div className="flex flex-shrink-0 items-center justify-between gap-4 overflow-x-scroll border-b border-solid px-2 py-2">
          <div className="flex w-1/3 min-w-fit items-center gap-4">
            <button
              type="button"
              disabled={isModalOpen}
              className="rounded bg-violet-50 px-2 py-2 font-bold text-violet-700 hover:bg-violet-100 active:bg-violet-200 disabled:bg-gray-300 disabled:text-gray-400"
              onClick={() => setIsModalOpen(true)}
            >
              <Cog8ToothIcon className="h-6 w-6" />
            </button>
            {isParsingPdf && <Loader className="h-7 w-7 animate-spin text-violet-500" />}
            <label
              htmlFor="pdf-input"
              className={`rounded px-2 py-2 font-bold disabled:bg-gray-300  disabled:text-gray-400 lg:hidden ${
                parsedPdf
                  ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200'
                  : 'bg-violet-500 text-white hover:bg-violet-700 active:bg-violet-800'
              }`}
            >
              <DocumentTextIcon className="h-6 w-6" />
            </label>
            <input
              id="pdf-input"
              disabled={isParsingPdf}
              className={`hidden text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-base file:font-semibold file:disabled:bg-gray-300 file:disabled:text-white lg:block ${
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
          <div className="flex w-1/3 min-w-fit items-center justify-center gap-4">
            <div className="flex w-64">
              <button
                type="button"
                className={`inline-flex flex-grow items-center justify-center rounded-l-md border border-gray-300 px-2 py-2 text-center font-bold ${
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
                className={`-ml-px inline-flex flex-grow items-center justify-center rounded-r-md border border-gray-300  px-2 py-2 text-center font-bold disabled:bg-gray-300 disabled:text-gray-400 ${
                  signType === 'initial'
                    ? 'cursor-default bg-violet-500/90 text-white'
                    : 'cursor-pointer bg-white text-slate-700 hover:bg-gray-50'
                }`}
                onClick={() => setSignType('initial')}
              >
                Initial
              </button>
            </div>
            <div className="w-48 select-none">
              <label htmlFor="signature-size" className="mb-1 whitespace-nowrap text-slate-800">
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
            </div>
            <button
              className="rounded bg-violet-500 px-2 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              disabled={parsedPdf === null || signedLocations.length === 0}
              onClick={() => {
                if (parsedPdf === null) return;
                setSignedLocations((s) => s.slice(0, -1));
              }}
            >
              <ArrowUturnLeftIcon className="h-6 w-6" />
            </button>
            <button
              className="rounded bg-violet-500 px-2 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              disabled={parsedPdf === null || signedLocations.length === 0}
              onClick={() => {
                if (parsedPdf === null) return;
                setSignedLocations([]);
              }}
            >
              <TrashIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="flex w-1/3 min-w-fit items-center justify-end gap-4">
            <button
              className={`rounded px-2 py-2 font-bold text-white ${
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
              {isSavingPdf && <Loader className="mr-2 inline h-5 w-5 animate-spin text-white" />}{' '}
              <ArrowDownTrayIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div
          className={`border-b border-solid bg-violet-100 text-center transition-all ${
            !parsedPdf || !signedLocations.length ? 'max-h-36' : 'max-h-0'
          }`}
        >
          <label
            htmlFor={parsedPdf ? undefined : 'pdf-input'}
            className="my-1 block whitespace-nowrap font-medium text-slate-700 "
          >
            {parsedPdf ? 'Now click to sign' : 'Select a file to sign'}
          </label>
        </div>
        <div className="flex flex-grow justify-center overflow-scroll bg-slate-100">
          {parsedPdf === null ? (
            <p className="flex select-none flex-col justify-center text-slate-500">No document selected</p>
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
      </main>
    </>
  );
};

export default App;
