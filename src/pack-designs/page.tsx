/**
 * Temporary side-by-side preview of three signature pack UI treatments, reachable at `?pack-designs=1`.
 * Delete this folder and the `?pack-designs` branch in main.tsx once a direction has been picked.
 */
import { DemoModalFrame, useDemoPacks } from './shared';
import OptionA from './option-a';
import OptionB from './option-b';
import OptionC from './option-c';

const OPTION_LINKS = [
  { id: 'option-a', letter: 'A', name: 'Pack tabs' },
  { id: 'option-b', letter: 'B', name: 'Pack list & detail' },
  { id: 'option-c', letter: 'C', name: 'Compact pack bar' },
];

const OptionShell = ({
  id,
  letter,
  name,
  idea,
  children,
}: {
  id: string;
  letter: string;
  name: string;
  idea: string;
  children: React.ReactNode;
}) => (
  <section id={id} className="flex w-full scroll-mt-20 flex-col items-center">
    <div className="mb-3 w-full max-w-[44rem]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
          {letter}
        </span>
        <h2 className="text-lg font-semibold text-slate-800">{name}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">{idea}</p>
    </div>
    {children}
  </section>
);

const PackDesignsPage = () => {
  const optionA = useDemoPacks();
  const optionB = useDemoPacks();
  const optionC = useDemoPacks();
  const options = [optionA, optionB, optionC];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[52rem] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <p className="text-sm font-semibold text-slate-800">Signature packs — design options</p>
          <nav className="flex items-center gap-1">
            {OPTION_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {link.letter} · {link.name}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                for (const option of options) option.shuffleCounts();
              }}
              className="h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Shuffle counts
            </button>
            <button
              type="button"
              onClick={() => {
                for (const option of options) option.reset();
              }}
              className="h-8 rounded-md px-3 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[52rem] flex-col items-center gap-14 px-6 py-10">
        <div className="w-full max-w-[44rem] rounded-lg border border-slate-200 bg-white p-5">
          <h1 className="text-xl font-bold text-slate-800">Pick a treatment for the pack + upload UI</h1>
          <p className="mt-2 text-sm text-slate-600">
            Each option below is the real modal chrome wrapped around a different pack control. Everything is local demo
            state — switch packs, rename, create, delete, add or remove files, and use{' '}
            <span className="font-semibold text-slate-800">Shuffle counts</span> to watch what the counts do. Nothing is
            saved and no images are decoded.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            All three keep every row at a fixed height, so the panel never grows or collapses as counts change or packs
            come and go.
          </p>
        </div>

        <OptionShell
          id="option-a"
          letter="A"
          name="Pack tabs"
          idea="Packs are a segmented tab strip, echoing the toolbar's tool and export switches. The active tab, its editable name and its two upload cards read top-to-bottom as one panel; counts live in fixed-width badges."
        >
          <DemoModalFrame>
            <OptionA demo={optionA} />
          </DemoModalFrame>
        </OptionShell>

        <OptionShell
          id="option-b"
          letter="B"
          name="Pack list & detail"
          idea="A packs list on the left with a Sig/Init count column, and the selected pack's detail on the right. Delete lives on the list row, and each asset shows a fixed-height thumbnail rail with an overflow tile."
        >
          <DemoModalFrame>
            <OptionB demo={optionB} />
          </DemoModalFrame>
        </OptionShell>

        <OptionShell
          id="option-c"
          letter="C"
          name="Compact pack bar"
          idea="One split control: pack picker, rename and an actions menu in a single 44px row. Menus and confirmations are overlays, so nothing below them ever moves; the uploads become two dense lines."
        >
          <DemoModalFrame>
            <OptionC demo={optionC} />
          </DemoModalFrame>
        </OptionShell>

        <p className="w-full max-w-[44rem] text-xs text-slate-500">
          Scaffolding only: delete <code className="rounded bg-slate-200 px-1 py-0.5">src/pack-designs</code> and the{' '}
          <code className="rounded bg-slate-200 px-1 py-0.5">?pack-designs</code> branch in{' '}
          <code className="rounded bg-slate-200 px-1 py-0.5">src/main.tsx</code> once an option is chosen.
        </p>
      </main>
    </div>
  );
};

export default PackDesignsPage;
