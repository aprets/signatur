import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import StarterModal from './starter-modal';
import Loader from './loader';
import loadPdfDocument from './pdf/document';
import saveFlattenedPdf from './pdf/export';
import type { ImagePlacementType, NewPlacement, PdfDocumentState, Placement, PlacementTool } from './pdf/types';
import PageCanvas from './components/page-canvas';

const DEFAULT_SIGNATURE_HEIGHT_MM = 25;
const MIN_SIGNATURE_HEIGHT_MM = 5;
const MAX_SIGNATURE_HEIGHT_MM = 100;
const DEFAULT_TEXT_SIZE_PT = 12;
const MIN_TEXT_SIZE_PT = 6;
const MAX_TEXT_SIZE_PT = 48;
const POINTS_PER_MILLIMETER = 72 / 25.4;
const NO_PLACEMENTS: Placement[] = [];

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [placementTool, setPlacementTool] = useState<PlacementTool>('signature');
  const [signatureHeightMm, setSignatureHeightMm] = useState(DEFAULT_SIGNATURE_HEIGHT_MM);
  const [text, setText] = useState('');
  const [textSizePt, setTextSizePt] = useState(DEFAULT_TEXT_SIZE_PT);
  const [signatures, setSignatures] = useState<HTMLImageElement[]>([]);
  const [initials, setInitials] = useState<HTMLImageElement[]>([]);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentState | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nextSignatureOffset, setNextSignatureOffset] = useState<Record<ImagePlacementType, number>>({
    signature: 0,
    initial: 0,
  });
  const [renderBudget, setRenderBudget] = useState(0);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ currentPage: number; totalPages: number } | null>(null);
  const readyPreviewPagesRef = useRef(new Set<number>());

  useEffect(
    () => () => {
      if (!pdfDocument) return;
      pdfDocument.proxy.destroy().catch((error: unknown) => {
        // Cleanup can fail after the UI has unmounted, when there is nowhere left to surface the error.
        // eslint-disable-next-line no-console
        console.error('Failed to release the PDF document', error);
      });
    },
    [pdfDocument],
  );

  const handlePdfInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    if (!file) return;

    setIsParsingPdf(true);
    setLoadError(null);

    const nextDocument = await loadPdfDocument(file).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to load the PDF';
      setLoadError(message);
      return null;
    });

    setIsParsingPdf(false);
    if (!nextDocument) return;

    readyPreviewPagesRef.current.clear();
    setRenderBudget(Math.min(2, nextDocument.pageCount));
    setPlacements([]);
    setSaveProgress(null);
    setPdfDocument(nextDocument);
  };

  const handlePreviewReady = useCallback(
    (pageIndex: number) => {
      if (!pdfDocument) return;
      if (readyPreviewPagesRef.current.has(pageIndex)) return;

      readyPreviewPagesRef.current.add(pageIndex);
      setRenderBudget((currentBudget) => {
        if (currentBudget >= pdfDocument.pageCount) return currentBudget;
        if (readyPreviewPagesRef.current.size < currentBudget) return currentBudget;
        return Math.min(currentBudget + 1, pdfDocument.pageCount);
      });
    },
    [pdfDocument],
  );

  const handleSave = async () => {
    if (!pdfDocument) return;

    setIsSavingPdf(true);
    setLoadError(null);
    setSaveProgress({
      currentPage: 0,
      totalPages: pdfDocument.pageCount,
    });

    await saveFlattenedPdf({
      pdfDocument,
      placements,
      signatures,
      initials,
      onProgress: (currentPage, totalPages) => {
        setSaveProgress({ currentPage, totalPages });
      },
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to save the PDF';
      setLoadError(message);
    });

    setIsSavingPdf(false);
    setSaveProgress(null);
  };

  const placementsByPage = useMemo(() => {
    const groupedPlacements = new Map<number, Placement[]>();
    for (const placement of placements) {
      const pagePlacements = groupedPlacements.get(placement.pageIndex);
      if (pagePlacements) {
        pagePlacements.push(placement);
      } else {
        groupedPlacements.set(placement.pageIndex, [placement]);
      }
    }
    return groupedPlacements;
  }, [placements]);

  const handlePlacement = useCallback((placement: NewPlacement) => {
    setPlacements((current) => [...current, { ...placement, id: crypto.randomUUID() }]);
    if (placement.type !== 'text') {
      setNextSignatureOffset((current) => ({
        ...current,
        [placement.type]: current[placement.type] + 1,
      }));
    }
  }, []);

  const currentPlacementHeightPt = signatureHeightMm * POINTS_PER_MILLIMETER;
  const saveLabel = saveProgress ? `Saving ${saveProgress.currentPage}/${saveProgress.totalPages}` : 'Save';

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
        <div className="flex flex-shrink-0 items-center justify-between gap-4 overflow-x-auto border-b border-solid px-2 py-2">
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
              className={`rounded px-2 py-2 font-bold disabled:bg-gray-300 disabled:text-gray-400 lg:hidden ${
                pdfDocument
                  ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200'
                  : 'bg-violet-500 text-white hover:bg-violet-700 active:bg-violet-800'
              }`}
            >
              <DocumentTextIcon className="h-6 w-6" />
            </label>
            <input
              id="pdf-input"
              disabled={isParsingPdf || isSavingPdf}
              className={`hidden text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-base file:font-semibold file:disabled:bg-gray-300 file:disabled:text-white lg:block ${
                pdfDocument
                  ? 'file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 file:active:bg-violet-200'
                  : 'file:bg-violet-500 file:text-white hover:file:bg-violet-700 file:active:bg-violet-800'
              }`}
              type="file"
              accept=".pdf"
              onChange={handlePdfInputChange}
            />
          </div>
          <div className="flex w-1/3 min-w-fit items-center justify-center gap-4">
            <div className="flex w-64">
              <button
                type="button"
                className={`inline-flex flex-grow items-center justify-center rounded-l-md border border-gray-300 px-2 py-2 text-center font-bold ${
                  placementTool === 'signature'
                    ? 'cursor-default bg-violet-500/90 text-white'
                    : 'cursor-pointer bg-white text-slate-700 hover:bg-gray-50'
                }`}
                onClick={() => setPlacementTool('signature')}
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
                className={`-ml-px inline-flex flex-grow items-center justify-center border border-gray-300 px-2 py-2 text-center font-bold disabled:bg-gray-300 disabled:text-gray-400 ${
                  placementTool === 'initial'
                    ? 'cursor-default bg-violet-500/90 text-white'
                    : 'cursor-pointer bg-white text-slate-700 hover:bg-gray-50'
                }`}
                onClick={() => setPlacementTool('initial')}
              >
                Initial
              </button>
              <button
                type="button"
                className={`-ml-px inline-flex flex-grow items-center justify-center rounded-r-md border border-gray-300 px-2 py-2 text-center font-bold ${
                  placementTool === 'text'
                    ? 'cursor-default bg-violet-500/90 text-white'
                    : 'cursor-pointer bg-white text-slate-700 hover:bg-gray-50'
                }`}
                onClick={() => setPlacementTool('text')}
              >
                Text
              </button>
            </div>
            {placementTool === 'text' ? (
              <div className="flex items-end gap-2">
                <label htmlFor="placement-text" className="text-sm font-medium text-slate-700">
                  Text
                  <input
                    id="placement-text"
                    type="text"
                    value={text}
                    placeholder="Name, position or date"
                    onChange={(event) => setText(event.target.value)}
                    className="mt-1 block w-56 rounded-md border border-gray-300 px-2 py-1.5 text-base font-normal text-slate-900 placeholder:text-slate-400"
                  />
                </label>
                <label htmlFor="text-size" className="text-sm font-medium text-slate-700">
                  Size
                  <input
                    id="text-size"
                    type="number"
                    value={textSizePt}
                    min={MIN_TEXT_SIZE_PT}
                    max={MAX_TEXT_SIZE_PT}
                    onChange={(event) => {
                      if (!Number.isNaN(event.target.valueAsNumber)) {
                        setTextSizePt(
                          Math.min(MAX_TEXT_SIZE_PT, Math.max(MIN_TEXT_SIZE_PT, event.target.valueAsNumber)),
                        );
                      }
                    }}
                    className="mt-1 block w-16 rounded-md border border-gray-300 px-2 py-1.5 text-base font-normal text-slate-900"
                  />
                </label>
              </div>
            ) : (
              <div className="w-56 select-none">
                <label htmlFor="signature-size" className="mb-1 whitespace-nowrap text-slate-800">
                  Signature Size <span className="text-sm text-gray-500">({signatureHeightMm} mm high)</span>
                </label>
                <input
                  id="signature-size"
                  type="range"
                  value={signatureHeightMm}
                  onChange={(event) => setSignatureHeightMm(Number.parseInt(event.target.value, 10))}
                  min={MIN_SIGNATURE_HEIGHT_MM}
                  max={MAX_SIGNATURE_HEIGHT_MM}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:bg-violet-500"
                />
              </div>
            )}
            <button
              className="rounded bg-violet-500 px-2 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              disabled={pdfDocument === null || placements.length === 0 || isSavingPdf}
              onClick={() => setPlacements((current) => current.slice(0, -1))}
            >
              <ArrowUturnLeftIcon className="h-6 w-6" />
            </button>
            <button
              className="rounded bg-violet-500 px-2 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              disabled={pdfDocument === null || placements.length === 0 || isSavingPdf}
              onClick={() => setPlacements([])}
            >
              <TrashIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="flex w-1/3 min-w-fit items-center justify-end gap-4">
            <button
              className={`flex min-w-[7rem] items-center justify-center gap-2 rounded px-3 py-2 font-bold text-white ${
                pdfDocument && placements.length
                  ? isSavingPdf
                    ? 'bg-violet-500/90'
                    : 'bg-violet-500 hover:bg-violet-700 active:bg-violet-800'
                  : 'bg-gray-300'
              }`}
              type="button"
              disabled={pdfDocument === null || isSavingPdf || placements.length === 0}
              onClick={handleSave}
            >
              {isSavingPdf && <Loader className="h-5 w-5 animate-spin text-white" />}
              <ArrowDownTrayIcon className="h-6 w-6" />
              <span className="hidden text-sm lg:inline">{saveLabel}</span>
            </button>
          </div>
        </div>
        <div
          className={`border-b border-solid bg-violet-100 text-center transition-all ${
            !pdfDocument || !placements.length ? 'max-h-36' : 'max-h-0'
          }`}
        >
          <label
            htmlFor={pdfDocument ? undefined : 'pdf-input'}
            className="my-1 block whitespace-nowrap font-medium text-slate-700"
          >
            {pdfDocument
              ? placementTool === 'text' && !text.trim()
                ? 'Enter text, then click to place'
                : placementTool === 'text'
                ? 'Now click to place text'
                : 'Now click to sign'
              : 'Select a file to sign'}
          </label>
          {loadError && <p className="pb-2 text-sm font-medium text-red-700">{loadError}</p>}
        </div>
        <div className="flex flex-grow justify-center overflow-auto bg-slate-100">
          {pdfDocument === null ? (
            <p className="flex select-none flex-col justify-center text-slate-500">No document selected</p>
          ) : (
            <div className="flex w-full max-w-5xl flex-col gap-8 px-4 py-6">
              {pdfDocument.pages.map((pageMeta) => (
                <PageCanvas
                  key={`${pdfDocument.fileName}-${pageMeta.pageIndex}`}
                  pdfDocument={pdfDocument}
                  pageMeta={pageMeta}
                  signatures={signatures}
                  initials={initials}
                  placements={placementsByPage.get(pageMeta.pageIndex) ?? NO_PLACEMENTS}
                  placementTool={placementTool}
                  pendingText={text}
                  pendingFontSizePt={textSizePt}
                  pendingHeightPt={currentPlacementHeightPt}
                  nextAssetIndex={placementTool === 'text' ? 0 : nextSignatureOffset[placementTool]}
                  isRenderActive={pageMeta.pageIndex < renderBudget}
                  onPreviewReady={handlePreviewReady}
                  onPlacement={handlePlacement}
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
