/** Temporary design option — see shared.tsx. */
import { useState } from 'react';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, DemoPacks } from './shared';

const VISIBLE_TILES = 4;

const AssetWell = ({
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
  <div className="rounded-lg bg-slate-50 p-3">
    <div className="flex h-5 items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <span className={`whitespace-nowrap text-xs tabular-nums ${count ? 'text-slate-500' : 'text-slate-300'}`}>
        {count} files
      </span>
    </div>
    <p className="mt-0.5 h-4 truncate text-xs text-slate-400">{hint}</p>
    <div className="mt-2 flex h-9 items-center gap-1.5">
      {count ? (
        <>
          {TILE_KEYS.slice(0, Math.min(count, VISIBLE_TILES)).map((key, index) => (
            <div
              key={key}
              className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-500"
            >
              <SignatureTile seed={index + count} className="h-5 w-9" />
            </div>
          ))}
          {count > VISIBLE_TILES && (
            <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">+{count - VISIBLE_TILES}</span>
          )}
        </>
      ) : (
        <p className="flex h-9 flex-1 items-center rounded border border-dashed border-slate-300 px-3 text-xs text-slate-400">
          Nothing saved yet
        </p>
      )}
    </div>
    <div className="mt-2 flex h-8 items-center gap-1">
      <PngPicker
        id={`focus-${type}-input`}
        onFiles={onFiles}
        className="flex h-8 cursor-pointer items-center rounded-md bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100 active:bg-violet-200"
      >
        Add files
      </PngPicker>
      <button
        type="button"
        disabled={!count}
        onClick={onClear}
        className="h-8 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-300"
      >
        Clear
      </button>
    </div>
  </div>
);

const OptionFocus = ({ demo }: { demo: DemoPacks }) => {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const { packs, activeId, activePack } = demo;

  return (
    <section>
      <div className="relative -ml-2 h-10 w-80">
        <label htmlFor="focus-name" className="sr-only">
          Pack name
        </label>
        <input
          id="focus-name"
          type="text"
          value={activePack?.name ?? ''}
          onChange={(event) => demo.renameActive(event.target.value)}
          onBlur={(event) => {
            if (!event.target.value.trim()) demo.renameActive('Untitled pack');
          }}
          className="h-10 w-full rounded-md border border-transparent bg-transparent pl-2 pr-10 text-xl font-semibold text-slate-800 hover:border-slate-200 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200"
        />
        <PencilSquareIcon className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-slate-300" aria-hidden />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <AssetWell
          type="signatures"
          title="Signatures"
          hint="A few variations look most natural"
          count={activePack?.signatures ?? 0}
          onFiles={(count) => demo.addFiles('signatures', count)}
          onClear={() => demo.clearFiles('signatures')}
        />
        <AssetWell
          type="initials"
          title="Initials"
          hint="Optional, for the Initial tool"
          count={activePack?.initials ?? 0}
          onFiles={(count) => demo.addFiles('initials', count)}
          onClear={() => demo.clearFiles('initials')}
        />
      </div>

      <div className="mt-4 border-t border-slate-200 pt-2">
        {isConfirmingDelete ? (
          <div className="flex h-9 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm text-slate-700">Delete “{activePack?.name}” and its files?</p>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="h-8 shrink-0 rounded px-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (activePack) demo.deletePack(activePack.id);
                setConfirmingDelete(false);
              }}
              className="h-8 shrink-0 rounded bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex h-9 items-center gap-1">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              <span className="shrink-0 pr-1 text-xs text-slate-400">Packs</span>
              {packs.map((pack) => {
                const isActive = pack.id === activeId;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => demo.selectPack(pack.id)}
                    className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-sm ${
                      isActive ? 'bg-violet-50 font-semibold text-violet-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pack.name}
                    <span
                      title={`${pack.signatures} signatures · ${pack.initials} initials`}
                      className={`text-xs tabular-nums ${isActive ? 'text-violet-400' : 'text-slate-400'}`}
                    >
                      {pack.signatures}·{pack.initials}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => demo.createPack()}
                className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              >
                <PlusIcon className="h-4 w-4" aria-hidden />
                New
              </button>
            </div>
            <button
              type="button"
              disabled={packs.length === 1}
              title={packs.length === 1 ? 'The last pack cannot be deleted' : 'Delete this pack'}
              onClick={() => setConfirmingDelete(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-200"
            >
              <TrashIcon className="h-4 w-4" aria-hidden />
              <span className="sr-only">Delete this pack</span>
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Each person you sign for gets their own pack. Switching packs swaps the signatures used on the document.
      </p>
    </section>
  );
};

export default OptionFocus;
