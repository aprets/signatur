import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowsPointingInIcon,
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
import type { PdfDocumentState, SignType, SignaturePlacement } from './pdf/types';
import PageCanvas from './components/page-canvas';

const DEFAULT_SIGNATURE_HEIGHT_MM = 25;
const MIN_SIGNATURE_HEIGHT_MM = 5;
const MAX_SIGNATURE_HEIGHT_MM = 100;
const POINTS_PER_MILLIMETER = 72 / 25.4;
const NO_PLACEMENTS: SignaturePlacement[] = [];
const NOTE_DISMISS_MS = 9000;
const PRINT_DPI = 300;

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
const SHOW_EXPORT_TOGGLE_COMPARISON = true;

const ExportToggleComparison = () => {
  const [isSmaller, setIsSmaller] = useState(false);

  const renderStart = () => (
    <div className="flex w-1/3 min-w-fit items-center gap-4">
      <button type="button" className="rounded bg-violet-50 px-2 py-2 text-violet-700">
        <Cog8ToothIcon className="h-6 w-6" />
      </button>
      <button type="button" className="rounded bg-violet-50 px-4 py-2 font-semibold text-violet-700">
        Choose PDF
      </button>
    </div>
  );

  const renderCenter = () => (
    <div className="flex w-1/3 min-w-fit items-center justify-center gap-4">
      <div className="flex w-64">
        <button type="button" className="flex-grow rounded-l-md border border-violet-500 bg-violet-500 px-2 py-2 font-bold text-white">Sign</button>
        <button type="button" className="-ml-px flex-grow rounded-r-md border border-gray-300 bg-gray-100 px-2 py-2 font-bold text-slate-400">Initial</button>
      </div>
      <label className="flex h-10 w-40 items-center gap-2">
        <input
          type="range"
          min="5"
          max="100"
          defaultValue="25"
          className="h-2 min-w-0 flex-1 appearance-none rounded-lg bg-gray-200 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500"
        />
        <span className="w-14 text-right text-sm tabular-nums text-slate-500">25 mm</span>
      </label>
      <button type="button" className="rounded bg-gray-300 px-2 py-2 text-white"><ArrowUturnLeftIcon className="h-6 w-6" /></button>
      <button type="button" className="rounded bg-gray-300 px-2 py-2 text-white"><TrashIcon className="h-6 w-6" /></button>
    </div>
  );

  const saveButton = (
    <button type="button" className="flex min-w-[9.5rem] items-center justify-center gap-2 rounded bg-gray-300 px-3 py-2 font-bold text-white">
      <ArrowDownTrayIcon className="h-6 w-6" />
      <span className="text-sm">Save</span>
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-[1500px] space-y-8">
        <div>
          <h1 className="text-lg font-semibold">Under-25-MB control comparison</h1>
          <p className="mt-1 text-sm text-slate-500">Toggle any option. All three update together.</p>
        </div>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">A · Labelled switch</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="relative flex min-w-[1100px] items-center justify-between gap-4 px-2 py-2">
              {renderStart()}
              {renderCenter()}
              <div className="flex w-1/3 min-w-fit items-center justify-end gap-3">
                <span className="text-sm font-medium text-slate-600">Under 25 MB</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSmaller}
                  onClick={() => setIsSmaller((current) => !current)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${isSmaller ? 'bg-violet-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isSmaller ? 'translate-x-0.5' : '-translate-x-[1.125rem]'}`} />
                </button>
                {saveButton}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-100"><div className="h-full w-2/5 bg-violet-500" /></div>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">B · Quality selector</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="relative flex min-w-[1150px] items-center justify-between gap-4 px-2 py-2">
              {renderStart()}
              {renderCenter()}
              <div className="flex w-1/3 min-w-fit items-center justify-end gap-2">
                <div className="flex h-10 items-center rounded-md bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setIsSmaller(false)}
                    className={`h-8 rounded px-3 text-sm font-medium transition-colors ${!isSmaller ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                  >
                    300 DPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSmaller(true)}
                    className={`h-8 rounded px-3 text-sm font-medium transition-colors ${isSmaller ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    Under 25 MB
                  </button>
                </div>
                {saveButton}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-100"><div className="h-full w-2/5 bg-violet-500" /></div>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">C · Toggle chip</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="relative flex min-w-[1100px] items-center justify-between gap-4 px-2 py-2">
              {renderStart()}
              {renderCenter()}
              <div className="flex w-1/3 min-w-fit items-center justify-end gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSmaller}
                  onClick={() => setIsSmaller((current) => !current)}
                  className={`flex h-10 items-center gap-2 rounded-md border px-2.5 text-sm font-medium transition-colors ${
                    isSmaller
                      ? 'border-violet-200 bg-violet-50 text-violet-700'
                      : 'border-gray-300 bg-white text-slate-600'
                  }`}
                >
                  <span className={`relative h-5 w-9 rounded-full transition-colors ${isSmaller ? 'bg-violet-500' : 'bg-slate-300'}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isSmaller ? 'translate-x-4' : ''}`} />
                  </span>
                  <span>Under 25 MB</span>
                </button>
                {saveButton}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-violet-100"><div className="h-full w-2/5 bg-violet-500" /></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [signType, setSignType] = useState<SignType>('signature');
  const [signatureHeightMm, setSignatureHeightMm] = useState(DEFAULT_SIGNATURE_HEIGHT_MM);
  const [signatures, setSignatures] = useState<HTMLImageElement[]>([]);
  const [initials, setInitials] = useState<HTMLImageElement[]>([]);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentState | null>(null);
  const [signedLocations, setSignedLocations] = useState<SignaturePlacement[]>([]);
  const [status, setStatus] = useState<SaveStatus | null>(null);
  const [nextSignatureOffset, setNextSignatureOffset] = useState<Record<SignType, number>>({
    signature: 0,
    initial: 0,
  });
  const [renderBudget, setRenderBudget] = useState(0);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('print');
  const [saveProgress, setSaveProgress] = useState<ExportProgress | null>(null);
  const readyPreviewPagesRef = useRef(new Set<number>());

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
    setSignedLocations([]);
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
      placements: signedLocations,
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
    const groupedPlacements = new Map<number, SignaturePlacement[]>();
    for (const placement of signedLocations) {
      const pagePlacements = groupedPlacements.get(placement.pageIndex);
      if (pagePlacements) {
        pagePlacements.push(placement);
      } else {
        groupedPlacements.set(placement.pageIndex, [placement]);
      }
    }
    return groupedPlacements;
  }, [signedLocations]);

  const handlePlacement = useCallback((placement: Omit<SignaturePlacement, 'id'>) => {
    setSignedLocations((current) => [...current, { ...placement, id: crypto.randomUUID() }]);
    setNextSignatureOffset((current) => ({
      ...current,
      [placement.type]: current[placement.type] + 1,
    }));
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

  if (SHOW_EXPORT_TOGGLE_COMPARISON) return <ExportToggleComparison />;

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
        <div className="relative flex flex-shrink-0 items-center justify-between gap-4 overflow-x-auto border-b border-solid px-2 py-2">
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
              className={`rounded px-2 py-2 font-bold disabled:bg-gray-300 disabled:text-gray-400 xl:hidden ${
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
              className={`hidden text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-base file:font-semibold file:disabled:bg-gray-300 file:disabled:text-white xl:block ${
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
                className={`-ml-px inline-flex flex-grow items-center justify-center rounded-r-md border border-gray-300 px-2 py-2 text-center font-bold disabled:bg-gray-300 disabled:text-gray-400 ${
                  signType === 'initial'
                    ? 'cursor-default bg-violet-500/90 text-white'
                    : 'cursor-pointer bg-white text-slate-700 hover:bg-gray-50'
                }`}
                onClick={() => setSignType('initial')}
              >
                Initial
              </button>
            </div>
            <label className="flex h-10 w-40 shrink-0 select-none items-center gap-2">
              <span className="sr-only">Signature size</span>
              <input
                type="range"
                value={signatureHeightMm}
                onChange={(event) => setSignatureHeightMm(Number.parseInt(event.target.value, 10))}
                min={MIN_SIGNATURE_HEIGHT_MM}
                max={MAX_SIGNATURE_HEIGHT_MM}
                className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:bg-violet-500"
              />
              <span className="w-14 shrink-0 whitespace-nowrap text-right text-sm tabular-nums text-slate-500">
                {signatureHeightMm} mm
              </span>
            </label>
            <button
              className="rounded bg-violet-500 px-2 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              disabled={pdfDocument === null || signedLocations.length === 0 || isSavingPdf}
              onClick={() => setSignedLocations((current) => current.slice(0, -1))}
            >
              <ArrowUturnLeftIcon className="h-6 w-6" />
            </button>
            <button
              className="rounded bg-violet-500 px-2 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
              type="button"
              disabled={pdfDocument === null || signedLocations.length === 0 || isSavingPdf}
              onClick={() => setSignedLocations([])}
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
              <button
                type="button"
                aria-pressed={isSmallerExport}
                aria-label="Keep the file under 25 MB"
                title={
                  isSmallerExport
                    ? 'On: Signatur lowers the export resolution as far as 150 DPI to get the file under 25 MB. Turn off for 300 DPI print quality.'
                    : 'Off: saving at 300 DPI print quality. Turn on to aim for a file under 25 MB, at as low as 150 DPI.'
                }
                className={`flex h-10 items-center gap-2 rounded border px-2 text-sm font-medium transition-colors ${
                  isSmallerExport
                    ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                    : 'border-gray-300 bg-white text-slate-500 hover:bg-gray-50 hover:text-slate-700'
                }`}
                onClick={() => setExportMode(isSmallerExport ? 'print' : 'smaller')}
              >
                <ArrowsPointingInIcon className="h-5 w-5" />
                <span className="hidden whitespace-nowrap xl:inline">Under 25 MB</span>
              </button>
            )}
            <button
              className={`flex min-w-[3rem] items-center justify-center gap-2 rounded px-3 py-2 font-bold text-white xl:min-w-[9.5rem] ${
                pdfDocument && signedLocations.length
                  ? isSavingPdf
                    ? 'bg-violet-500/90'
                    : 'bg-violet-500 hover:bg-violet-700 active:bg-violet-800'
                  : 'bg-gray-300'
              }`}
              type="button"
              aria-label={saveLabel}
              title={saveDetail ?? 'Save'}
              disabled={pdfDocument === null || isSavingPdf || signedLocations.length === 0}
              onClick={handleSave}
            >
              {isSavingPdf ? (
                <Loader className="h-5 w-5 animate-spin text-white" />
              ) : (
                <ArrowDownTrayIcon className="h-6 w-6" />
              )}
              <span className="hidden text-sm xl:inline">{saveLabel}</span>
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
            !pdfDocument || !signedLocations.length ? 'max-h-36' : 'max-h-0'
          }`}
        >
          <label
            htmlFor={pdfDocument ? undefined : 'pdf-input'}
            className="my-1 block whitespace-nowrap font-medium text-slate-700"
          >
            {pdfDocument ? 'Now click to sign' : 'Select a file to sign'}
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
                  signType={signType}
                  pendingHeightPt={currentPlacementHeightPt}
                  nextAssetIndex={nextSignatureOffset[signType]}
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
