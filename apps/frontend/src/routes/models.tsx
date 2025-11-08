import { createFileRoute } from '@tanstack/react-router'

import { GradientBars } from '@/components/ui/gradient-bars'

export const Route = createFileRoute('/models')({
  component: ModelsRoute,
})

function ModelsRoute() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-10 text-white">
      <GradientBars />
    </main>
  )
}
