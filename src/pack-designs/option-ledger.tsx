/** Temporary design option — see shared.tsx. */
import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, DemoPacks } from './shared';

/** One shared grid for the header and every row, so the count columns cannot drift apart. */
const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_2.25rem_2.25rem] items-center gap-x-1 px-3 text-left';

const VISIBLE_TILES = 4;

const AssetBlock = ({
  type,
  title,
  count,
  onFiles,
  onClear,
}: {
  type: DemoAssetType;
  title: string;
  count: number;
  onFiles: (count: number) => void;
  onClear: () => void;
}) => (
  <div className="flex flex-1 flex-col justify-center gap-2">
    <div className="flex h-6 items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-800">
        {title}
        <span className="ml-1.5 text-xs font-normal tabular-nums text-slate-400">{count} files</span>
      </h3>
      <div className="flex items-center gap-1">
        <PngPicker
          id={`ledger-${type}-input`}
          onFiles={onFiles}
          className="flex h-7 cursor-pointer items-center rounded-md bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 active:bg-violet-200"
        >
          Add files
        </PngPicker>
        <button
          type="button"
          disabled={!count}
          onClick={onClear}
          className="h-7 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-300"
        >
          Clear
        </button>
      </div>
    </div>
    <div className="flex h-9 items-center gap-1.5">
      {count ? (
        <>
          {TILE_KEYS.slice(0, Math.min(count, VISIBLE_TILES)).map((key, index) => (
            <div
              key={key}
              className="flex h-9 w-12 items-center justify-center rounded border border-slate-200 bg-white text-slate-500"
            >
              <SignatureTile seed={index + count} className="h-5 w-9" />
            </div>
          ))}
          {count > VISIBLE_TILES && (
            <span className="flex h-9 w-12 items-center justify-center rounded border border-dashed border-slate-200 text-xs font-medium tabular-nums text-slate-400">
              +{count - VISIBLE_TILES}
            </span>
          )}
        </>
      ) : (
        <p className="flex h-9 flex-1 items-center rounded border border-dashed border-slate-200 px-3 text-xs text-slate-400">
          No transparent .png files in this pack yet
        </p>
      )}
    </div>
  </div>
);

const OptionLedger = ({ demo }: { demo: DemoPacks }) => {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const { packs, activeId, activePack } = demo;

  return (
    <section>
      <div className="flex h-64 overflow-hidden rounded-lg border border-slate-200">
        <div className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className={`${ROW_GRID} h-8 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400`}>
            <span>Packs</span>
            <span className="text-right">Sig</span>
            <span className="text-right">Init</span>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {packs.map((pack) => {
              const isActive = pack.id === activeId;
              return (
                <li
                  key={pack.id}
                  // Keeps a freshly created or newly selected pack visible when the list scrolls.
                  ref={isActive ? (node) => node?.scrollIntoView({ block: 'nearest' }) : null}
                >
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setConfirmingDelete(false);
                      demo.selectPack(pack.id);
                    }}
                    className={`${ROW_GRID} h-11 w-full border-l-2 ${
                      isActive ? 'border-violet-500 bg-white' : 'border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`truncate text-sm ${isActive ? 'font-semibold text-violet-700' : 'text-slate-700'}`}
                    >
                      {pack.name}
                    </span>
                    <span
                      className={`text-right text-xs tabular-nums ${
                        pack.signatures ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      {pack.signatures}
                    </span>
                    <span
                      className={`text-right text-xs tabular-nums ${
                        pack.initials ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      {pack.initials}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(false);
              demo.createPack();
            }}
            className="flex h-11 shrink-0 items-center gap-2 border-t border-slate-200 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-100"
          >
            <PlusIcon className="h-4 w-4" aria-hidden />
            New pack
          </button>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col p-4">
          <div className="flex h-9 shrink-0 items-center gap-2">
            <label htmlFor="ledger-name" className="sr-only">
              Pack name
            </label>
            <input
              id="ledger-name"
              type="text"
              value={activePack?.name ?? ''}
              onChange={(event) => demo.renameActive(event.target.value)}
              onBlur={(event) => {
                if (!event.target.value.trim()) demo.renameActive('Untitled pack');
              }}
              className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-lg font-semibold text-slate-800 hover:border-slate-200 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200"
            />
            <button
              type="button"
              disabled={packs.length === 1}
              title={packs.length === 1 ? 'The last pack cannot be deleted' : 'Delete this pack'}
              onClick={() => setConfirmingDelete(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-200"
            >
              <TrashIcon className="h-5 w-5" aria-hidden />
              <span className="sr-only">Delete pack</span>
            </button>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col divide-y divide-slate-100">
            <AssetBlock
              type="signatures"
              title="Signatures"
              count={activePack?.signatures ?? 0}
              onFiles={(count) => demo.addFiles('signatures', count)}
              onClear={() => demo.clearFiles('signatures')}
            />
            <AssetBlock
              type="initials"
              title="Initials"
              count={activePack?.initials ?? 0}
              onFiles={(count) => demo.addFiles('initials', count)}
              onClear={() => demo.clearFiles('initials')}
            />
          </div>

          {isConfirmingDelete && (
            <div className="absolute inset-x-4 top-4 flex h-9 items-center gap-2 rounded-md bg-red-50 pl-3 pr-1 ring-1 ring-inset ring-red-200">
              <p className="min-w-0 flex-1 truncate text-sm text-red-900">Delete “{activePack?.name}” and its files?</p>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-7 shrink-0 rounded px-2 text-xs font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activePack) demo.deletePack(activePack.id);
                  setConfirmingDelete(false);
                }}
                className="h-7 shrink-0 rounded bg-red-600 px-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Use a separate pack for each person whose documents you sign. Switching packs swaps the signatures used on the
        document.
      </p>
    </section>
  );
};

export default OptionLedger;
