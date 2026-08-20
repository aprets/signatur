import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import StarterModal from './starter-modal';
import Loader from './loader';
import loadPdfDocument from './pdf/document';
import saveFlattenedPdf from './pdf/export';
import type { ExportMode, ExportProgress } from './pdf/export';
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
const NOTE_DISMISS_MS = 9000;
const PRINT_DPI = 300;
const PLACEMENT_TOOLS: { tool: PlacementTool; label: string }[] = [
  { tool: 'signature', label: 'Sign' },
  { tool: 'initial', label: 'Initial' },
  { tool: 'text', label: 'Text' },
];

type StatusTone = 'error' | 'warning' | 'note';

interface SaveStatus {
  tone: StatusTone;
  message: string;
}

const STATUS_TONE_STYLES: Record<StatusTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  note: 'border-slate-200 bg-slate-50 text-slate-600',
};

const STATUS_TONE_ICONS: Record<StatusTone, typeof ExclamationCircleIcon> = {
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  note: InformationCircleIcon,
};

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePackName, setActivePackName] = useState('');
  const [placementTool, setPlacementTool] = useState<PlacementTool>('signature');
  const [signatureHeightMm, setSignatureHeightMm] = useState(DEFAULT_SIGNATURE_HEIGHT_MM);
  const [text, setText] = useState('');
  const [textSizePt, setTextSizePt] = useState(DEFAULT_TEXT_SIZE_PT);
  const [signatures, setSignatures] = useState<HTMLImageElement[]>([]);
  const [initials, setInitials] = useState<HTMLImageElement[]>([]);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentState | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [status, setStatus] = useState<SaveStatus | null>(null);
  const [nextSignatureOffset, setNextSignatureOffset] = useState<Record<ImagePlacementType, number>>({
    signature: 0,
    initial: 0,
  });
  const [renderBudget, setRenderBudget] = useState(0);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('print');
  const [saveProgress, setSaveProgress] = useState<ExportProgress | null>(null);
  const readyPreviewPagesRef = useRef(new Set<number>());
  const textInputRef = useRef<HTMLInputElement>(null);

  const openModal = useCallback(() => setIsModalOpen(true), []);

  useEffect(() => {
    if (placementTool !== 'text') return;
    textInputRef.current?.focus();
  }, [placementTool]);

  useEffect(() => {
    const dismissTimeout = status?.tone === 'note' ? setTimeout(() => setStatus(null), NOTE_DISMISS_MS) : undefined;
    return () => clearTimeout(dismissTimeout);
  }, [status]);

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
    setStatus(null);

    const nextDocument = await loadPdfDocument(file).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to load the PDF';
      setStatus({ tone: 'error', message });
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
    setStatus(null);
    setSaveProgress({
      currentPage: 0,
      totalPages: pdfDocument.pageCount,
      pass: 1,
      dpi: PRINT_DPI,
    });

    const result = await saveFlattenedPdf({
      pdfDocument,
      placements,
      signatures,
      initials,
      mode: exportMode,
      onProgress: setSaveProgress,
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to save the PDF';
      setStatus({ tone: 'error', message });
      return null;
    });

    if (result && exportMode === 'smaller' && !result.targetMet) {
      setStatus({
        tone: 'warning',
        message: `Still ${(result.byteLength / 1_000_000).toFixed(1)} MB at ${
          result.dpi
        } DPI, the lowest quality Signatur will export. Try saving fewer pages at a time.`,
      });
    } else if (result && exportMode === 'smaller' && result.dpi < PRINT_DPI) {
      setStatus({
        tone: 'note',
        message: `Saved ${(result.byteLength / 1_000_000).toFixed(1)} MB — resolution reduced to ${
          result.dpi
        } DPI to fit under 25 MB.`,
      });
    }

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
  const isSmallerExport = exportMode === 'smaller';
  const isRetryPass = !!saveProgress && saveProgress.pass > 1;
  const saveLabel = saveProgress
    ? `${isRetryPass ? 'Shrinking' : 'Saving'} ${saveProgress.currentPage}/${saveProgress.totalPages}`
    : 'Save';
  const saveDetail = saveProgress
    ? `${
        isRetryPass
          ? `Pass ${saveProgress.pass}: re-rendering every page at ${saveProgress.dpi} DPI to fit under 25 MB`
          : `Rendering at ${saveProgress.dpi} DPI`
      } — page ${saveProgress.currentPage} of ${saveProgress.totalPages}`
    : undefined;
  const saveAnnouncement = saveProgress
    ? `${isRetryPass ? `Optimisation pass ${saveProgress.pass}` : 'Saving'} at ${saveProgress.dpi} DPI, ${
        saveProgress.totalPages
      } pages`
    : '';
  const savedPagePercent = saveProgress
    ? Math.round((saveProgress.currentPage / Math.max(1, saveProgress.totalPages)) * 100)
    : 0;
  const StatusIcon = status ? STATUS_TONE_ICONS[status.tone] : null;

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
        openModal={openModal}
        closeModal={() => setIsModalOpen(false)}
        canProceed={!!signatures.length}
        hasPlacements={placements.length > 0}
        onAssetsChanged={() => {
          setPlacements([]);
          setPlacementTool('signature');
        }}
        onActivePackName={setActivePackName}
        setSignatures={setSignatures}
        setInitials={setInitials}
      />
      <main className="flex h-screen flex-col">
        <div className="relative flex flex-shrink-0 items-center justify-between gap-4 overflow-x-auto border-b border-solid px-2 py-2">
          <div className="flex w-1/3 min-w-fit items-center gap-4">
            <button
              type="button"
              disabled={isModalOpen}
              title="Signature packs and settings"
              className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-violet-50 px-2 text-violet-700 hover:bg-violet-100 active:bg-violet-200 disabled:bg-gray-300 disabled:text-gray-400"
              onClick={openModal}
            >
              <Cog8ToothIcon className="h-6 w-6 shrink-0" />
              {activePackName && (
                <span className="max-w-[9rem] truncate pr-1 text-sm font-semibold">{activePackName}</span>
              )}
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
          <div className="flex w-1/3 min-w-fit items-center justify-center gap-2 lg:gap-3">
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
          <div className="sticky right-0 z-10 flex w-1/3 min-w-fit items-center justify-end gap-2 bg-white before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-white before:content-['']">
            {saveProgress ? (
              <p className="whitespace-nowrap px-1 text-sm text-slate-500" title={saveDetail}>
                {isRetryPass && <span className="hidden xl:inline">Pass {saveProgress.pass} · </span>}
                {saveProgress.dpi} DPI
              </p>
            ) : (
              <div
                className="flex h-10 items-center rounded-md bg-slate-100 p-1"
                role="group"
                aria-label="PDF export quality"
              >
                <button
                  type="button"
                  aria-pressed={!isSmallerExport}
                  title="Save at 300 DPI print quality"
                  className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                    isSmallerExport ? 'text-slate-500 hover:text-slate-700' : 'bg-white text-slate-800 shadow-sm'
                  }`}
                  onClick={() => setExportMode('print')}
                >
                  300 DPI
                </button>
                <button
                  type="button"
                  aria-pressed={isSmallerExport}
                  title="Aim for a file under 25 MB, reducing resolution as far as 150 DPI if needed"
                  className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                    isSmallerExport ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => setExportMode('smaller')}
                >
                  Under 25 MB
                </button>
              </div>
            )}
            <button
              className={`flex h-10 w-12 items-center justify-center gap-2 overflow-hidden rounded px-3 font-bold text-white xl:w-48 ${
                pdfDocument && placements.length
                  ? isSavingPdf
                    ? 'bg-violet-500/90'
                    : 'bg-violet-500 hover:bg-violet-700 active:bg-violet-800'
                  : 'bg-gray-300'
              }`}
              type="button"
              aria-label={saveLabel}
              title={saveDetail ?? 'Save'}
              disabled={pdfDocument === null || isSavingPdf || placements.length === 0}
              onClick={handleSave}
            >
              {isSavingPdf ? (
                <Loader className="h-5 w-5 shrink-0 animate-spin text-white" />
              ) : (
                <ArrowDownTrayIcon className="h-6 w-6 shrink-0" />
              )}
              <span className="hidden min-w-0 truncate text-sm xl:inline">{saveLabel}</span>
            </button>
          </div>
          {saveProgress && (
            <div
              className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-100"
              role="progressbar"
              aria-label={saveDetail}
              aria-valuenow={savedPagePercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-violet-500 transition-[width] duration-200"
                style={{ width: `${savedPagePercent}%` }}
              />
            </div>
          )}
          <p aria-live="polite" className="sr-only">
            {saveAnnouncement}
          </p>
        </div>
        <div
          className={`overflow-hidden border-b border-solid bg-violet-100 text-center transition-all ${
            !pdfDocument || !placements.length || isAwaitingText ? 'max-h-36' : 'max-h-0'
          }`}
        >
          <label
            htmlFor={pdfDocument ? undefined : 'pdf-input'}
            className="my-1 block whitespace-nowrap font-medium text-slate-700"
          >
            {hintLabel}
          </label>
        </div>
        {status && StatusIcon && (
          <div
            role={status.tone === 'error' ? 'alert' : 'status'}
            className={`flex flex-shrink-0 items-center justify-center gap-2 border-b border-solid px-3 py-1.5 text-sm ${
              STATUS_TONE_STYLES[status.tone]
            }`}
          >
            <StatusIcon className="h-4 w-4 flex-shrink-0" />
            <p>{status.message}</p>
            <button
              type="button"
              aria-label="Dismiss message"
              className="-mr-1 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
              onClick={() => setStatus(null)}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
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
