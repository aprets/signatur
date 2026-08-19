/**
 * Temporary scaffolding for choosing a signature pack UI. Delete this folder (and the
 * `?pack-designs` branch in main.tsx) once a direction has been picked.
 *
 * Everything here is local, in-memory demo state: no IndexedDB, no image decoding.
 */
import { useCallback, useState } from 'react';

export interface DemoPack {
  id: string;
  name: string;
  signatures: number;
  initials: number;
}

export type DemoAssetType = 'signatures' | 'initials';

const INITIAL_PACKS: DemoPack[] = [
  { id: 'personal', name: 'Personal', signatures: 27, initials: 4 },
  { id: 'parents', name: 'Parents', signatures: 9, initials: 12 },
  { id: 'flat-lease', name: 'Flat lease', signatures: 0, initials: 0 },
];

let demoPackCounter = 0;

export const fileWord = (count: number, type: DemoAssetType) => {
  const singular = type === 'signatures' ? 'signature' : 'initial';
  return count === 1 ? singular : `${singular}s`;
};

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
    const pack: DemoPack = { id: `new-${demoPackCounter}`, name: 'New pack', signatures: 0, initials: 0 };
    setPacks((current) => [...current, pack]);
    setActiveId(pack.id);
    return pack;
  }, []);

  const deletePack = useCallback(
    (id: string) => {
      if (packs.length === 1) return;
      const remaining = packs.filter((pack) => pack.id !== id);
      setPacks(remaining);
      if (id === activeId) setActiveId(remaining[0]?.id ?? '');
    },
    [packs, activeId],
  );

  const renameActive = useCallback((name: string) => updateActive((pack) => ({ ...pack, name })), [updateActive]);

  const addFiles = useCallback(
    (type: DemoAssetType, count: number) => updateActive((pack) => ({ ...pack, [type]: pack[type] + count })),
    [updateActive],
  );

  const clearFiles = useCallback(
    (type: DemoAssetType) => updateActive((pack) => ({ ...pack, [type]: 0 })),
    [updateActive],
  );

  const shuffleCounts = useCallback(() => {
    setPacks((current) =>
      current.map((pack) => ({
        ...pack,
        signatures: Math.floor(Math.random() * 40),
        initials: Math.floor(Math.random() * 15),
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
  disabled,
  onFiles,
}: {
  id: string;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
  onFiles: (count: number) => void;
}) => (
  <label htmlFor={id} className={className}>
    {children}
    <input
      id={id}
      type="file"
      accept=".png"
      multiple
      disabled={disabled}
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

/** Mimics the real StarterModal chrome so each option is judged in context. */
export const DemoModalFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-[44rem] rounded-lg bg-white p-8 shadow-lg">
    <h1 className="mb-3 text-3xl font-bold text-slate-800">Welcome! 🖋️</h1>
    <p className="mb-6 text-slate-800">
      This is a simple app that allows you to &quot;sign&quot; PDFs. Everything runs in your browser, so your data is
      never sent to any servers ✨.
      <br />
      To get started, select your signatures and initials below.
    </p>
    {children}
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        title="Preview only"
        className="w-36 rounded bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-700 active:bg-violet-800"
      >
        Let&apos;s Go 🚀
      </button>
    </div>
  </div>
);
