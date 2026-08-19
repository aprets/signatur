/**
 * Temporary comparison of signature pack UI treatments, reachable at `?pack-designs=1`.
 * One real modal at a time, over a mock of the app behind it. Delete this folder and the
 * `?pack-designs` branch in main.tsx once a direction has been picked.
 */
import { useState } from 'react';
import { DemoModal, useDemoPacks } from './shared';
import OptionLedger from './option-ledger';
import OptionRoster from './option-roster';
import OptionSwitcher from './option-switcher';
import OptionFocus from './option-focus';
import type { DemoPacks } from './shared';

const VARIANTS = [
  {
    id: 'ledger',
    name: 'Ledger',
    lineage: 'from B',
    idea: 'Two panes in one bordered box: a pack table on the left whose Sig/Init columns share a single grid with the header, and a detail side that is just a name, a divider and two asset rows — no inner cards. Delete moved off the list rows (no hover-only controls) and confirms in an overlay pinned over the name field.',
    render: (demo: DemoPacks) => <OptionLedger demo={demo} />,
  },
  {
    id: 'roster',
    name: 'Roster',
    lineage: 'from B',
    idea: 'Same two panes, but counts become pictures: each list row previews its own signatures, and the detail side is a fixed 5-slot thumbnail grid per type with a permanent leading Add tile and per-file remove. Deleting a pack takes over the New pack row.',
    render: (demo: DemoPacks) => <OptionRoster demo={demo} />,
  },
  {
    id: 'switcher',
    name: 'Switcher',
    lineage: 'from C',
    idea: 'The whole pack concept collapses into one 44px bar: name, counts, picker. The pack list and every destructive action live in overlays, so the body below never moves. Uploads are two dividered lines with an inline thumbnail strip.',
    render: (demo: DemoPacks) => <OptionSwitcher demo={demo} />,
  },
  {
    id: 'focus',
    name: 'Focus',
    lineage: 'from C',
    idea: 'Inverts the hierarchy: the active pack is a rename-in-place title with its two upload wells side by side, and pack management is demoted to a quiet single-line index at the bottom. Least chrome, no popovers, no list pane.',
    render: (demo: DemoPacks) => <OptionFocus demo={demo} />,
  },
];

/** A cheap stand-in for the real app, so the modal is judged as an overlay and not as a page card. */
const AppBackdrop = () => (
  <div className="flex h-screen flex-col">
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <div className="h-10 w-64 rounded bg-slate-200" />
      <div className="ml-auto h-10 w-72 rounded bg-slate-200" />
      <div className="h-10 w-40 rounded bg-violet-300" />
    </div>
    <div className="flex flex-grow justify-center overflow-hidden bg-slate-200 p-6">
      <div className="h-full w-full max-w-3xl rounded bg-white shadow" />
    </div>
  </div>
);

/** `?pack-designs=roster` deep-links straight to one option; `?pack-designs=1` opens the first. */
const initialVariantId = new URLSearchParams(window.location.search).get('pack-designs') ?? '';

const PackDesignsPage = () => {
  const demo = useDemoPacks();
  const [variantId, setVariantId] = useState(
    VARIANTS.some((candidate) => candidate.id === initialVariantId) ? initialVariantId : VARIANTS[0]?.id ?? '',
  );
  const [isOpen, setOpen] = useState(true);
  const [isChromeVisible, setChromeVisible] = useState(true);
  const variant = VARIANTS.find((candidate) => candidate.id === variantId) ?? VARIANTS[0];

  return (
    <>
      <AppBackdrop />

      <DemoModal isOpen={isOpen} onRequestClose={() => setOpen(false)} canProceed={!!demo.activePack?.signatures}>
        {variant?.render(demo)}
      </DemoModal>

      {!isChromeVisible && (
        <button
          type="button"
          onClick={() => setChromeVisible(true)}
          className="fixed left-4 top-4 z-50 h-8 rounded-md bg-slate-900/90 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-900"
        >
          Show controls
        </button>
      )}

      <div
        className={`fixed inset-x-0 top-0 z-50 border-b border-slate-700 bg-slate-900/95 text-slate-200 backdrop-blur ${
          isChromeVisible ? '' : 'hidden'
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <p className="text-sm font-semibold text-white">Signature packs</p>
          <div className="flex h-9 items-center gap-1 rounded-lg bg-slate-800 p-1">
            {VARIANTS.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === variantId}
                onClick={() => {
                  setVariantId(candidate.id);
                  setOpen(true);
                  window.history.replaceState(null, '', `?pack-designs=${candidate.id}`);
                }}
                className={`h-7 rounded-md px-3 text-sm font-semibold transition-colors ${
                  candidate.id === variantId ? 'bg-white text-violet-700' : 'text-slate-300 hover:text-white'
                }`}
              >
                {candidate.name}
                <span className="ml-1.5 text-xs font-normal opacity-60">{candidate.lineage}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={demo.shuffleCounts}
              title="Randomise every count, up to three digits"
              className="h-8 rounded-md bg-slate-700 px-3 text-xs font-semibold text-white hover:bg-slate-600"
            >
              Shuffle counts
            </button>
            <button
              type="button"
              onClick={demo.reset}
              className="h-8 rounded-md px-3 text-xs font-semibold text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-800"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="h-8 w-28 rounded-md px-3 text-xs font-semibold text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-800"
            >
              {isOpen ? 'Close modal' : 'Open modal'}
            </button>
            <button
              type="button"
              title="Hide this bar to see the modal on its own"
              onClick={() => setChromeVisible(false)}
              className="h-8 rounded-md px-3 text-xs font-semibold text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-800"
            >
              Hide
            </button>
          </div>
          <p className="w-full text-xs leading-5 text-slate-400">
            <span className="font-semibold text-slate-200">{variant?.name}</span> — {variant?.idea}
          </p>
        </div>
      </div>
    </>
  );
};

export default PackDesignsPage;
