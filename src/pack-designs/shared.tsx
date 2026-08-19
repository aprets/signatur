/**
 * Temporary scaffolding for choosing a signature pack UI. Delete this folder (and the
 * `?pack-designs` branch in main.tsx) once a direction has been picked.
 *
 * Everything here is local, in-memory demo state: no IndexedDB, no image decoding.
 */
import { useCallback, useState } from 'react';
import Modal from 'react-modal';

export interface DemoPack {
  id: string;
  name: string;
  signatures: number;
  initials: number;
}

export type DemoAssetType = 'signatures' | 'initials';

const INITIAL_PACKS: DemoPack[] = [
  { id: 'personal', name: 'Personal', signatures: 7, initials: 4 },
  { id: 'parents', name: 'Parents', signatures: 9, initials: 12 },
  { id: 'flat-lease', name: 'Flat lease', signatures: 0, initials: 0 },
];

let demoPackCounter = 0;

export const useDemoPacks = () => {
  const [packs, setPacks] = useState(INITIAL_PACKS);
  const [activeId, setActiveId] = useState(INITIAL_PACKS[0]?.id ?? '');

  const activePack = packs.find((pack) => pack.id === activeId) ?? null;

  const updateActive = useCallback(
    (update: (pack: DemoPack) => DemoPack) => {
      setPacks((current) => current.map((pack) => (pack.id === activeId ? update(pack) : pack)));
    },
    [activeId],
  );

  const createPack = useCallback(() => {
    demoPackCounter += 1;
    const pack: DemoPack = {
      id: `new-${demoPackCounter}`,
      name: demoPackCounter === 1 ? 'New pack' : `New pack ${demoPackCounter}`,
      signatures: 0,
      initials: 0,
    };
    setPacks((current) => [...current, pack]);
    setActiveId(pack.id);
  }, []);

  const deletePack = useCallback((id: string) => {
    setPacks((current) => {
      if (current.length === 1) return current;
      const remaining = current.filter((pack) => pack.id !== id);
      setActiveId((currentActiveId) => (currentActiveId === id ? remaining[0]?.id ?? '' : currentActiveId));
      return remaining;
    });
  }, []);

  const renameActive = useCallback((name: string) => updateActive((pack) => ({ ...pack, name })), [updateActive]);

  const addFiles = useCallback(
    (type: DemoAssetType, count: number) => updateActive((pack) => ({ ...pack, [type]: pack[type] + count })),
    [updateActive],
  );

  const removeFile = useCallback(
    (type: DemoAssetType) => updateActive((pack) => ({ ...pack, [type]: Math.max(0, pack[type] - 1) })),
    [updateActive],
  );

  const clearFiles = useCallback(
    (type: DemoAssetType) => updateActive((pack) => ({ ...pack, [type]: 0 })),
    [updateActive],
  );

  const shuffleCounts = useCallback(() => {
    // Deliberately reaches three digits: the point is to prove nothing reflows.
    setPacks((current) =>
      current.map((pack) => ({
        ...pack,
        signatures: Math.floor(Math.random() * 160),
        initials: Math.floor(Math.random() * 160),
      })),
    );
  }, []);

  const reset = useCallback(() => {
    setPacks(INITIAL_PACKS);
    setActiveId(INITIAL_PACKS[0]?.id ?? '');
  }, []);

  return {
    packs,
    activeId,
    activePack,
    selectPack: setActiveId,
    createPack,
    deletePack,
    renameActive,
    addFiles,
    removeFile,
    clearFiles,
    shuffleCounts,
    reset,
  };
};

export type DemoPacks = ReturnType<typeof useDemoPacks>;

/** A `<label>` styled however the option needs, wrapping a real (hidden) .png picker. */
export const PngPicker = ({
  id,
  className,
  children,
  title,
  onFiles,
}: {
  id: string;
  className: string;
  children: React.ReactNode;
  title?: string;
  onFiles: (count: number) => void;
}) => (
  <label htmlFor={id} title={title} className={className}>
    {children}
    <input
      id={id}
      type="file"
      accept=".png"
      multiple
      className="sr-only"
      onChange={(event) => {
        const input = event.currentTarget;
        const count = input.files?.length ?? 0;
        input.value = '';
        if (count) onFiles(count);
      }}
    />
  </label>
);

/** Stand-in for a saved signature thumbnail, so file rails have something to show. */
export const SignatureTile = ({ seed, className }: { seed: number; className?: string }) => (
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

/** Stable keys for the fake thumbnails, so rails never key on an array index. */
export const TILE_KEYS = ['tile-1', 'tile-2', 'tile-3', 'tile-4', 'tile-5', 'tile-6', 'tile-7', 'tile-8'];

/**
 * The real StarterModal chrome: same react-modal overlay, same 44rem panel, same welcome copy,
 * so each option is judged as a modal rather than as a page card.
 */
export const DemoModal = ({
  isOpen,
  onRequestClose,
  canProceed,
  children,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  canProceed: boolean;
  children: React.ReactNode;
}) => (
  <Modal
    isOpen={isOpen}
    shouldCloseOnOverlayClick
    onRequestClose={onRequestClose}
    contentLabel="Welcome Modal"
    // The comparison chrome sits above the overlay and has to stay usable, so the app is not aria-hidden here.
    ariaHideApp={false}
    overlayClassName="fixed inset-0 bg-slate-800 bg-opacity-75 transition-opacity duration-500 opacity-0"
    className="absolute left-1/2 top-1/2 max-h-[95vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 transform overflow-auto rounded-lg bg-white p-8 shadow-lg outline-none lg:w-[44rem]"
    closeTimeoutMS={500}
  >
    <h1 className="text-3xl font-bold text-slate-800">Welcome! 🖋️</h1>
    <p className="mt-2 text-slate-800">
      A simple app for &quot;signing&quot; PDFs.{' '}
      <span title="Feel free to open the network tab and check 😉" className="text-slate-600">
        Everything runs in your browser, so your signatures never leave this device ✨
      </span>
    </p>
    <p className="mb-6 mt-1 text-sm text-slate-500">
      Made by{' '}
      <a href="https://aprets.me" className="underline">
        aprets
      </a>{' '}
      ·{' '}
      <a href="https://github.com/aprets/signatur" className="underline">
        source on GitHub
      </a>
    </p>
    {children}
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        disabled={!canProceed}
        title={canProceed ? 'Preview only' : 'Add at least one signature to this pack first'}
        className="w-36 rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-gray-300"
      >
        Let&apos;s Go 🚀
      </button>
    </div>
  </Modal>
);
