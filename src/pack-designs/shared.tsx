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
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

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
 * The settled part of the Split direction: the modal's full-bleed violet left edge carrying
 * the welcome copy, the pack list and the credits. Options differ in how much pack management
 * lives here — `manage="list"` keeps the rail a pure switcher, `manage="inline"` gives the
 * active row its rename input and a delete that confirms in place, so the white side never
 * has to host pack-level actions at all.
 */
export const PackRail = ({
  demo,
  manage,
  showDelete = true,
  onChangePack,
}: {
  demo: DemoPacks;
  manage: 'list' | 'inline';
  showDelete?: boolean;
  onChangePack?: () => void;
}) => {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const { packs, activeId, activePack, createPack } = demo;

  const changePack = (action: () => void) => {
    setConfirmingDelete(false);
    action();
    onChangePack?.();
  };

  return (
    <div className="flex w-56 shrink-0 flex-col bg-violet-700 lg:w-64">
      <div className="px-6 pb-6 pt-7">
        <p className="text-lg font-bold tracking-tight text-white">Sign</p>
        <p className="mt-2 text-[13px] leading-5 text-violet-200">
          Sign PDFs. Everything runs in your browser, so your data is never sent to any servers.
        </p>
      </div>

      <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">Your packs</p>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {packs.map((pack) => {
          const isActive = pack.id === activeId;
          const isEmpty = !pack.signatures && !pack.initials;
          if (!isActive) {
            return (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => changePack(() => demo.selectPack(pack.id))}
                  className="flex h-11 w-full items-center gap-2 border-l-[3px] border-transparent px-6 text-left text-sm text-violet-100 hover:bg-violet-600/60"
                >
                  <span className="min-w-0 flex-1 truncate">{pack.name}</span>
                  {isEmpty && <span className="shrink-0 text-[11px] font-normal text-violet-300">empty</span>}
                </button>
              </li>
            );
          }
          return (
            <li
              key={pack.id}
              // Keeps a freshly created or newly selected pack visible when the list scrolls.
              ref={(node) => node?.scrollIntoView({ block: 'nearest' })}
            >
              {manage === 'list' && (
                <p className="flex h-11 w-full items-center gap-2 border-l-[3px] border-white bg-violet-800 px-6 text-sm font-semibold text-white">
                  <span className="min-w-0 flex-1 truncate">{pack.name}</span>
                  {isEmpty && <span className="shrink-0 text-[11px] font-normal text-violet-300">empty</span>}
                </p>
              )}
              {manage === 'inline' && isConfirmingDelete && (
                <div className="flex h-11 w-full items-center gap-2 border-l-[3px] border-white bg-violet-800 py-1 pl-6 pr-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">Delete?</span>
                  <button
                    type="button"
                    title={`Delete ${pack.name} and its files`}
                    onClick={() => changePack(() => demo.deletePack(pack.id))}
                    className="h-full shrink-0 rounded-md bg-red-500/90 px-2.5 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="h-full shrink-0 rounded-md px-2 text-xs font-semibold text-violet-200 hover:bg-violet-700 hover:text-white"
                  >
                    Keep
                  </button>
                </div>
              )}
              {manage === 'inline' && !isConfirmingDelete && (
                <div className="flex h-11 w-full items-center gap-1 border-l-[3px] border-white bg-violet-800 py-1 pl-6 pr-3">
                  <label htmlFor="rail-pack-name" className="sr-only">
                    Pack name
                  </label>
                  <input
                    id="rail-pack-name"
                    type="text"
                    value={pack.name}
                    title="Rename pack"
                    onChange={(event) => demo.renameActive(event.target.value)}
                    onBlur={(event) => {
                      if (!event.target.value.trim()) demo.renameActive('Untitled pack');
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-violet-300"
                  />
                  {isEmpty && <span className="shrink-0 text-[11px] font-normal text-violet-300">empty</span>}
                  {showDelete && (
                    <button
                      type="button"
                      disabled={packs.length === 1}
                      title={packs.length === 1 ? 'The last pack cannot be deleted' : 'Delete pack'}
                      onClick={() => setConfirmingDelete(true)}
                      className="flex h-full w-8 shrink-0 items-center justify-center rounded-md text-violet-300 hover:bg-violet-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden />
                      <span className="sr-only">Delete {activePack?.name}</span>
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => changePack(createPack)}
        className="mt-2 flex h-11 shrink-0 items-center gap-2 px-6 text-sm font-semibold text-violet-100 hover:bg-violet-600/60 hover:text-white"
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
    </div>
  );
};

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
