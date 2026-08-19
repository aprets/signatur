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
const PLACEMENT_TOOLS: { tool: PlacementTool; label: string }[] = [
  { tool: 'signature', label: 'Sign' },
  { tool: 'initial', label: 'Initial' },
  { tool: 'text', label: 'Text' },
];

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
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (placementTool !== 'text') return;
    textInputRef.current?.focus();
  }, [placementTool]);

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

  const isTextTool = placementTool === 'text';
  const sizeControl = isTextTool
    ? {
        label: 'Text size',
        unit: 'pt',
        value: textSizePt,
        min: MIN_TEXT_SIZE_PT,
        max: MAX_TEXT_SIZE_PT,
        onChange: setTextSizePt,
      }
    : {
        label: placementTool === 'initial' ? 'Initials height' : 'Signature height',
        unit: 'mm',
        value: signatureHeightMm,
        min: MIN_SIGNATURE_HEIGHT_MM,
        max: MAX_SIGNATURE_HEIGHT_MM,
        onChange: setSignatureHeightMm,
      };

  const isAwaitingText = isTextTool && !text.trim();
  const hintLabel = pdfDocument
    ? isTextTool
      ? isAwaitingText
        ? 'Type your text, then click to place it'
        : 'Now click to place your text'
      : 'Now click to sign'
    : 'Select a file to sign';

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
        <div className="flex flex-shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-solid px-3 py-2 lg:gap-3">
          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <button
              type="button"
              disabled={isModalOpen}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200 disabled:bg-gray-300 disabled:text-gray-400"
              onClick={() => setIsModalOpen(true)}
            >
              <Cog8ToothIcon className="h-6 w-6" />
            </button>
            {isParsingPdf && <Loader className="h-7 w-7 animate-spin text-violet-500" />}
            <label
              htmlFor="pdf-input"
              className={`flex h-10 w-10 items-center justify-center rounded-lg disabled:bg-gray-300 disabled:text-gray-400 xl:hidden ${
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
              className={`hidden text-sm text-slate-500 file:mr-4 file:h-10 file:rounded-lg file:border-0 file:px-4 file:text-base file:font-semibold file:disabled:bg-gray-300 file:disabled:text-white xl:block ${
                pdfDocument
                  ? 'file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 file:active:bg-violet-200'
                  : 'file:bg-violet-500 file:text-white hover:file:bg-violet-700 file:active:bg-violet-800'
              }`}
              type="file"
              accept=".pdf"
              onChange={handlePdfInputChange}
            />
          </div>
          <div className="flex flex-1 items-center justify-center gap-2 lg:gap-3">
            <div className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1">
              {PLACEMENT_TOOLS.map(({ tool, label }) => {
                const isUnavailable = tool === 'initial' && initials.length === 0;
                return (
                  <button
                    key={tool}
                    type="button"
                    disabled={isUnavailable}
                    aria-pressed={placementTool === tool}
                    title={
                      isUnavailable ? 'Please go back and select initials if you want to initial a document' : undefined
                    }
                    className={`h-8 rounded-md px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:text-slate-400 ${
                      placementTool === tool
                        ? 'cursor-default bg-white text-violet-700 shadow-sm ring-1 ring-slate-900/5'
                        : 'cursor-pointer text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setPlacementTool(tool)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="relative h-10 w-[7.5rem] shrink-0 lg:w-44">
              <span
                aria-hidden
                className={`absolute inset-0 flex select-none items-center justify-end overflow-hidden whitespace-nowrap text-sm text-slate-500 transition-opacity duration-150 ${
                  isTextTool ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {sizeControl.label}
              </span>
              <input
                ref={textInputRef}
                type="text"
                value={text}
                aria-label="Text to place"
                aria-hidden={!isTextTool}
                tabIndex={isTextTool ? 0 : -1}
                placeholder="Name, date or reference"
                onChange={(event) => setText(event.target.value)}
                className={`absolute inset-0 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-slate-900 transition-opacity duration-150 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 ${
                  isTextTool ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              />
            </div>
            <label className="flex h-10 w-40 shrink-0 select-none items-center gap-2">
              <span className="sr-only">{sizeControl.label}</span>
              <input
                type="range"
                value={sizeControl.value}
                onChange={(event) => sizeControl.onChange(Number.parseInt(event.target.value, 10))}
                min={sizeControl.min}
                max={sizeControl.max}
                className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:bg-violet-500"
              />
              <span className="w-14 shrink-0 whitespace-nowrap text-right text-sm tabular-nums text-slate-500">
                {sizeControl.value} {sizeControl.unit}
              </span>
            </label>
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              title="Undo last placement"
              disabled={pdfDocument === null || placements.length === 0 || isSavingPdf}
              onClick={() => setPlacements((current) => current.slice(0, -1))}
            >
              <ArrowUturnLeftIcon className="h-6 w-6" />
            </button>
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              title="Remove all placements"
              disabled={pdfDocument === null || placements.length === 0 || isSavingPdf}
              onClick={() => setPlacements([])}
            >
              <TrashIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="flex shrink-0 items-center justify-end">
            <button
              className={`flex h-10 w-10 items-center justify-center gap-2 overflow-hidden rounded-lg px-2 font-bold text-white lg:w-40 lg:px-3 ${
                pdfDocument && placements.length
                  ? isSavingPdf
                    ? 'bg-violet-500/90'
                    : 'bg-violet-500 hover:bg-violet-700 active:bg-violet-800'
                  : 'bg-gray-300'
              }`}
              type="button"
              title={saveLabel}
              disabled={pdfDocument === null || isSavingPdf || placements.length === 0}
              onClick={handleSave}
            >
              {isSavingPdf ? (
                <Loader className="h-6 w-6 shrink-0 animate-spin text-white" />
              ) : (
                <ArrowDownTrayIcon className="h-6 w-6 shrink-0" />
              )}
              <span className="hidden min-w-0 truncate text-sm lg:inline">{saveLabel}</span>
            </button>
          </div>
        </div>
        <div
          className={`border-b border-solid bg-violet-100 text-center transition-all ${
            !pdfDocument || !placements.length || isAwaitingText ? 'max-h-36' : 'max-h-0'
          }`}
        >
          <label
            htmlFor={pdfDocument ? undefined : 'pdf-input'}
            className="my-1 block whitespace-nowrap font-medium text-slate-700"
          >
            {hintLabel}
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
