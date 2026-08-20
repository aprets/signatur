/**
 * Temporary design option — descended from Split. See shared.tsx.
 *
 * The white side gets a spine: the pack name is its editable headline, and every destructive
 * action (clear either set, delete the pack) lives in one ⋯ menu beside it. That leaves each
 * upload well with exactly one job and one voice — the whole surface picks files, with a quiet
 * trailing "Replace" once it is filled — and the footer holds only the primary action.
 */
import { useState } from 'react';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { DemoModal, PackRail, PngPicker, SignatureTile, TILE_KEYS } from './shared';
import type { DemoAssetType, OptionProps } from './shared';

const VISIBLE_TILES = 4;

const AssetWell = ({
  type,
  title,
  hint,
  count,
  isPrimary,
  onFiles,
}: {
  type: DemoAssetType;
  title: string;
  hint: string;
  count: number;
  isPrimary: boolean;
  onFiles: (count: number) => void;
}) => (
  <div>
    <p className="mb-2 flex items-baseline gap-2 text-sm">
      <span className="font-semibold text-slate-800">{title}</span>
      <span className="text-xs tabular-nums text-slate-400">
        {count ? `${count} ${count === 1 ? 'file' : 'files'}` : hint}
      </span>
    </p>
    <PngPicker
      id={`headline-${type}-input`}
      onFiles={onFiles}
      title={`Choose ${title.toLowerCase()} (.png)`}
      className={`flex h-24 cursor-pointer items-center gap-4 overflow-hidden rounded-xl px-5 transition-colors ${
        // eslint-disable-next-line no-nested-ternary
        count
          ? 'bg-violet-50 text-violet-600 hover:bg-violet-100'
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
          <span className="ml-auto shrink-0 text-sm font-semibold text-violet-700">Replace</span>
        </>
      ) : (
        <span className="m-auto text-sm font-medium">Choose transparent .png files</span>
      )}
    </PngPicker>
  </div>
);

const MenuItem = ({
  children,
  isDanger,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  isDanger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex h-9 w-full items-center rounded-lg px-3 text-left text-sm font-medium disabled:pointer-events-none disabled:text-slate-300 ${
      isDanger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

const OptionHeadline = ({ demo, isOpen, onRequestClose }: OptionProps) => {
  const [menuState, setMenuState] = useState<'closed' | 'open' | 'confirm-delete'>('closed');
  const { packs, activePack } = demo;
  const canProceed = !!activePack?.signatures;

  const closeMenu = () => setMenuState('closed');

  return (
    <DemoModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="isolate flex min-h-[30rem] overflow-hidden rounded-2xl bg-violet-700 shadow-2xl ring-1 ring-black/10 lg:w-[54rem]"
    >
      <PackRail demo={demo} manage="list" onChangePack={closeMenu} />

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex items-center gap-2 px-8 pt-6">
          <label htmlFor="headline-pack-name" className="sr-only">
            Pack name
          </label>
          <input
            id="headline-pack-name"
            type="text"
            value={activePack?.name ?? ''}
            title="Rename pack"
            onChange={(event) => demo.renameActive(event.target.value)}
            onBlur={(event) => {
              if (!event.target.value.trim()) demo.renameActive('Untitled pack');
            }}
            className="-ml-2 h-11 min-w-0 flex-1 rounded-lg px-2 text-2xl font-bold tracking-tight text-slate-900 outline-none transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-violet-200"
          />
          <div className="relative shrink-0">
            <button
              type="button"
              title="Pack actions"
              onClick={() => setMenuState(menuState === 'closed' ? 'open' : 'closed')}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 ${
                menuState === 'closed' ? '' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <EllipsisHorizontalIcon className="h-6 w-6" aria-hidden />
              <span className="sr-only">Pack actions</span>
            </button>
            {menuState !== 'closed' && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={closeMenu}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute right-0 z-20 mt-1 w-60 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/10">
                  {menuState === 'open' ? (
                    <>
                      <MenuItem
                        disabled={!activePack?.signatures}
                        onClick={() => {
                          demo.clearFiles('signatures');
                          closeMenu();
                        }}
                      >
                        Clear signatures
                      </MenuItem>
                      <MenuItem
                        disabled={!activePack?.initials}
                        onClick={() => {
                          demo.clearFiles('initials');
                          closeMenu();
                        }}
                      >
                        Clear initials
                      </MenuItem>
                      <div className="my-1.5 h-px bg-slate-100" />
                      <MenuItem isDanger disabled={packs.length === 1} onClick={() => setMenuState('confirm-delete')}>
                        Delete pack…
                      </MenuItem>
                    </>
                  ) : (
                    <>
                      <p className="px-3 pb-2 pt-2.5 text-sm leading-5 text-slate-700">
                        Delete <span className="font-semibold">{activePack?.name}</span> and its files?
                      </p>
                      <div className="flex justify-end gap-1.5 p-1">
                        <button
                          type="button"
                          onClick={closeMenu}
                          className="h-8 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (activePack) demo.deletePack(activePack.id);
                            closeMenu();
                          }}
                          className="h-8 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-5 px-8 pt-5">
          <AssetWell
            type="signatures"
            title="Signatures"
            hint="none yet"
            count={activePack?.signatures ?? 0}
            isPrimary={!canProceed}
            onFiles={(count) => demo.setFiles('signatures', count)}
          />
          <AssetWell
            type="initials"
            title="Initials"
            hint="optional"
            count={activePack?.initials ?? 0}
            isPrimary={false}
            onFiles={(count) => demo.setFiles('initials', count)}
          />
        </div>

        <div className="mt-auto flex h-[4.5rem] shrink-0 items-center gap-3 border-t border-slate-100 px-8">
          {!canProceed && (
            <p className="min-w-0 truncate text-sm text-slate-400">Add at least one signature to get started</p>
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

export default OptionHeadline;
