/**
 * Temporary design option — descended from Roster. See shared.tsx.
 *
 * The pack list stops being a card inside the modal and becomes the modal's own left edge:
 * a full-bleed violet rail that carries the welcome copy, the packs and the credits, so the
 * white side is left to do exactly one job — the two signature sets of the active pack.
 */
import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { DemoModal, PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, OptionProps } from './shared';

const VISIBLE_TILES = 4;

const AssetWell = ({
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
  <div>
    <div className="mb-2 flex h-5 items-baseline gap-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="min-w-0 flex-1 truncate text-xs text-slate-400">{hint}</p>
      <button
        type="button"
        disabled={!count}
        onClick={onClear}
        className="shrink-0 text-xs font-medium text-slate-400 hover:text-red-700 disabled:invisible"
      >
        Clear
      </button>
    </div>
    <PngPicker
      id={`split-${type}-input`}
      onFiles={onFiles}
      title={`Choose ${title.toLowerCase()} (.png)`}
      className={`flex h-24 cursor-pointer items-center gap-4 overflow-hidden rounded-xl px-5 transition-colors ${
        // eslint-disable-next-line no-nested-ternary
        count
          ? 'bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100 hover:bg-violet-100'
          : isPrimary
          ? 'border-2 border-dashed border-violet-300 bg-violet-50/40 text-violet-700 hover:border-violet-400 hover:bg-violet-50'
          : 'border-2 border-dashed border-slate-200 text-slate-500 hover:border-violet-300 hover:bg-violet-50/40'
      }`}
    >
      {count ? (
        <>
          {TILE_KEYS.slice(0, Math.min(count, VISIBLE_TILES)).map((key, index) => (
            <SignatureTile key={key} seed={index + count} className="h-10 w-[4.5rem] shrink-0" />
          ))}
          <span className="ml-auto shrink-0 text-right">
            <span className="block text-xs tabular-nums text-violet-400">
              {count} {count === 1 ? 'file' : 'files'}
            </span>
            <span className="block text-sm font-semibold text-violet-700">Replace…</span>
          </span>
        </>
      ) : (
        <span className="m-auto text-sm font-medium">Choose transparent .png files</span>
      )}
    </PngPicker>
  </div>
);

const OptionSplit = ({ demo, isOpen, onRequestClose }: OptionProps) => {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const { packs, activeId, activePack } = demo;
  const canProceed = !!activePack?.signatures;

  return (
    <DemoModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="isolate flex min-h-[30rem] overflow-hidden rounded-2xl bg-violet-700 shadow-2xl ring-1 ring-black/10 lg:w-[54rem]"
    >
      <div className="flex w-56 shrink-0 flex-col bg-violet-700 lg:w-64">
        <div className="px-6 pb-6 pt-7">
          <p className="text-lg font-bold tracking-tight text-white">Signatur 🖋️</p>
          <p className="mt-2 text-[13px] leading-5 text-violet-200">
            Sign PDFs. Everything runs in your browser, so your data is never sent to any servers.
          </p>
        </div>

        <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">Your packs</p>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {packs.map((pack) => {
            const isActive = pack.id === activeId;
            return (
              <li
                key={pack.id}
                // Keeps a freshly created or newly selected pack visible when the list scrolls.
                ref={isActive ? (node) => node?.scrollIntoView({ block: 'nearest' }) : null}
              >
                {isActive ? (
                  <label className="flex h-11 w-full items-center gap-2 border-l-[3px] border-white bg-violet-800 px-6">
                    <span className="sr-only">Pack name</span>
                    <input
                      type="text"
                      value={pack.name}
                      title="Rename pack"
                      onChange={(event) => demo.renameActive(event.target.value)}
                      onBlur={(event) => {
                        if (!event.target.value.trim()) demo.renameActive('Untitled pack');
                      }}
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-violet-300"
                    />
                    {!pack.signatures && !pack.initials && (
                      <span className="shrink-0 text-[11px] font-normal text-violet-300">empty</span>
                    )}
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingDelete(false);
                      demo.selectPack(pack.id);
                    }}
                    className="flex h-11 w-full items-center gap-2 border-l-[3px] border-transparent px-6 text-left text-sm text-violet-100 hover:bg-violet-600/60"
                  >
                    <span className="min-w-0 flex-1 truncate">{pack.name}</span>
                    {!pack.signatures && !pack.initials && (
                      <span className="shrink-0 text-[11px] font-normal text-violet-300">empty</span>
                    )}
                  </button>
                )}
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

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="space-y-6 px-8 pt-8">
          <AssetWell
            type="signatures"
            title="Signatures"
            hint="a few variations look most natural"
            count={activePack?.signatures ?? 0}
            isPrimary={!canProceed}
            onFiles={(count) => demo.setFiles('signatures', count)}
            onClear={() => demo.clearFiles('signatures')}
          />
          <AssetWell
            type="initials"
            title="Initials"
            hint="optional, for initialling pages"
            count={activePack?.initials ?? 0}
            isPrimary={false}
            onFiles={(count) => demo.setFiles('initials', count)}
            onClear={() => demo.clearFiles('initials')}
          />
        </div>

        <div className="mt-auto flex h-[4.5rem] shrink-0 items-center gap-3 border-t border-slate-100 px-8">
          {isConfirmingDelete ? (
            <>
              <p className="min-w-0 flex-1 truncate text-sm text-slate-700">
                Delete <span className="font-semibold">{activePack?.name}</span> and its files?
              </p>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activePack) demo.deletePack(activePack.id);
                  setConfirmingDelete(false);
                }}
                className="h-9 shrink-0 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={packs.length === 1}
                title={packs.length === 1 ? 'The last pack cannot be deleted' : undefined}
                onClick={() => setConfirmingDelete(true)}
                className="h-9 rounded-lg px-3 text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-200"
              >
                Delete pack
              </button>
              <button
                type="button"
                disabled={!canProceed}
                title={canProceed ? 'Preview only' : 'Add at least one signature to this pack first'}
                className="ml-auto h-11 rounded-lg bg-violet-600 px-6 font-semibold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-400"
              >
                Let&apos;s go 🚀
              </button>
            </>
          )}
        </div>
      </div>
    </DemoModal>
  );
};

export default OptionSplit;
