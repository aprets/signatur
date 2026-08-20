import { useCallback, useEffect, useRef, useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Modal from 'react-modal';
import {
  createSignaturePackAndSelect,
  deleteSignaturePackAndSelect,
  getIndexedDbDatabase,
  readActiveSignaturePackId,
  readSignaturePacks,
  shuffle,
  writeActiveSignaturePackId,
  writeSignaturePack,
  writeSignaturePackName,
} from './lib';
import type { SignaturePack, SignaturePackImageType } from './lib';

Modal.setAppElement('#root');

const VISIBLE_PREVIEWS = 3;
const NO_BLOBS: Blob[] = [];

const blobsToImages = async (blobs: Blob[]) => {
  const urls = blobs.map((blob) => URL.createObjectURL(blob));
  try {
    return await Promise.all(
      urls.map(async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        return image;
      }),
    );
  } finally {
    for (const url of urls) URL.revokeObjectURL(url);
  }
};

const SignaturePreview = ({ seed, className }: { seed: number; className: string }) => (
  <svg viewBox="0 0 48 24" aria-hidden className={className}>
    <path
      d={`M4 ${16 + (seed % 3)} C 10 ${4 + (seed % 5)}, 14 ${20 - (seed % 4)}, 20 14 S 30 ${
        5 + (seed % 6)
      }, 34 15 S 40 ${19 - (seed % 3)}, 44 9`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const AssetColumn = ({
  type,
  title,
  hint,
  blobs,
  isPrimary,
  disabled,
  onFilesSelected,
  onClear,
}: {
  type: SignaturePackImageType;
  title: string;
  hint: string;
  blobs: Blob[];
  isPrimary: boolean;
  disabled: boolean;
  onFilesSelected: (type: SignaturePackImageType, files: File[]) => Promise<void>;
  onClear: (type: SignaturePackImageType) => Promise<void>;
}) => {
  const count = blobs.length;
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = blobs.slice(0, VISIBLE_PREVIEWS).map((blob) => URL.createObjectURL(blob));
    setPreviewUrls(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [blobs]);

  return (
    <div className="flex min-w-0 flex-1 flex-col px-7 pb-6 pt-6">
      <div className="flex h-7 items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <span className="flex-1" />
        {count ? (
          <span className="flex h-6 shrink-0 items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs font-medium tabular-nums text-slate-500">
            {count} {count === 1 ? 'file' : 'files'}
            <button
              type="button"
              disabled={disabled}
              title={`Remove all ${title.toLowerCase()}`}
              onClick={() => onClear(type)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Remove all {title.toLowerCase()}</span>
            </button>
          </span>
        ) : (
          <span className="shrink-0 text-xs text-slate-400">{hint}</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-4">
        {count ? (
          <>
            {previewUrls.map((url, index) => (
              <span
                key={url}
                className="flex h-12 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 px-2 ring-1 ring-slate-200/70"
              >
                <img src={url} alt={`${title} ${index + 1}`} className="max-h-9 max-w-full object-contain" />
              </span>
            ))}
            {count > VISIBLE_PREVIEWS && (
              <span className="text-xs font-medium tabular-nums text-slate-400">+{count - VISIBLE_PREVIEWS} more</span>
            )}
          </>
        ) : (
          <>
            <SignaturePreview seed={3} className="h-10 w-[4.5rem] shrink-0 text-slate-200" />
            <SignaturePreview seed={4} className="h-10 w-[4.5rem] shrink-0 text-slate-200" />
            <span className="text-xs text-slate-300">Transparent .png files</span>
          </>
        )}
      </div>

      <label
        htmlFor={`${type}-input`}
        className={`flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
          disabled
            ? 'pointer-events-none bg-slate-100 text-slate-400'
            : isPrimary
            ? 'bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800'
            : 'bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200'
        }`}
      >
        {count ? 'Replace' : 'Choose files'}
        <input
          id={`${type}-input`}
          type="file"
          accept=".png,image/png"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={async (event) => {
            if (!event.target.files?.length) return;
            const input = event.currentTarget;
            await onFilesSelected(type, [...event.target.files]);
            input.value = '';
          }}
        />
      </label>
    </div>
  );
};

const StarterModal = ({
  canProceed,
  hasPlacements,
  isModalOpen,
  openModal,
  closeModal,
  onAssetsChanged,
  onActivePackName,
  setSignatures,
  setInitials,
}: {
  canProceed: boolean;
  hasPlacements: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  onAssetsChanged: () => void;
  onActivePackName: (name: string) => void;
  setSignatures: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>;
  setInitials: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>;
}) => {
  const [packs, setPacks] = useState<SignaturePack[]>([]);
  const [activePackId, setActivePackId] = useState('');
  const [packName, setPackName] = useState('');
  const [isBusy, setIsBusy] = useState(true);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const activePackIdRef = useRef('');
  const assetChangeGenerationRef = useRef(0);
  const packNameInputRef = useRef<HTMLInputElement>(null);

  const showStorageError = (error: unknown) => {
    setStorageError(error instanceof Error ? error.message : 'Could not update saved signature packs');
  };

  const decodePack = useCallback(async (pack: SignaturePack) => {
    const generation = ++assetChangeGenerationRef.current;
    const [signatures, initials] = await Promise.all([blobsToImages(pack.signatures), blobsToImages(pack.initials)]);
    if (generation !== assetChangeGenerationRef.current) return null;
    return {
      signatures: shuffle(signatures),
      initials: shuffle(initials),
    };
  }, []);

  useEffect(() => {
    let isDisposed = false;
    (async () => {
      const database = await getIndexedDbDatabase();
      const storedPacks = await readSignaturePacks(database);
      const storedActivePackId = await readActiveSignaturePackId(database);
      const activePack = storedPacks.find((pack) => pack.id === storedActivePackId) ?? storedPacks[0];
      if (!activePack) throw new Error('No saved signature pack found');

      if (activePack.id !== storedActivePackId) {
        await writeActiveSignaturePackId(database, activePack.id);
      }
      if (isDisposed) return;
      setPacks(storedPacks);
      activePackIdRef.current = activePack.id;
      setActivePackId(activePack.id);
      setPackName(activePack.name);
      onActivePackName(activePack.name);
      if (!activePack.signatures.length) openModal();

      const decoded = await decodePack(activePack);
      if (isDisposed || !decoded) return;

      setSignatures(decoded.signatures);
      setInitials(decoded.initials);
      setIsBusy(false);
    })().catch((error: unknown) => {
      if (isDisposed) return;
      showStorageError(error);
      openModal();
      setIsBusy(false);
    });

    return () => {
      isDisposed = true;
      assetChangeGenerationRef.current += 1;
    };
  }, [decodePack, onActivePackName, openModal, setInitials, setSignatures]);

  const activePack = packs.find((pack) => pack.id === activePackId) ?? null;

  const confirmAssetChange = () =>
    !hasPlacements ||
    // eslint-disable-next-line no-alert
    window.confirm(
      'Changing the active signatures or initials will remove everything already placed on this PDF. Continue?',
    );

  const handlePackChange = async (nextPackId: string) => {
    if (nextPackId === activePackId || isBusy) return;
    const nextPack = packs.find((pack) => pack.id === nextPackId);
    if (!nextPack || !confirmAssetChange()) return;

    setIsBusy(true);
    setStorageError(null);
    try {
      const decoded = await decodePack(nextPack);
      if (!decoded) return;
      const database = await getIndexedDbDatabase();
      await writeActiveSignaturePackId(database, nextPack.id);
      onAssetsChanged();
      setSignatures(decoded.signatures);
      setInitials(decoded.initials);
      activePackIdRef.current = nextPack.id;
      setActivePackId(nextPack.id);
      setPackName(nextPack.name);
      onActivePackName(nextPack.name);
      setConfirmingDelete(false);
    } catch (error: unknown) {
      showStorageError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePackNameBlur = async () => {
    if (!activePack || isBusy) return;
    const trimmedName = packName.trim();
    if (!trimmedName) {
      setPackName(activePack.name);
      return;
    }
    if (trimmedName === activePack.name) return;

    setIsBusy(true);
    setStorageError(null);
    const updatedPack = { ...activePack, name: trimmedName };
    try {
      const database = await getIndexedDbDatabase();
      await writeSignaturePackName(database, updatedPack.id, updatedPack.name);
      setPacks((currentPacks) => currentPacks.map((pack) => (pack.id === updatedPack.id ? updatedPack : pack)));
      if (activePackIdRef.current === updatedPack.id) {
        setPackName(trimmedName);
        onActivePackName(trimmedName);
      }
    } catch (error: unknown) {
      showStorageError(error);
      if (activePackIdRef.current === updatedPack.id) setPackName(activePack.name);
    } finally {
      setIsBusy(false);
    }
  };

  const handleNewPack = async () => {
    if (isBusy || !confirmAssetChange()) return;
    const usedNames = new Set(packs.map((pack) => pack.name));
    let name = 'New pack';
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `New pack ${suffix}`;
      suffix += 1;
    }
    const pack: SignaturePack = {
      id: crypto.randomUUID(),
      name,
      signatures: [],
      initials: [],
    };

    setIsBusy(true);
    setStorageError(null);
    try {
      const database = await getIndexedDbDatabase();
      await createSignaturePackAndSelect(database, pack);
      onAssetsChanged();
      setSignatures([]);
      setInitials([]);
      setPacks((currentPacks) => [...currentPacks, pack]);
      activePackIdRef.current = pack.id;
      setActivePackId(pack.id);
      setPackName(pack.name);
      onActivePackName(pack.name);
      setConfirmingDelete(false);
      requestAnimationFrame(() => packNameInputRef.current?.select());
    } catch (error: unknown) {
      showStorageError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeletePack = async () => {
    if (!activePack || packs.length === 1 || isBusy) return;
    const nextPack = packs.find((pack) => pack.id !== activePack.id);
    if (!nextPack) return;

    setIsBusy(true);
    setStorageError(null);
    try {
      const decoded = await decodePack(nextPack);
      if (!decoded) return;
      const database = await getIndexedDbDatabase();
      await deleteSignaturePackAndSelect(database, activePack.id, nextPack.id);
      onAssetsChanged();
      setSignatures(decoded.signatures);
      setInitials(decoded.initials);
      setPacks((currentPacks) => currentPacks.filter((pack) => pack.id !== activePack.id));
      activePackIdRef.current = nextPack.id;
      setActivePackId(nextPack.id);
      setPackName(nextPack.name);
      onActivePackName(nextPack.name);
      setConfirmingDelete(false);
    } catch (error: unknown) {
      showStorageError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFilesSelected = async (type: SignaturePackImageType, files: File[]) => {
    if (!activePack || isBusy || !confirmAssetChange()) return;
    setIsBusy(true);
    setStorageError(null);
    const generation = ++assetChangeGenerationRef.current;

    try {
      const images = shuffle(await blobsToImages(files));
      if (generation !== assetChangeGenerationRef.current) return;

      const updatedPack = { ...activePack, [type]: files };
      const database = await getIndexedDbDatabase();
      await writeSignaturePack(database, updatedPack);
      if (generation !== assetChangeGenerationRef.current) return;
      setPacks((currentPacks) => currentPacks.map((pack) => (pack.id === updatedPack.id ? updatedPack : pack)));

      onAssetsChanged();
      if (type === 'signatures') {
        setSignatures(images);
      } else {
        setInitials(images);
      }
    } catch (error: unknown) {
      showStorageError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearFiles = async (type: SignaturePackImageType) => {
    if (!activePack || !activePack[type].length || isBusy || !confirmAssetChange()) return;
    setIsBusy(true);
    setStorageError(null);

    const updatedPack = { ...activePack, [type]: [] };
    try {
      const database = await getIndexedDbDatabase();
      await writeSignaturePack(database, updatedPack);
      setPacks((currentPacks) => currentPacks.map((pack) => (pack.id === updatedPack.id ? updatedPack : pack)));
      onAssetsChanged();
      if (type === 'signatures') {
        setSignatures([]);
      } else {
        setInitials([]);
      }
    } catch (error: unknown) {
      showStorageError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const canClose = canProceed && !isBusy;
  const deletePrompt = activePack
    ? hasPlacements
      ? `Delete “${activePack.name}”? Placed signatures and initials will also be removed.`
      : `Delete “${activePack.name}” and its files?`
    : 'Delete this pack?';

  return (
    <Modal
      isOpen={isModalOpen}
      shouldCloseOnOverlayClick={canClose}
      shouldCloseOnEsc={canClose}
      onRequestClose={closeModal}
      contentLabel="Welcome Modal"
      overlayClassName="fixed inset-0 bg-slate-800 bg-opacity-75 transition-opacity duration-500 opacity-0"
      className="absolute left-1/2 top-1/2 isolate flex max-h-[95vh] min-h-[28rem] w-[90vw] -translate-x-1/2 -translate-y-1/2 transform overflow-auto rounded-2xl bg-transparent shadow-2xl outline-none lg:w-[54rem]"
      closeTimeoutMS={500}
    >
      <aside className="flex w-56 shrink-0 flex-col bg-violet-700 lg:w-64">
        <div className="px-6 pb-6 pt-7">
          <h1 className="text-lg font-bold tracking-tight text-white">Signatur 🖋️</h1>
          <p className="mt-2 text-[13px] leading-5 text-violet-200">
            “Sign” PDFs. Everything runs in your browser, so your data is never sent to any servers.
          </p>
        </div>

        <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">Your packs</p>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {packs.map((pack) => {
            const isActive = pack.id === activePackId;
            const isEmpty = !pack.signatures.length && !pack.initials.length;
            return (
              <li key={pack.id} ref={isActive ? (node) => node?.scrollIntoView({ block: 'nearest' }) : null}>
                {isActive ? (
                  <div className="flex h-11 w-full items-center gap-1 bg-violet-800 py-1 pl-6 pr-3">
                    <label htmlFor="active-pack-name" className="sr-only">
                      Pack name
                    </label>
                    <input
                      ref={packNameInputRef}
                      id="active-pack-name"
                      type="text"
                      value={packName}
                      title="Rename pack"
                      disabled={isBusy}
                      onChange={(event) => setPackName(event.target.value)}
                      onBlur={handlePackNameBlur}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                      }}
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-violet-300 disabled:opacity-60"
                    />
                    {isEmpty && <span className="shrink-0 text-[11px] font-normal text-violet-300">empty</span>}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handlePackChange(pack.id)}
                    className="flex h-11 w-full items-center gap-2 px-6 text-left text-sm text-violet-100 hover:bg-violet-600/60 disabled:pointer-events-none disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1 truncate">{pack.name}</span>
                    {isEmpty && <span className="shrink-0 text-[11px] font-normal text-violet-300">empty</span>}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          disabled={isBusy}
          onClick={handleNewPack}
          className="mt-2 flex h-11 shrink-0 items-center gap-2 px-6 text-sm font-semibold text-violet-100 hover:bg-violet-600/60 hover:text-white disabled:pointer-events-none disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" aria-hidden />
          New pack
        </button>
        <p className="border-t border-violet-600 px-6 py-4 text-[11px] text-violet-300">
          Made by{' '}
          <a href="https://aprets.me" className="underline hover:text-white">
            aprets
          </a>{' '}
          ·{' '}
          <a href="https://github.com/aprets/signatur" className="underline hover:text-white">
            GitHub
          </a>
        </p>
      </aside>

      <div className="flex min-w-[32rem] flex-1 flex-col bg-white">
        <div className="flex min-h-0 flex-1 divide-x divide-slate-100">
          <AssetColumn
            type="signatures"
            title="Signatures"
            hint="none yet"
            blobs={activePack?.signatures ?? NO_BLOBS}
            isPrimary={!canProceed}
            disabled={isBusy || !activePack}
            onFilesSelected={handleFilesSelected}
            onClear={handleClearFiles}
          />
          <AssetColumn
            type="initials"
            title="Initials"
            hint="optional"
            blobs={activePack?.initials ?? NO_BLOBS}
            isPrimary={false}
            disabled={isBusy || !activePack}
            onFilesSelected={handleFilesSelected}
            onClear={handleClearFiles}
          />
        </div>

        <div className="flex h-[4.5rem] shrink-0 items-center gap-3 border-t border-slate-100 px-7">
          {isConfirmingDelete ? (
            <>
              <p className="min-w-0 truncate text-sm text-slate-700" title={deletePrompt}>
                {deletePrompt}
              </p>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setConfirmingDelete(false)}
                className="h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleDeletePack}
                className="h-9 shrink-0 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isBusy || packs.length === 1}
              title={packs.length === 1 ? 'The last pack cannot be deleted' : undefined}
              onClick={() => setConfirmingDelete(true)}
              className="h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-200"
            >
              Delete pack
            </button>
          )}
          {storageError && (
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-red-700" title={storageError}>
              {storageError}
            </p>
          )}
          <button
            type="button"
            disabled={!canClose}
            title={canProceed ? undefined : 'Add at least one signature to this pack first'}
            className="ml-auto h-11 shrink-0 rounded-lg bg-violet-600 px-6 font-semibold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-400"
            onClick={closeModal}
          >
            Let&apos;s go 🚀
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StarterModal;
