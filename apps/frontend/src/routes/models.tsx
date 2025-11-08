import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/models')({
  component: ModelsRoute,
})

function ModelsRoute() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-10 text-white">
      <h1 className="font-display text-4xl">Models</h1>
    </main>
  )
}
