import { useCallback, useEffect, useRef, useState } from 'react';
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

const ImageSelectionSection = ({
  title,
  description,
  name,
  savedImageCount,
  onFilesSelected,
  disabled,
  className,
  highlightInput,
}: {
  title: string;
  description: React.ReactNode;
  name: SignaturePackImageType;
  savedImageCount: number;
  onFilesSelected: (type: SignaturePackImageType, files: File[], remember: boolean) => Promise<void>;
  disabled: boolean;
  className?: string;
  highlightInput?: boolean;
}) => {
  const [isSaveTicked, setSaveTicked] = useState(true);

  return (
    <div className={className}>
      <label htmlFor={`${name}-input`}>
        <h2 className="mb-1 text-lg font-semibold text-slate-800">{title}</h2>
        <p className="mb-2 text-slate-800">{description}</p>
      </label>
      <div className="relative mb-3 flex items-start">
        <div className="flex h-5 items-center">
          <input
            id={`${name}-save-checkbox`}
            type="checkbox"
            checked={isSaveTicked}
            disabled={disabled}
            onChange={() => setSaveTicked((isTicked) => !isTicked)}
            className="h-4 w-4 rounded border-gray-300 accent-violet-500"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor={`${name}-save-checkbox`} className="font-medium text-slate-700">
            Also save them to my disk & remember for next time
          </label>
        </div>
      </div>
      <input
        id={`${name}-input`}
        className={`box-border w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:disabled:bg-gray-300 file:disabled:text-gray-500 ${
          highlightInput
            ? 'file:bg-violet-500 file:text-white hover:file:bg-violet-700 file:active:bg-violet-800'
            : 'file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 file:active:bg-violet-200'
        }`}
        type="file"
        accept=".png"
        multiple
        disabled={disabled}
        onChange={async (event) => {
          if (!event.target.files?.length) return;
          const input = event.currentTarget;
          await onFilesSelected(name, [...event.target.files], isSaveTicked);
          input.value = '';
        }}
      />
      {savedImageCount > 0 && (
        <p className="mt-2 text-sm text-slate-500">
          {savedImageCount} {savedImageCount === 1 ? name.slice(0, -1) : name} saved in this pack
        </p>
      )}
    </div>
  );
};

const StarterModal = ({
  canProceed,
  hasPlacements,
  isModalOpen,
  closeModal,
  onAssetsChanged,
  setSignatures,
  setInitials,
}: {
  canProceed: boolean;
  hasPlacements: boolean;
  isModalOpen: boolean;
  closeModal: () => void;
  onAssetsChanged: () => void;
  setSignatures: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>;
  setInitials: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>;
}) => {
  const [packs, setPacks] = useState<SignaturePack[]>([]);
  const [activePackId, setActivePackId] = useState('');
  const [packName, setPackName] = useState('');
  const [isBusy, setIsBusy] = useState(true);
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

      const decoded = await decodePack(activePack);
      if (isDisposed || !decoded) return;

      setSignatures(decoded.signatures);
      setInitials(decoded.initials);
      setIsBusy(false);
    })().catch((error: unknown) => {
      if (isDisposed) return;
      showStorageError(error);
      setIsBusy(false);
    });

    return () => {
      isDisposed = true;
      assetChangeGenerationRef.current += 1;
    };
  }, [decodePack, setInitials, setSignatures]);

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
      if (activePackIdRef.current === updatedPack.id) setPackName(trimmedName);
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
    const warning = hasPlacements
      ? `Delete “${activePack.name}”? This will also remove the signatures and initials already placed on this PDF.`
      : `Delete “${activePack.name}”?`;
    // eslint-disable-next-line no-alert
    if (!window.confirm(warning)) return;

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
    } catch (error: unknown) {
      showStorageError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFilesSelected = async (type: SignaturePackImageType, files: File[], remember: boolean) => {
    if (!activePack || isBusy || !confirmAssetChange()) return;
    setIsBusy(true);
    setStorageError(null);
    const generation = ++assetChangeGenerationRef.current;

    try {
      const images = shuffle(await blobsToImages(files));
      if (generation !== assetChangeGenerationRef.current) return;

      if (remember) {
        const updatedPack = { ...activePack, [type]: files };
        const database = await getIndexedDbDatabase();
        await writeSignaturePack(database, updatedPack);
        if (generation !== assetChangeGenerationRef.current) return;
        setPacks((currentPacks) => currentPacks.map((pack) => (pack.id === updatedPack.id ? updatedPack : pack)));
      }

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

  const canClose = canProceed && !isBusy;

  return (
    <Modal
      isOpen={isModalOpen}
      shouldCloseOnOverlayClick={canClose}
      shouldCloseOnEsc={canClose}
      onRequestClose={closeModal}
      contentLabel="Welcome Modal"
      overlayClassName="fixed inset-0 bg-slate-800 bg-opacity-75 transition-opacity duration-500 opacity-0"
      className="absolute left-1/2 top-1/2 max-h-[95vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 transform overflow-auto rounded-lg bg-white p-8 shadow-lg outline-none lg:w-[44rem]"
      closeTimeoutMS={500}
    >
      <h1 className="mb-4 text-4xl font-bold text-slate-800">Welcome! 🖋️</h1>
      <p className="text-slate-800">
        This is a simple app that allows you to &quot;sign&quot; PDFs.
        <br />
        <span title="Feel free to open the network tab and check 😉">
          Everything runs in your browser, so your data is never sent to any servers ✨.
        </span>
        <br />
        To get started, select your signatures and initials below.
      </p>
      <p className="mb-1 text-slate-600">
        -{' '}
        <a href="https://aprets.me" className="underline">
          aprets
        </a>
      </p>
      <p className="mb-4 text-xs text-slate-600">
        (You can also check out the source code on{' '}
        <a href="https://github.com/aprets/signatur" className="underline">
          GitHub
        </a>
        )
      </p>

      <section className="mb-6 rounded-lg border border-violet-200 bg-violet-50 p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Signature pack</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label htmlFor="signature-pack" className="text-sm font-medium text-slate-700">
            Current pack
            <select
              id="signature-pack"
              value={activePackId}
              disabled={isBusy || !activePack}
              onChange={(event) => handlePackChange(event.target.value)}
              className="mt-1 block w-40 rounded-md border border-gray-300 bg-white px-2 py-2 text-base font-normal text-slate-900 disabled:bg-gray-100"
            >
              {packs.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.id === activePackId ? packName : pack.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="signature-pack-name" className="text-sm font-medium text-slate-700">
            Pack name
            <input
              ref={packNameInputRef}
              id="signature-pack-name"
              type="text"
              value={packName}
              disabled={isBusy || !activePack}
              onChange={(event) => setPackName(event.target.value)}
              onBlur={handlePackNameBlur}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              className="mt-1 block w-40 rounded-md border border-gray-300 px-2 py-2 text-base font-normal text-slate-900 disabled:bg-gray-100"
            />
          </label>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleNewPack}
            className="rounded bg-violet-500 px-3 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
          >
            New pack
          </button>
          <button
            type="button"
            disabled={isBusy || packs.length === 1}
            onClick={handleDeletePack}
            className="rounded bg-white px-3 py-2 font-bold text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50 active:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:ring-gray-200"
          >
            Delete
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">Use a separate pack for each person whose documents you sign.</p>
        {storageError && <p className="mt-2 text-sm font-medium text-red-700">{storageError}</p>}
      </section>

      <ImageSelectionSection
        className="mb-8"
        title="Signatures"
        description={
          <>
            Please assemble a folder with (ideally multiple) transparent .png signatures.
            <br />
            Select all the available signatures below.
          </>
        }
        name="signatures"
        savedImageCount={activePack?.signatures.length ?? 0}
        onFilesSelected={handleFilesSelected}
        disabled={isBusy || !activePack}
        highlightInput={!canProceed}
      />
      <ImageSelectionSection
        className="mb-4"
        title="Initials"
        description={
          <>
            You can also do the same with initials.
            <br />
            If you want to use initials, please select all available initials below.
          </>
        }
        name="initials"
        savedImageCount={activePack?.initials.length ?? 0}
        onFilesSelected={handleFilesSelected}
        disabled={isBusy || !activePack}
      />
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          disabled={!canClose}
          className="w-36 rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
          onClick={closeModal}
        >
          Let&apos;s Go 🚀
        </button>
      </div>
    </Modal>
  );
};

export default StarterModal;
