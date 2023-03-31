import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { useRef, useState } from 'react';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString();

const pdfViewPortScale = 150 / 72;
export const renderPdfToImgs = async (pdfFile: Blob) => {
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
    reader.readAsArrayBuffer(pdfFile);
  });
  // const  new Uint8Array(arrayBuffer);
  const pdf = await getDocument(arrayBuffer).promise;
  const pageNums = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  const imagePromises = pageNums.map(async (pageNum) => {
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    document.body.append(canvas);
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) throw new Error('No context found');
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: pdfViewPortScale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const renderContext = {
      canvasContext,
      viewport,
    };
    await page.render(renderContext).promise;
    const imageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to save canvas to blob'));
      });
    });
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  });
  return Promise.all(imagePromises);
};

export const useParsePdf = () => {
  const renderInProgressRef = useRef(false);
  const [pdfImages, setPdfImages] = useState<HTMLImageElement[] | null>(null);

  const pdfInputOnChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;
    if (renderInProgressRef.current) {
      console.warn('Render in progress, rejecting new render request');
      return;
    }
    renderInProgressRef.current = true;
    setPdfImages(await renderPdfToImgs(file));
    renderInProgressRef.current = false;
  };

  return {
    pdfImages,
    pdfInputOnChange,
  };
};
