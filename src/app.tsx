import { useEffect, useRef, useState } from 'react';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import signatureUrl from './signature.png';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString();

const modifyPdf = async () => {
  const existingPdfBytes = await fetch('https://pdf-lib.js.org/assets/with_update_sections.pdf').then((res) =>
    res.arrayBuffer(),
  );

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  if (!firstPage) throw new Error('No pages found in the PDF document.');

  // Get the width and height of the first page
  const { width, height } = firstPage.getSize();
  firstPage.drawText('This text was added with JavaScript!', {
    x: 5,
    y: height / 2 + 300,
    size: 50,
    font: helveticaFont,
    color: rgb(0.95, 0.1, 0.1),
    rotate: degrees(-45),
  });

  const pdfBytes = await pdfDoc.save();
  const bytes = new Uint8Array(pdfBytes);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const docUrl = URL.createObjectURL(blob);
  return docUrl;
};

export const renderPdf = async (src: string | Uint8Array, canvas: HTMLCanvasElement) => {
  const pdf = await getDocument(src).promise;
  const context = canvas.getContext('2d');
  const scale = 150 / 72;
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    // eslint-disable-next-line no-await-in-loop
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    if (!context) throw new Error('No context found');
    // eslint-disable-next-line no-param-reassign
    canvas.height = viewport.height;
    // eslint-disable-next-line no-param-reassign
    canvas.width = viewport.width;
    const renderContext = {
      canvasContext: context,
      viewport,
    };
    // eslint-disable-next-line no-await-in-loop
    await page.render(renderContext).promise;
  }
};

const signatureImg = new Image();
signatureImg.src = signatureUrl;

export const draw = (
  e: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  canvas: HTMLCanvasElement,
  renderedPdfImage: HTMLImageElement,
  signatureHeight: number,
) => {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(renderedPdfImage, 0, 0);
  const rect = canvas.getBoundingClientRect();
  context.drawImage(
    signatureImg,
    e.clientX - rect.left,
    e.clientY - rect.top,
    signatureHeight * (signatureImg.width / signatureImg.height),
    signatureHeight,
  );
  // const posx = e.clientX;
  // const posy = e.clientY;
  // context.fillStyle = '#000000';
  // context.fillRect(posx, posy, 4, 4);
};

const App = () => {
  const [pdfData, setPdfData] = useState<Uint8Array>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderInProgressRef = useRef(false);
  const renderedPdfImg = useRef<HTMLImageElement | null>(null);
  const lastMouseMove = useRef(0);

  const renderPdfToCanvas = () => {
    if (!canvasRef.current) throw new Error('No canvas found');
    if (renderInProgressRef.current) {
      console.warn('Render in progress, rejecting new render request');
      return;
    }
    if (!pdfData) {
      console.warn('No pdf data');
      return;
    }
    renderInProgressRef.current = true;
    renderPdf(pdfData, canvasRef.current)
      .then(() => {
        canvasRef.current?.toBlob((blob) => {
          if (!blob) throw new Error('Failed to render pdf to canvas');
          const url = URL.createObjectURL(blob);
          renderedPdfImg.current = new Image();
          renderedPdfImg.current.src = url;
          renderedPdfImg.current
            .decode()
            .then(() => {
              renderInProgressRef.current = false;
            })
            .catch(console.error);
        });
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (pdfData) {
      renderPdfToCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfData]);

  return (
    <main className="flex h-screen">
      <div className="flex flex-grow justify-center overflow-scroll bg-slate-100">
        {pdfData ? (
          <div>
            <canvas
              ref={canvasRef}
              onMouseMove={(e) => {
                if (!canvasRef.current || !renderedPdfImg.current) return;
                // const now = Date.now();
                // if (now - lastMouseMove.current < 1000 / 60) return;
                // lastMouseMove.current = now;
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                draw(e, canvasRef.current, renderedPdfImg.current, 200);
              }}
              onMouseUp={(e) => {
                console.warn('mouse up');
              }}
            />
          </div>
        ) : (
          <p className="flex select-none flex-col justify-center text-gray-500">No document selected</p>
        )}
      </div>
      <div className="w-96 border-l border-solid px-4">
        <input
          className="my-4 box-border w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-700 hover:file:bg-violet-100 active:file:bg-violet-200"
          type="file"
          accept=".pdf"
          onChange={async (e) => {
            if (!e.target.files) return;
            const file = e.target.files[0];
            if (!file) return;
            const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
              const reader = new FileReader();
              reader.addEventListener('load', () => {
                if (reader.result && reader.result instanceof ArrayBuffer) {
                  resolve(reader.result);
                } else {
                  reject(new Error('Could not read file'));
                }
              });
              // eslint-disable-next-line unicorn/prefer-add-event-listener
              reader.onerror = reject;
              reader.readAsArrayBuffer(file);
            });
            setPdfData(new Uint8Array(arrayBuffer));
          }}
        />
      </div>
      {/* <iframe className="h-screen w-5/6" title="document" src={pdfInfo} /> */}
    </main>
  );
};

export default App;
