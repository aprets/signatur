/**
 * Temporary design option — descended from Split. See shared.tsx.
 *
 * A strict division of labour: the rail owns the pack (rename inline, delete confirms in the
 * row), so the white side is nothing but the pack's contents — two full-height bands where the
 * controls sit in a fixed right-hand column, one button and one clear slot per band, always in
 * the same place. The footer is gone; the primary action is a full-width bar along the bottom
 * that states what is missing while it is disabled.
 */
import { TrashIcon } from '@heroicons/react/24/outline';
import { DemoModal, PackRail, PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, OptionProps } from './shared';

const VISIBLE_TILES = 2;

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
  <div className="flex flex-1 items-center gap-5 px-8">
    <div className="w-24 shrink-0">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-0.5 text-xs tabular-nums text-slate-400">
        {count ? `${count} ${count === 1 ? 'file' : 'files'}` : hint}
      </p>
    </div>
    <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden text-violet-500">
      {count ? (
        <>
          {TILE_KEYS.slice(0, Math.min(count, VISIBLE_TILES)).map((key, index) => (
            <SignatureTile key={key} seed={index + count} className="h-12 w-[5.5rem] shrink-0" />
          ))}
          {count > VISIBLE_TILES && (
            <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">+{count - VISIBLE_TILES}</span>
          )}
        </>
      ) : (
        <span className="truncate text-sm text-slate-300">Transparent .png files</span>
      )}
    </div>
    <div className="flex shrink-0 items-center gap-1">
      <PngPicker
        id={`bands-${type}-input`}
        onFiles={onFiles}
        title={`Choose ${title.toLowerCase()} (.png)`}
        className={`flex h-10 w-32 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
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
        title={`Remove all ${title.toLowerCase()}`}
        onClick={onClear}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 disabled:invisible"
      >
        <TrashIcon className="h-5 w-5" aria-hidden />
        <span className="sr-only">Remove all {title.toLowerCase()}</span>
      </button>
    </div>
  </div>
);

const OptionBands = ({ demo, isOpen, onRequestClose }: OptionProps) => {
  const { activePack } = demo;
  const canProceed = !!activePack?.signatures;

  return (
    <DemoModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="isolate flex min-h-[28rem] overflow-hidden rounded-2xl bg-violet-700 shadow-2xl ring-1 ring-black/10 lg:w-[54rem]"
    >
      <PackRail demo={demo} manage="inline" />

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-100">
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
        <button
          type="button"
          disabled={!canProceed}
          title={canProceed ? 'Preview only' : undefined}
          className="h-14 w-full shrink-0 bg-violet-600 font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {canProceed ? 'Let’s go 🚀' : 'Add a signature to start signing'}
        </button>
      </div>
    </DemoModal>
  );
};

export default OptionBands;
