import { createFileRoute } from '@tanstack/react-router'

import { GridBackground } from '@/components/ui/grid-background'

export const Route = createFileRoute('/models')({
  component: ModelsRoute,
})

function ModelsRoute() {
  return (
    <GridBackground className="min-h-screen" gridSize="6:6">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-2 py-10 text-white md:px-4">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-10">
          <span className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
            On-Device Gemini
          </span>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">
            Download local models, play private matches
          </h1>
          <p className="mt-4 text-base text-white/80 md:text-lg">
            Keep your Tic-Tac-Toe Arena duels fast and private by running Gemini Nano
            directly in your browser. This page helps you confirm hardware support,
            monitor downloads, and prep models before you queue the next match.
          </p>
          <ul className="mt-6 grid gap-4 text-sm text-white/75 md:grid-cols-3">
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Low-latency turns</p>
              <p className="mt-1 text-white/70">
                Responses stream without a network round-trip once Gemini Nano is ready.
              </p>
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Privacy preserved</p>
              <p className="mt-1 text-white/70">
                Moves stay on your device
              </p>
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Ready for rematches</p>
              <p className="mt-1 text-white/70">
                Once downloads finish here, Arena automatically detects and enables the
                models the next time you open Match Controls.
              </p>
            </li>
          </ul>
        </header>
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <p className="text-white/80">Models</p>
        </div>
      </main>
    </GridBackground>
  )
}
