/** Temporary design option — see shared.tsx. */
import { useState } from 'react';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, DemoPack, DemoPacks } from './shared';

/** Four slots for thumbnails plus a permanent leading "add" slot, so the row width never changes. */
const TILE_SLOTS = 4;

const RowPreview = ({ pack }: { pack: DemoPack }) => {
  const total = pack.signatures + pack.initials;
  if (!total) return <span className="text-[11px] text-slate-300">Empty pack</span>;
  return (
    <span className="flex items-center gap-1 text-slate-400">
      {TILE_KEYS.slice(0, Math.min(pack.signatures, 3)).map((key, index) => (
        <SignatureTile key={key} seed={index + pack.signatures} className="h-3 w-6" />
      ))}
      <span className="text-[11px] tabular-nums">
        {pack.signatures} sig · {pack.initials} init
      </span>
    </span>
  );
};

const AssetGrid = ({
  type,
  title,
  hint,
  count,
  onFiles,
  onRemoveOne,
}: {
  type: DemoAssetType;
  title: string;
  hint: string;
  count: number;
  onFiles: (count: number) => void;
  onRemoveOne: () => void;
}) => (
  <div className="flex flex-1 flex-col justify-center gap-2">
    <div className="flex h-5 items-baseline gap-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="min-w-0 flex-1 truncate text-xs text-slate-400">{hint}</p>
    </div>
    <div className="grid h-14 grid-cols-5 gap-2">
      <PngPicker
        id={`roster-${type}-input`}
        onFiles={onFiles}
        title={`Add ${title.toLowerCase()} (.png)`}
        className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-violet-300 bg-violet-50/60 text-violet-700 hover:border-violet-400 hover:bg-violet-100"
      >
        <PlusIcon className="h-4 w-4" aria-hidden />
        <span className="text-[11px] font-semibold">Add</span>
      </PngPicker>
      {count === 0 ? (
        <p className="col-span-4 flex items-center rounded-md bg-slate-50 px-3 text-xs text-slate-400">
          Nothing saved yet — pick transparent .png files, ideally a few variations.
        </p>
      ) : (
        <>
          {TILE_KEYS.slice(0, Math.min(count, count > TILE_SLOTS ? TILE_SLOTS - 1 : TILE_SLOTS)).map((key, index) => (
            <div
              key={key}
              className="group relative flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"
            >
              <SignatureTile seed={index + count} className="h-6 w-11" />
              <button
                type="button"
                title={`Remove one ${title.toLowerCase().slice(0, -1)}`}
                onClick={onRemoveOne}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 opacity-0 shadow ring-1 ring-slate-200 hover:text-red-700 focus:opacity-100 group-hover:opacity-100"
              >
                <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Remove one file</span>
              </button>
            </div>
          ))}
          {count > TILE_SLOTS && (
            <span className="flex items-center justify-center rounded-md bg-slate-50 text-xs font-medium tabular-nums text-slate-500">
              +{count - (TILE_SLOTS - 1)}
            </span>
          )}
        </>
      )}
    </div>
  </div>
);

const OptionRoster = ({ demo }: { demo: DemoPacks }) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { packs, activeId, activePack } = demo;
  const isConfirming = confirmingId !== null;

  return (
    <section>
      <div className="flex h-[17.5rem] overflow-hidden rounded-lg border border-slate-200">
        <div className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <p className="flex h-8 shrink-0 items-center px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Packs
          </p>
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
                      setConfirmingId(null);
                      demo.selectPack(pack.id);
                    }}
                    className={`flex h-14 w-full flex-col justify-center gap-0.5 border-l-2 px-3 text-left ${
                      isActive ? 'border-violet-500 bg-white' : 'border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-full truncate text-sm ${
                        isActive ? 'font-semibold text-violet-700' : 'text-slate-700'
                      }`}
                    >
                      {pack.name}
                    </span>
                    <RowPreview pack={pack} />
                  </button>
                </li>
              );
            })}
          </ul>
          {isConfirming ? (
            <div className="flex h-11 shrink-0 items-center gap-1 border-t border-slate-200 bg-red-50 pl-3 pr-1">
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-red-900">Delete?</p>
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="h-7 shrink-0 rounded px-2 text-xs font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmingId) demo.deletePack(confirmingId);
                  setConfirmingId(null);
                }}
                className="h-7 shrink-0 rounded bg-red-600 px-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => demo.createPack()}
              className="flex h-11 shrink-0 items-center gap-2 border-t border-slate-200 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-100"
            >
              <PlusIcon className="h-4 w-4" aria-hidden />
              New pack
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex h-9 shrink-0 items-center gap-2">
            <label htmlFor="roster-name" className="sr-only">
              Pack name
            </label>
            <input
              id="roster-name"
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
              onClick={() => setConfirmingId(activeId)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-200"
            >
              <TrashIcon className="h-5 w-5" aria-hidden />
              <span className="sr-only">Delete pack</span>
            </button>
          </div>

          <div className="mt-2 flex min-h-0 flex-1 flex-col divide-y divide-slate-100">
            <AssetGrid
              type="signatures"
              title="Signatures"
              hint="a few variations look most natural"
              count={activePack?.signatures ?? 0}
              onFiles={(count) => demo.addFiles('signatures', count)}
              onRemoveOne={() => demo.removeFile('signatures')}
            />
            <AssetGrid
              type="initials"
              title="Initials"
              hint="optional, used by the Initial tool"
              count={activePack?.initials ?? 0}
              onFiles={(count) => demo.addFiles('initials', count)}
              onRemoveOne={() => demo.removeFile('initials')}
            />
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Use a separate pack for each person whose documents you sign. Switching packs swaps the signatures used on the
        document.
      </p>
    </section>
  );
};

export default OptionRoster;
