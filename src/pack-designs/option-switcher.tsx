/** Temporary design option — see shared.tsx. */
import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronUpDownIcon, EllipsisHorizontalIcon, PlusIcon } from '@heroicons/react/24/outline';
import { PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, DemoPacks } from './shared';

/** One shared grid for the popover header and its rows, so the count columns cannot drift apart. */
const MENU_GRID = 'grid grid-cols-[1.25rem_minmax(0,1fr)_2.5rem_2.5rem] items-center gap-x-2 px-3 text-left';

const VISIBLE_TILES = 5;

const AssetLine = ({
  type,
  title,
  hint,
  count,
  onFiles,
  onClear,
}: {
  type: DemoAssetType;
  title: string;
  hint: string;
  count: number;
  onFiles: (count: number) => void;
  onClear: () => void;
}) => (
  <div className="flex h-16 items-center gap-3">
    <div className="w-44 shrink-0">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="truncate text-xs text-slate-500">{hint}</p>
    </div>
    <div className="flex h-9 min-w-0 flex-1 items-center gap-1.5">
      {count ? (
        <>
          {TILE_KEYS.slice(0, Math.min(count, VISIBLE_TILES)).map((key, index) => (
            <div
              key={key}
              className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500"
            >
              <SignatureTile seed={index + count} className="h-5 w-9" />
            </div>
          ))}
          {count > VISIBLE_TILES && (
            <span className="shrink-0 pl-0.5 text-xs font-medium tabular-nums text-slate-400">
              +{count - VISIBLE_TILES}
            </span>
          )}
        </>
      ) : (
        <p className="truncate text-xs text-slate-400">No files yet</p>
      )}
    </div>
    <PngPicker
      id={`switcher-${type}-input`}
      onFiles={onFiles}
      className="flex h-8 shrink-0 cursor-pointer items-center rounded-md bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100 active:bg-violet-200"
    >
      Add files
    </PngPicker>
    <button
      type="button"
      disabled={!count}
      onClick={onClear}
      className="h-8 w-14 shrink-0 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-300"
    >
      Clear
    </button>
  </div>
);

const OptionSwitcher = ({ demo }: { demo: DemoPacks }) => {
  const [openMenu, setOpenMenu] = useState<'packs' | 'actions' | null>(null);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const [isRenaming, setRenaming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { packs, activeId, activePack } = demo;

  useEffect(() => {
    const close = () => {
      setOpenMenu(null);
      setConfirmingDelete(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
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
    setOpenMenu(null);
    setRenaming(true);
    requestAnimationFrame(() => nameInputRef.current?.select());
  };

  return (
    <section>
      <div ref={containerRef} className="relative z-10">
        <div className="flex h-11 items-stretch rounded-lg border border-slate-300 bg-white shadow-sm">
          {isRenaming ? (
            <>
              <label htmlFor="switcher-name" className="sr-only">
                Pack name
              </label>
              <input
                ref={nameInputRef}
                id="switcher-name"
                type="text"
                value={activePack?.name ?? ''}
                onChange={(event) => demo.renameActive(event.target.value)}
                onBlur={(event) => {
                  if (!event.target.value.trim()) demo.renameActive('Untitled pack');
                  setRenaming(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur();
                }}
                className="min-w-0 flex-1 rounded-l-lg bg-violet-50/60 px-3 text-sm font-semibold text-slate-800 outline-none ring-1 ring-inset ring-violet-400"
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setRenaming(false)}
                className="w-24 shrink-0 rounded-r-lg border-l border-slate-200 text-sm font-semibold text-violet-700 hover:bg-violet-50"
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
                className="flex min-w-0 flex-1 items-center gap-3 rounded-l-lg px-3 text-left hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                  {activePack?.name ?? ''}
                </span>
                <span
                  title="Files saved in this pack"
                  className="w-32 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-slate-500"
                >
                  {activePack?.signatures ?? 0} sig · {activePack?.initials ?? 0} init
                </span>
                <ChevronUpDownIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              </button>
              <button
                type="button"
                title="Rename, add or delete packs"
                aria-expanded={openMenu === 'actions'}
                onClick={() => {
                  setConfirmingDelete(false);
                  setOpenMenu(openMenu === 'actions' ? null : 'actions');
                }}
                className="flex w-11 shrink-0 items-center justify-center rounded-r-lg border-l border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              >
                <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden />
                <span className="sr-only">Pack actions</span>
              </button>
            </>
          )}
        </div>

        {openMenu === 'packs' && (
          <div className="absolute inset-x-0 top-12 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div
              className={`${MENU_GRID} h-7 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400`}
            >
              <span />
              <span>Packs</span>
              <span className="text-right">Sig</span>
              <span className="text-right">Init</span>
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {packs.map((pack) => (
                <li key={pack.id}>
                  <button
                    type="button"
                    onClick={() => {
                      demo.selectPack(pack.id);
                      setOpenMenu(null);
                    }}
                    className={`${MENU_GRID} h-10 w-full hover:bg-slate-50`}
                  >
                    <CheckIcon
                      className={`h-4 w-4 ${pack.id === activeId ? 'text-violet-600' : 'text-transparent'}`}
                      aria-hidden
                    />
                    <span
                      className={`truncate text-sm ${
                        pack.id === activeId ? 'font-semibold text-violet-700' : 'text-slate-700'
                      }`}
                    >
                      {pack.name}
                    </span>
                    <span className="text-right text-xs tabular-nums text-slate-600">{pack.signatures}</span>
                    <span className="text-right text-xs tabular-nums text-slate-400">{pack.initials}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                demo.createPack();
                setOpenMenu(null);
              }}
              className={`${MENU_GRID} h-10 w-full border-t border-slate-100 text-sm font-semibold text-violet-700 hover:bg-violet-50`}
            >
              <PlusIcon className="h-4 w-4" aria-hidden />
              <span>New pack</span>
            </button>
          </div>
        )}

        {openMenu === 'actions' && (
          <div className="absolute right-0 top-12 w-72 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {isConfirmingDelete ? (
              <div className="p-2">
                <p className="text-sm text-slate-700">
                  Delete <span className="font-semibold">{activePack?.name}</span> and its files?
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="h-8 rounded px-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activePack) demo.deletePack(activePack.id);
                      setConfirmingDelete(false);
                      setOpenMenu(null);
                    }}
                    className="h-8 rounded bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
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
                  className="flex h-9 w-full items-center rounded px-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Rename this pack
                </button>
                <button
                  type="button"
                  onClick={() => {
                    demo.createPack();
                    setOpenMenu(null);
                  }}
                  className="flex h-9 w-full items-center rounded px-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  New pack
                </button>
                <button
                  type="button"
                  disabled={packs.length === 1}
                  title={packs.length === 1 ? 'The last pack cannot be deleted' : undefined}
                  onClick={() => setConfirmingDelete(true)}
                  className="flex h-9 w-full items-center rounded px-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:text-slate-300"
                >
                  Delete this pack
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-1 divide-y divide-slate-100">
        <AssetLine
          type="signatures"
          title="Signatures"
          hint="Transparent .png files"
          count={activePack?.signatures ?? 0}
          onFiles={(count) => demo.addFiles('signatures', count)}
          onClear={() => demo.clearFiles('signatures')}
        />
        <AssetLine
          type="initials"
          title="Initials"
          hint="Optional, for initialling"
          count={activePack?.initials ?? 0}
          onFiles={(count) => demo.addFiles('initials', count)}
          onClear={() => demo.clearFiles('initials')}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Use a separate pack for each person whose documents you sign. Switching packs swaps the signatures used on the
        document.
      </p>
    </section>
  );
};

export default OptionSwitcher;
