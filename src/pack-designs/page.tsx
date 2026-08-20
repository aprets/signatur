/**
 * Temporary comparison of signature pack UI treatments, reachable at `?pack-designs=1`.
 * One real modal at a time, over a mock of the app behind it. Each option owns its whole
 * modal — panel size, welcome copy, hierarchy and footer are all part of the design.
 * Delete this folder and the `?pack-designs` branch in main.tsx once a direction has been picked.
 */
import { useState } from 'react';
import { useDemoPacks } from './shared';
import OptionSplit from './option-split';
import OptionHeadline from './option-headline';
import OptionBands from './option-bands';
import OptionColumns from './option-columns';

const VARIANTS = [
  {
    id: 'split',
    name: 'Split',
    lineage: 'baseline',
    idea: 'Last round’s pick, unchanged, for reference. Its known weakness: a filled well speaks in three voices at three corners — a Clear link above, a floating count, a Replace pill inside — and the footer pairs an orphaned Delete pack with the CTA.',
    Component: OptionSplit,
  },
  {
    id: 'headline',
    name: 'Headline',
    lineage: 'from Split',
    idea: 'The white side gets a spine: the pack name is its editable headline, and every destructive action — clear signatures, clear initials, delete pack — is consolidated into one ⋯ menu beside it. Each well then has one job and one voice: the whole surface picks files, with a quiet trailing “Replace” once filled. The footer holds only the CTA.',
    Component: OptionHeadline,
  },
  {
    id: 'bands',
    name: 'Bands',
    lineage: 'from Split',
    idea: 'Strict division of labour: the rail owns the pack (rename inline, trash confirms in the row), the white side owns only its contents. Two full-height bands with a fixed control column — one button, one clear slot, always in the same place. No footer: the CTA is a full-width bar that states what is missing while disabled.',
    Component: OptionBands,
  },
  {
    id: 'columns',
    name: 'Columns',
    lineage: 'from Split',
    idea: 'The two sets become the architecture: signatures and initials are full-height columns split by a hairline. Each column is three layers — a header where the count and its removal fuse into one chip (“7 files ×”), strokes resting on the surface, one button pinned to the bottom. Pack management lives in the rail.',
    Component: OptionColumns,
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

/** `?pack-designs=stage` deep-links straight to one option; `?pack-designs=1` opens the first. */
const requestedVariantId = new URLSearchParams(window.location.search).get('pack-designs') ?? '';
// The previous rounds' names, so old links keep working.
const LEGACY_IDS: Record<string, string> = { roster: 'split', switcher: 'split', stage: 'split' };
const initialVariantId = LEGACY_IDS[requestedVariantId] ?? requestedVariantId;

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

      {variant && <variant.Component demo={demo} isOpen={isOpen} onRequestClose={() => setOpen(false)} />}

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
