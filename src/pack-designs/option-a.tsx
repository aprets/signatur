/** Temporary design option — see shared.tsx. */
import { useState } from 'react';
import { ArrowUpTrayIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PngPicker, fileWord } from './shared';
import type { DemoAssetType, DemoPacks } from './shared';

const AssetCard = ({
  option,
  type,
  title,
  hint,
  count,
  onFiles,
  onClear,
}: {
  option: string;
  type: DemoAssetType;
  title: string;
  hint: string;
  count: number;
  onFiles: (count: number) => void;
  onClear: () => void;
}) => {
  const [isRemembered, setIsRemembered] = useState(true);
  const inputId = `${option}-${type}-input`;
  const checkboxId = `${option}-${type}-remember`;

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 p-3">
      <div className="flex h-6 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span
          className={`min-w-[4.75rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${
            count ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'
          }`}
        >
          {count ? `${count} file${count === 1 ? '' : 's'}` : 'None yet'}
        </span>
      </div>
      <p className="mt-1 h-8 text-xs leading-4 text-slate-500">{hint}</p>
      <PngPicker
        id={inputId}
        onFiles={onFiles}
        className="mt-2 flex h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-violet-300 bg-violet-50/50 text-sm font-semibold text-violet-700 hover:border-violet-400 hover:bg-violet-50"
      >
        <ArrowUpTrayIcon className="h-5 w-5" aria-hidden />
        {count ? 'Replace .png files' : 'Choose .png files'}
      </PngPicker>
      <div className="mt-2 flex h-7 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            id={checkboxId}
            type="checkbox"
            checked={isRemembered}
            onChange={() => setIsRemembered((current) => !current)}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-violet-500"
          />
          <label htmlFor={checkboxId} className="text-xs text-slate-600">
            Keep on this device
          </label>
        </div>
        <button
          type="button"
          disabled={!count}
          onClick={onClear}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-300"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

const OptionA = ({ demo }: { demo: DemoPacks }) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const { packs, activeId, activePack } = demo;

  const selectPack = (id: string) => {
    setIsConfirmingDelete(false);
    demo.selectPack(id);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-1.5">
        {packs.map((pack) => {
          const isActive = pack.id === activeId;
          return (
            <button
              key={pack.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectPack(pack.id)}
              title={`${pack.signatures} ${fileWord(pack.signatures, 'signatures')} · ${pack.initials} ${fileWord(
                pack.initials,
                'initials',
              )}`}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-lg pl-3 pr-2 text-sm transition-colors ${
                isActive
                  ? 'bg-white font-semibold text-violet-700 shadow-sm ring-1 ring-slate-900/5'
                  : 'font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <span className="max-w-[9rem] truncate">{pack.name}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                  isActive ? 'bg-violet-50 text-violet-600' : 'bg-slate-200/70 text-slate-500'
                }`}
              >
                {pack.signatures}
                <span className="px-0.5 opacity-50">·</span>
                {pack.initials}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setIsConfirmingDelete(false);
            demo.createPack();
          }}
          className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-violet-700 hover:bg-violet-100"
        >
          <PlusIcon className="h-4 w-4" aria-hidden />
          New
        </button>
      </div>

      <div className="flex h-14 items-center gap-3 px-3">
        <label htmlFor="option-a-name" className="sr-only">
          Pack name
        </label>
        <input
          id="option-a-name"
          type="text"
          value={activePack?.name ?? ''}
          onChange={(event) => demo.renameActive(event.target.value)}
          onBlur={(event) => {
            if (!event.target.value.trim()) demo.renameActive('Untitled pack');
          }}
          className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-lg font-semibold text-slate-800 hover:border-slate-200 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200"
        />
        <div className="flex w-[12.5rem] shrink-0 items-center justify-end gap-2">
          {isConfirmingDelete ? (
            <>
              <span className="whitespace-nowrap text-sm text-slate-600">Delete pack?</span>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="rounded px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  if (activePack) demo.deletePack(activePack.id);
                }}
                className="rounded bg-red-600 px-2 py-1 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={packs.length === 1}
              title={packs.length === 1 ? 'The last pack cannot be deleted' : 'Delete this pack'}
              onClick={() => setIsConfirmingDelete(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-200"
            >
              <TrashIcon className="h-5 w-5" aria-hidden />
              <span className="sr-only">Delete pack</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
        <AssetCard
          option="option-a"
          type="signatures"
          title="Signatures"
          hint="Transparent .png files. A few variations look more natural than one."
          count={activePack?.signatures ?? 0}
          onFiles={(count) => demo.addFiles('signatures', count)}
          onClear={() => demo.clearFiles('signatures')}
        />
        <AssetCard
          option="option-a"
          type="initials"
          title="Initials"
          hint="Optional. Used by the Initial tool when signing pages."
          count={activePack?.initials ?? 0}
          onFiles={(count) => demo.addFiles('initials', count)}
          onClear={() => demo.clearFiles('initials')}
        />
      </div>
    </section>
  );
};

export default OptionA;
