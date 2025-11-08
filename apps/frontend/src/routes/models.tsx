import { createFileRoute } from '@tanstack/react-router'

import { GridBackground } from '@/components/ui/grid-background'

export const Route = createFileRoute('/models')({
  component: ModelsRoute,
})

function ModelsRoute() {
  return (
    <GridBackground className="min-h-screen" gridSize="6:6">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-2 py-10 md:px-4">
        <header className="space-y-2 text-white">
          <h1 className="font-display text-4xl">Models</h1>
          <p className="text-sm text-white/70">
            Placeholder page for upcoming model documentation and management.
          </p>
        </header>
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <p className="text-white/80">Models</p>
        </div>
      </main>
    </GridBackground>
  )
}
