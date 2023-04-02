import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { useRef, useState } from 'react';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString();

export const readBlobsFromIndexedDb = async (database: IDBDatabase, storeName: 'signatures' | 'initials') => {
  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const arrayBuffers = await new Promise<ArrayBuffer[]>((resolve, reject) => {
    const request = store.getAll();
    request.addEventListener('error', () => {
      reject(new Error('Could not read from indexedDB'));
    });
    request.addEventListener('success', () => {
      resolve(request.result as ArrayBuffer[]);
    });
  });
  const blobPromises = arrayBuffers.map((arrayBuffer) => arrayBufferToBlob(arrayBuffer, 'image/png'));
  return Promise.all(blobPromises);
};

export const writeBlobsToIndexedDb = async (
  blobs: Blob[],
  database: IDBDatabase,
  storeName: 'signatures' | 'initials',
) => {
  const arrayBufferPromises = blobs.map((blob) => blobToArrayBuffer(blob));
  const arrayBuffers = await Promise.all(arrayBufferPromises);
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.addEventListener('error', () => {
      reject(new Error('Could not clear indexedDB'));
    });
    request.addEventListener('success', () => {
      resolve();
    });
  });
  const savePromises = arrayBuffers.map(
    (arrayBuffer) =>
      new Promise<void>((resolve, reject) => {
        const request = store.add(arrayBuffer);
        request.addEventListener('error', () => {
          reject(new Error('Could not add to indexedDB'));
        });
        request.addEventListener('success', () => {
          resolve();
        });
      }),
  );
  await Promise.all(savePromises);
};

export const getIndexedDbDatabase = async () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('signatur', 1);
    request.addEventListener('success', () => {
      resolve(request.result);
    });

    request.addEventListener('error', () => {
      reject(new Error('Could not open indexedDB'));
    });

    request.addEventListener('upgradeneeded', () => {
      const db = request.result;
      db.createObjectStore('signatures', { autoIncrement: true });
      db.createObjectStore('initials', { autoIncrement: true });
      resolve(db);
    });
  });

// https://stackoverflow.com/a/2450976
export const shuffle = <T,>(originalArray: T[]): T[] => {
  const array = [...originalArray];
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex] as T, array[currentIndex] as T];
  }

  return array;
};

export const arrayBufferToBlob = (arrayBuffer: ArrayBuffer, mimeType: string) =>
  new Blob([arrayBuffer], { type: mimeType });

export const blobToArrayBuffer = async (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      if (reader.result && reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file'));
      }
    });
    reader.addEventListener('error', () => {
      reject(new Error('Could not read file'));
    });
    reader.readAsArrayBuffer(blob);
  });

const pdfViewPortScale = 150 / 72;
export const renderPdfToImgs = async (pdfBlob: Blob) => {
  const arrayBuffer = await blobToArrayBuffer(pdfBlob);
  const doc = await getDocument(arrayBuffer).promise;
  const pageNums = Array.from({ length: doc.numPages }, (_, i) => i + 1);
  const imagePromises = pageNums.map(async (pageNum) => {
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    document.body.append(canvas);
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) throw new Error('No context found');
    const page = await doc.getPage(pageNum);
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
    canvas.remove();
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
  const [parsedPdf, setParsedPdf] = useState<{
    images: HTMLImageElement[];
    parsedAtStr: string;
    fileName: string;
  } | null>(null);

  const pdfInputOnChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;
    if (renderInProgressRef.current) {
      console.warn('Render in progress, rejecting new render request');
      return;
    }
    renderInProgressRef.current = true;
    setParsedPdf({
      images: await renderPdfToImgs(file),
      parsedAtStr: new Date().toISOString(),
      fileName: file.name,
    });
    renderInProgressRef.current = false;
  };

  return {
    parsedPdf,
    pdfInputOnChange,
  };
};
