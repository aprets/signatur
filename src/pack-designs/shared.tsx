/**
 * Temporary scaffolding for choosing a signature pack UI. Delete this folder (and the
 * `?pack-designs` branch in main.tsx) once a direction has been picked.
 *
 * Everything here is local, in-memory demo state: no IndexedDB, no image decoding.
 * There is deliberately no way to manage an individual saved signature — a pack's
 * signatures and initials are each handled as one set.
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

  // Choosing files replaces the whole set, exactly like the real modal: there is no per-file state.
  const setFiles = useCallback(
    (type: DemoAssetType, count: number) => updateActive((pack) => ({ ...pack, [type]: count })),
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
    setFiles,
    clearFiles,
    shuffleCounts,
    reset,
  };
};

export type DemoPacks = ReturnType<typeof useDemoPacks>;

/** Every option gets the same props, so the comparison page can swap them freely. */
export interface OptionProps {
  demo: DemoPacks;
  isOpen: boolean;
  onRequestClose: () => void;
}

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

/** Stand-in for a saved signature, drawn straight onto the surface — no thumbnail frame. */
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

/** Stable keys for the fake previews, so rails never key on an array index. */
export const TILE_KEYS = ['tile-1', 'tile-2', 'tile-3', 'tile-4', 'tile-5', 'tile-6', 'tile-7', 'tile-8'];

/**
 * The real StarterModal overlay, nothing more. Each option owns its own panel: the whole
 * point of this round is that the modal composition itself is part of the design.
 */
export const DemoModal = ({
  isOpen,
  onRequestClose,
  className,
  children,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  className: string;
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
    className={`absolute left-1/2 top-1/2 max-h-[95vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 transform outline-none ${className}`}
    closeTimeoutMS={500}
  >
    {children}
  </Modal>
);
