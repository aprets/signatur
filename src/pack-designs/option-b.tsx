/** Temporary design option — see shared.tsx. */
import { useState } from 'react';
import { PencilSquareIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PngPicker, SignatureTile } from './shared';
import type { DemoAssetType, DemoPacks } from './shared';

const TILE_KEYS = ['tile-1', 'tile-2', 'tile-3', 'tile-4', 'tile-5'];

const AssetRow = ({
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
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex h-6 items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <span className="text-xs tabular-nums text-slate-500">{count ? `${count} saved` : 'None saved'}</span>
    </div>
    <div className="mt-2 flex h-11 items-center gap-1.5">
      {count ? (
        <>
          {TILE_KEYS.slice(0, count).map((key, index) => (
            <div
              key={key}
              className="flex h-11 w-14 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500"
            >
              <SignatureTile seed={index + count} className="h-6 w-11" />
            </div>
          ))}
          {count > TILE_KEYS.length && (
            <div className="flex h-11 w-14 items-center justify-center rounded border border-dashed border-slate-200 text-xs font-medium tabular-nums text-slate-500">
              +{count - TILE_KEYS.length}
            </div>
          )}
        </>
      ) : (
        <p className="flex h-11 w-full items-center truncate rounded-md border border-dashed border-slate-200 px-3 text-xs text-slate-400">
          Nothing here yet — add transparent .png files
        </p>
      )}
    </div>
    <div className="mt-2 flex h-8 items-center gap-2">
      <PngPicker
        id={`option-b-${type}-input`}
        onFiles={onFiles}
        className="flex h-8 cursor-pointer items-center rounded-md bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100 active:bg-violet-200"
      >
        {count ? 'Replace files' : 'Add files'}
      </PngPicker>
      <button
        type="button"
        disabled={!count}
        onClick={onClear}
        className="h-8 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-300"
      >
        Remove all
      </button>
    </div>
  </div>
);

const OptionB = ({ demo }: { demo: DemoPacks }) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isRemembered, setIsRemembered] = useState(true);
  const { packs, activeId, activePack } = demo;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-[13.5rem_minmax(0,1fr)]">
        <div className="flex flex-col border-b border-slate-200 bg-slate-50 sm:border-b-0 sm:border-r">
          <div className="flex h-8 items-center gap-2 pl-4 pr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span className="flex-1">Packs</span>
            <span className="w-7 text-right">Sig</span>
            <span className="w-7 text-right">Init</span>
            <span className="w-7" />
          </div>
          <ul className="max-h-[13.75rem] min-h-[8.25rem] overflow-y-auto">
            {packs.map((pack) => {
              const isActive = pack.id === activeId;
              return (
                <li
                  key={pack.id}
                  className={`group flex h-11 items-center border-l-2 ${
                    isActive ? 'border-violet-500 bg-white' : 'border-transparent hover:bg-slate-100'
                  }`}
                >
                  {confirmingId === pack.id ? (
                    <div className="flex h-full min-w-0 flex-1 items-center gap-1 px-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-600">Delete pack?</span>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded px-1.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(null);
                          demo.deletePack(pack.id);
                        }}
                        className="rounded bg-red-600 px-1.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Yes
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => demo.selectPack(pack.id)}
                        className="flex h-full min-w-0 flex-1 items-center gap-2 pl-2 pr-0 text-left"
                      >
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            isActive ? 'font-semibold text-violet-700' : 'text-slate-700'
                          }`}
                        >
                          {pack.name}
                        </span>
                        <span
                          className={`w-7 text-right text-xs tabular-nums ${
                            pack.signatures ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {pack.signatures}
                        </span>
                        <span
                          className={`w-7 text-right text-xs tabular-nums ${
                            pack.initials ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {pack.initials}
                        </span>
                      </button>
                      <div className="flex w-7 justify-center">
                        <button
                          type="button"
                          disabled={packs.length === 1}
                          title={packs.length === 1 ? 'The last pack cannot be deleted' : `Delete ${pack.name}`}
                          onClick={() => setConfirmingId(pack.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-700 focus:opacity-100 disabled:hidden group-hover:opacity-100"
                        >
                          <XMarkIcon className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Delete {pack.name}</span>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setConfirmingId(null);
              demo.createPack();
            }}
            className="flex h-11 items-center gap-2 border-t border-slate-200 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            <PlusIcon className="h-4 w-4" aria-hidden />
            New pack
          </button>
          <p className="mt-auto hidden px-3 pb-2 pt-4 text-[11px] leading-4 text-slate-400 sm:block">
            Packs live on this device only. Sig / Init are the number of files saved in each pack.
          </p>
        </div>

        <div className="bg-slate-50/40 p-4">
          <label htmlFor="option-b-name" className="sr-only">
            Pack name
          </label>
          <div className="relative">
            <input
              id="option-b-name"
              type="text"
              value={activePack?.name ?? ''}
              onChange={(event) => demo.renameActive(event.target.value)}
              onBlur={(event) => {
                if (!event.target.value.trim()) demo.renameActive('Untitled pack');
              }}
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-3 pr-9 text-base font-semibold text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
            />
            <PencilSquareIcon
              className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-slate-300"
              aria-hidden
            />
          </div>
          <p className="mt-2 h-8 text-xs leading-4 text-slate-500">
            Each person you sign for gets their own pack. Switching packs swaps the signatures used on the document.
          </p>
          <div className="mt-1 grid gap-3">
            <AssetRow
              type="signatures"
              title="Signatures"
              count={activePack?.signatures ?? 0}
              onFiles={(count) => demo.addFiles('signatures', count)}
              onClear={() => demo.clearFiles('signatures')}
            />
            <AssetRow
              type="initials"
              title="Initials"
              count={activePack?.initials ?? 0}
              onFiles={(count) => demo.addFiles('initials', count)}
              onClear={() => demo.clearFiles('initials')}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="option-b-remember"
              type="checkbox"
              checked={isRemembered}
              onChange={() => setIsRemembered((current) => !current)}
              className="h-4 w-4 rounded border-slate-300 accent-violet-500"
            />
            <label htmlFor="option-b-remember" className="text-xs text-slate-600">
              Keep these files on this device and remember them next time
            </label>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OptionB;
