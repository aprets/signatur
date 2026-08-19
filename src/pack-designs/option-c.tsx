/** Temporary design option — see shared.tsx. */
import { useEffect, useRef, useState } from 'react';
import {
  CheckIcon,
  ChevronUpDownIcon,
  EllipsisHorizontalIcon,
  IdentificationIcon,
  PencilIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { PngPicker } from './shared';
import type { DemoAssetType, DemoPacks } from './shared';

type OpenMenu = 'packs' | 'actions' | null;

const AssetLine = ({
  type,
  title,
  hint,
  icon: Icon,
  count,
  onFiles,
  onClear,
}: {
  type: DemoAssetType;
  title: string;
  hint: string;
  icon: typeof PencilIcon;
  count: number;
  onFiles: (count: number) => void;
  onClear: () => void;
}) => (
  <div className="flex h-16 items-center gap-3 px-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600">
      <Icon className="h-5 w-5" aria-hidden />
    </div>
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="truncate text-xs text-slate-500">{hint}</p>
    </div>
    <div className="w-12 shrink-0 text-right">
      <p className={`text-sm font-semibold tabular-nums ${count ? 'text-slate-800' : 'text-slate-300'}`}>{count}</p>
      <p className="text-[11px] text-slate-400">files</p>
    </div>
    <div className="flex w-[8.5rem] shrink-0 justify-end gap-1">
      <PngPicker
        id={`option-c-${type}-input`}
        onFiles={onFiles}
        className="flex h-8 cursor-pointer items-center rounded-md px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 active:bg-violet-100"
      >
        {count ? 'Replace' : 'Add files'}
      </PngPicker>
      <button
        type="button"
        disabled={!count}
        onClick={onClear}
        className="h-8 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-300"
      >
        Remove
      </button>
    </div>
  </div>
);

const OptionC = ({ demo }: { demo: DemoPacks }) => {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { packs, activeId, activePack } = demo;

  const closeMenus = () => {
    setOpenMenu(null);
    setIsConfirmingDelete(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      closeMenus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus();
    };
    if (openMenu) {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const startRenaming = () => {
    closeMenus();
    setIsRenaming(true);
    requestAnimationFrame(() => nameInputRef.current?.select());
  };

  return (
    <section>
      <div ref={containerRef} className="relative z-10">
        <div className="flex h-11 items-stretch rounded-lg border border-slate-300 bg-white shadow-sm">
          {isRenaming ? (
            <>
              <label htmlFor="option-c-name" className="sr-only">
                Pack name
              </label>
              <input
                ref={nameInputRef}
                id="option-c-name"
                type="text"
                value={activePack?.name ?? ''}
                onChange={(event) => demo.renameActive(event.target.value)}
                onBlur={(event) => {
                  if (!event.target.value.trim()) demo.renameActive('Untitled pack');
                  setIsRenaming(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur();
                }}
                className="min-w-0 flex-1 rounded-l-lg bg-violet-50/50 px-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-inset ring-violet-400"
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsRenaming(false)}
                className="shrink-0 rounded-r-lg border-l border-slate-200 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                aria-expanded={openMenu === 'packs'}
                onClick={() => setOpenMenu(openMenu === 'packs' ? null : 'packs')}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-l-lg px-3 text-left hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                  {activePack?.name ?? ''}
                </span>
                <span className="hidden shrink-0 items-center gap-1 sm:flex">
                  <span
                    title={`${activePack?.signatures ?? 0} signatures in this pack`}
                    className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${
                      activePack?.signatures ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {activePack?.signatures ?? 0} sig
                  </span>
                  <span
                    title={`${activePack?.initials ?? 0} initials in this pack`}
                    className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${
                      activePack?.initials ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {activePack?.initials ?? 0} init
                  </span>
                </span>
                <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              </button>
              <button
                type="button"
                title="Rename this pack"
                onClick={startRenaming}
                className="flex w-11 shrink-0 items-center justify-center border-l border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              >
                <PencilSquareIcon className="h-5 w-5" aria-hidden />
                <span className="sr-only">Rename pack</span>
              </button>
              <button
                type="button"
                title="More pack actions"
                aria-expanded={openMenu === 'actions'}
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setOpenMenu(openMenu === 'actions' ? null : 'actions');
                }}
                className="flex w-11 shrink-0 items-center justify-center rounded-r-lg border-l border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              >
                <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden />
                <span className="sr-only">More pack actions</span>
              </button>
            </>
          )}
        </div>

        {openMenu === 'packs' && (
          <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-lg border border-slate-200 bg-white pb-1 shadow-lg">
            <div className="flex h-7 items-center gap-2 border-b border-slate-100 pl-9 pr-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span className="flex-1">Packs</span>
              <span className="w-10 text-right">Sig</span>
              <span className="w-10 text-right">Init</span>
            </div>
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => {
                  demo.selectPack(pack.id);
                  closeMenus();
                }}
                className="flex h-10 w-full items-center gap-2 px-3 text-left hover:bg-slate-50"
              >
                <CheckIcon
                  className={`h-4 w-4 shrink-0 ${pack.id === activeId ? 'text-violet-600' : 'text-transparent'}`}
                  aria-hidden
                />
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    pack.id === activeId ? 'font-semibold text-violet-700' : 'text-slate-700'
                  }`}
                >
                  {pack.name}
                </span>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500">{pack.signatures}</span>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-400">{pack.initials}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                demo.createPack();
                closeMenus();
              }}
              className="mt-1 flex h-10 w-full items-center gap-1.5 border-t border-slate-100 pl-9 pr-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            >
              <PlusIcon className="h-4 w-4" aria-hidden />
              New pack
            </button>
          </div>
        )}

        {openMenu === 'actions' && (
          <div className="absolute right-0 top-12 w-64 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {isConfirmingDelete ? (
              <div className="p-2">
                <p className="text-sm text-slate-700">
                  Delete <span className="font-semibold">{activePack?.name}</span> and its files?
                </p>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="rounded px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activePack) demo.deletePack(activePack.id);
                      closeMenus();
                    }}
                    className="rounded bg-red-600 px-2 py-1 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startRenaming}
                  className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <PencilSquareIcon className="h-4 w-4 text-slate-400" aria-hidden />
                  Rename pack
                </button>
                <button
                  type="button"
                  onClick={() => {
                    demo.createPack();
                    closeMenus();
                  }}
                  className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <PlusIcon className="h-4 w-4 text-slate-400" aria-hidden />
                  New pack
                </button>
                <button
                  type="button"
                  disabled={packs.length === 1}
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:text-slate-300"
                >
                  <TrashIcon className="h-4 w-4" aria-hidden />
                  Delete pack
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
        <AssetLine
          type="signatures"
          title="Signatures"
          hint="Transparent .png files, a few variations look most natural"
          icon={PencilIcon}
          count={activePack?.signatures ?? 0}
          onFiles={(count) => demo.addFiles('signatures', count)}
          onClear={() => demo.clearFiles('signatures')}
        />
        <AssetLine
          type="initials"
          title="Initials"
          hint="Optional, used by the Initial tool"
          icon={IdentificationIcon}
          count={activePack?.initials ?? 0}
          onFiles={(count) => demo.addFiles('initials', count)}
          onClear={() => demo.clearFiles('initials')}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">Files stay on this device and are remembered for next time.</p>
    </section>
  );
};

export default OptionC;
