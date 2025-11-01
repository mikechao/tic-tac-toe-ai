import { createFileRoute } from '@tanstack/react-router'

import { demoMatches } from '@/data/demo.matches'
import { Globe } from '@/components/ui/globe'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const featuredMatch = demoMatches.matches[0]

  return (
    <div className="relative h-full w-full min-h-screen">
      <Globe />
      <div className="absolute bottom-6 left-1/2 w-full max-w-[320px] -translate-x-1/2 rounded-xl border border-white/10 bg-black/60 p-4 text-center text-sm text-white shadow-lg backdrop-blur">
        Latest match: Model {featuredMatch.modelAId} vs Model {featuredMatch.modelBId}
        <div className="mt-1 text-xs text-white/70">
          {featuredMatch.totalRounds} total rounds · created {new Date(featuredMatch.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
