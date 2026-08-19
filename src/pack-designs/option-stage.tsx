/**
 * Temporary design option — descended from Switcher. See shared.tsx.
 *
 * The popover is gone: the active pack becomes the modal's headline, and switching flips the
 * whole modal to a second face. The body is three full-bleed bands — signatures, initials,
 * and a footer that demotes the welcome copy to a footnote next to the primary action.
 */
import { useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { DemoModal, PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, OptionProps } from './shared';

const VISIBLE_TILES = 3;

const AssetBand = ({
  type,
  title,
  hint,
  count,
  isPrimary,
  onFiles,
  onClear,
}: {
  type: DemoAssetType;
  title: string;
  hint: string;
  count: number;
  isPrimary: boolean;
  onFiles: (count: number) => void;
  onClear: () => void;
}) => (
  <div className="flex h-[5.5rem] items-center gap-4 px-9">
    <div className="w-28 shrink-0">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs tabular-nums text-slate-400">
        {count ? `${count} ${count === 1 ? 'file' : 'files'}` : hint}
      </p>
    </div>
    <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-violet-500">
      {count ? (
        <>
          {TILE_KEYS.slice(0, Math.min(count, VISIBLE_TILES)).map((key, index) => (
            <SignatureTile key={key} seed={index + count} className="h-8 w-14 shrink-0" />
          ))}
          {count > VISIBLE_TILES && (
            <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">+{count - VISIBLE_TILES}</span>
          )}
        </>
      ) : (
        <span className="truncate text-xs text-slate-400">Transparent .png files</span>
      )}
    </div>
    <PngPicker
      id={`stage-${type}-input`}
      onFiles={onFiles}
      className={`flex h-9 shrink-0 cursor-pointer items-center rounded-lg px-4 text-sm font-semibold ${
        isPrimary
          ? 'bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800'
          : 'bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200'
      }`}
    >
      {count ? 'Replace' : 'Choose files'}
    </PngPicker>
    <button
      type="button"
      disabled={!count}
      onClick={onClear}
      className="h-9 w-12 shrink-0 text-xs font-medium text-slate-400 hover:text-red-700 disabled:invisible"
    >
      Clear
    </button>
  </div>
);

const OptionStage = ({ demo, isOpen, onRequestClose }: OptionProps) => {
  const [isPickingPack, setPickingPack] = useState(false);
  const [isRenaming, setRenaming] = useState(false);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { packs, activeId, activePack } = demo;
  const canProceed = !!activePack?.signatures;

  const startRenaming = () => {
    setRenaming(true);
    requestAnimationFrame(() => nameInputRef.current?.select());
  };

  return (
    <DemoModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="flex min-h-[27rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:w-[40rem]"
    >
      {isPickingPack ? (
        <>
          <div className="px-9 pb-6 pt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Signature packs</p>
            <h2 className="mt-1 text-[2rem] font-bold leading-none tracking-tight text-slate-900">Switch pack</h2>
            <p className="mt-2 text-sm text-slate-500">
              One pack per person whose documents you sign. Switching swaps everything placed on the document.
            </p>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto border-y border-slate-100">
            {packs.map((pack) => {
              const isActive = pack.id === activeId;
              return (
                <li key={pack.id}>
                  <button
                    type="button"
                    onClick={() => {
                      demo.selectPack(pack.id);
                      setPickingPack(false);
                    }}
                    className="flex h-16 w-full items-center gap-4 px-9 text-left hover:bg-slate-50"
                  >
                    <CheckIcon
                      className={`h-5 w-5 shrink-0 ${isActive ? 'text-violet-600' : 'text-transparent'}`}
                      aria-hidden
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-base ${
                        isActive ? 'font-semibold text-violet-700' : 'text-slate-800'
                      }`}
                    >
                      {pack.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">
                      {pack.signatures} sig · {pack.initials} init
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex h-[4.5rem] shrink-0 items-center justify-between px-9">
            <button
              type="button"
              onClick={() => {
                demo.createPack();
                setPickingPack(false);
              }}
              className="flex h-10 items-center gap-2 rounded-lg bg-violet-50 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-100"
            >
              <PlusIcon className="h-4 w-4" aria-hidden />
              New pack
            </button>
            <button
              type="button"
              onClick={() => setPickingPack(false)}
              className="h-10 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Back
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="px-9 pb-6 pt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Signing as</p>
            {isRenaming ? (
              <>
                <label htmlFor="stage-name" className="sr-only">
                  Pack name
                </label>
                <input
                  ref={nameInputRef}
                  id="stage-name"
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
                  className="-ml-2 mt-1 block h-11 w-[calc(100%+1rem)] rounded-lg border border-violet-300 px-2 text-[2rem] font-bold leading-none tracking-tight text-slate-900 outline-none focus:ring-2 focus:ring-violet-100"
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setPickingPack(true)}
                className="-ml-1 mt-1 flex h-11 max-w-full items-center gap-2 rounded-lg px-1 text-[2rem] font-bold leading-none tracking-tight text-slate-900 hover:text-violet-700"
              >
                <span className="min-w-0 truncate">{activePack?.name ?? ''}</span>
                <ChevronDownIcon className="h-6 w-6 shrink-0 text-slate-400" aria-hidden />
              </button>
            )}
            <div className="mt-3 flex h-8 items-center gap-1 text-sm">
              {isConfirmingDelete ? (
                <>
                  <p className="min-w-0 flex-1 truncate text-slate-700">Delete this pack and its files?</p>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="h-8 shrink-0 rounded-lg px-3 font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activePack) demo.deletePack(activePack.id);
                      setConfirmingDelete(false);
                    }}
                    className="h-8 shrink-0 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startRenaming}
                    className="h-8 rounded-lg px-2 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    Rename
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => setPickingPack(true)}
                    className="h-8 rounded-lg px-2 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    All packs
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    disabled={packs.length === 1}
                    title={packs.length === 1 ? 'The last pack cannot be deleted' : undefined}
                    onClick={() => setConfirmingDelete(true)}
                    className="h-8 rounded-lg px-2 font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-300"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100 border-y border-slate-100">
            <AssetBand
              type="signatures"
              title="Signatures"
              hint="none yet"
              count={activePack?.signatures ?? 0}
              isPrimary={!canProceed}
              onFiles={(count) => demo.setFiles('signatures', count)}
              onClear={() => demo.clearFiles('signatures')}
            />
            <AssetBand
              type="initials"
              title="Initials"
              hint="optional"
              count={activePack?.initials ?? 0}
              isPrimary={false}
              onFiles={(count) => demo.setFiles('initials', count)}
              onClear={() => demo.clearFiles('initials')}
            />
          </div>

          <div className="mt-auto flex items-center justify-between gap-6 px-9 py-6">
            <p className="max-w-[20rem] text-xs leading-5 text-slate-500">
              Signatur runs entirely in this browser tab — nothing is uploaded. Made by{' '}
              <a href="https://aprets.me" className="underline">
                aprets
              </a>{' '}
              ·{' '}
              <a href="https://github.com/aprets/signatur" className="underline">
                source
              </a>
            </p>
            <button
              type="button"
              disabled={!canProceed}
              title={canProceed ? 'Preview only' : 'Add at least one signature to this pack first'}
              className="h-11 shrink-0 rounded-lg bg-violet-600 px-6 font-semibold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-400"
            >
              Let&apos;s go 🚀
            </button>
          </div>
        </>
      )}
    </DemoModal>
  );
};

export default OptionStage;
