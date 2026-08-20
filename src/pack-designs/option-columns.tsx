/**
 * Temporary design option — descended from Split. See shared.tsx.
 *
 * The pack's two sets become the architecture itself: signatures and initials are two
 * full-height columns split by a hairline, so nothing is a box inside a box. Each column has
 * exactly three layers — a header where the count and its removal are one chip ("7 files ×"),
 * the strokes resting straight on the surface, and a single button pinned to the bottom.
 * Pack management (rename, delete) lives in the rail, and the footer holds only the primary
 * action.
 */
import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DemoModal, PackRail, PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, OptionProps } from './shared';

const VISIBLE_TILES = 3;

const AssetColumn = ({
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
  <div className="flex min-w-0 flex-1 flex-col px-7 pb-6 pt-6">
    <div className="flex h-7 items-center gap-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <span className="flex-1" />
      {count ? (
        <span className="flex h-6 shrink-0 items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs font-medium tabular-nums text-slate-500">
          {count} {count === 1 ? 'file' : 'files'}
          <button
            type="button"
            title={`Remove all ${title.toLowerCase()}`}
            onClick={onClear}
            className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600"
          >
            <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Remove all {title.toLowerCase()}</span>
          </button>
        </span>
      ) : (
        <span className="shrink-0 text-xs text-slate-400">{hint}</span>
      )}
    </div>

    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-4">
      {count ? (
        <>
          {TILE_KEYS.slice(0, Math.min(count, VISIBLE_TILES)).map((key, index) => (
            <SignatureTile key={key} seed={index + count} className="h-10 w-[4.5rem] shrink-0 text-violet-500" />
          ))}
          {count > VISIBLE_TILES && (
            <span className="text-xs font-medium tabular-nums text-slate-400">+{count - VISIBLE_TILES} more</span>
          )}
        </>
      ) : (
        <>
          {TILE_KEYS.slice(0, 2).map((key, index) => (
            <SignatureTile key={key} seed={index + 3} className="h-10 w-[4.5rem] shrink-0 text-slate-200" />
          ))}
          <span className="text-xs text-slate-300">Transparent .png files</span>
        </>
      )}
    </div>

    <PngPicker
      id={`columns-${type}-input`}
      onFiles={onFiles}
      title={`Choose ${title.toLowerCase()} (.png)`}
      className={`flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
        isPrimary
          ? 'bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800'
          : 'bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200'
      }`}
    >
      {count ? 'Replace' : 'Choose files'}
    </PngPicker>
  </div>
);

const OptionColumns = ({ demo, isOpen, onRequestClose }: OptionProps) => {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const { packs, activePack } = demo;
  const canProceed = !!activePack?.signatures;

  return (
    <DemoModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="isolate flex min-h-[28rem] overflow-hidden rounded-2xl bg-violet-700 shadow-2xl ring-1 ring-black/10 lg:w-[54rem]"
    >
      <PackRail demo={demo} manage="inline" showDelete={false} onChangePack={() => setConfirmingDelete(false)} />

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex min-h-0 flex-1 divide-x divide-slate-100">
          <AssetColumn
            type="signatures"
            title="Signatures"
            hint="none yet"
            count={activePack?.signatures ?? 0}
            isPrimary={!canProceed}
            onFiles={(count) => demo.setFiles('signatures', count)}
            onClear={() => demo.clearFiles('signatures')}
          />
          <AssetColumn
            type="initials"
            title="Initials"
            hint="optional"
            count={activePack?.initials ?? 0}
            isPrimary={false}
            onFiles={(count) => demo.setFiles('initials', count)}
            onClear={() => demo.clearFiles('initials')}
          />
        </div>

        <div className="flex h-[4.5rem] shrink-0 items-center gap-3 border-t border-slate-100 px-7">
          {isConfirmingDelete ? (
            <>
              <p className="min-w-0 truncate text-sm text-slate-700">
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
            <button
              type="button"
              disabled={packs.length === 1}
              title={packs.length === 1 ? 'The last pack cannot be deleted' : undefined}
              onClick={() => setConfirmingDelete(true)}
              className="h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-slate-200"
            >
              Delete pack
            </button>
          )}
          <button
            type="button"
            disabled={!canProceed}
            title={canProceed ? 'Preview only' : 'Add at least one signature to this pack first'}
            className="ml-auto h-11 shrink-0 rounded-lg bg-violet-600 px-6 font-semibold text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-400"
          >
            Let&apos;s go 🚀
          </button>
        </div>
      </div>
    </DemoModal>
  );
};

export default OptionColumns;
