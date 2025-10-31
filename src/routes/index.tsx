import { createFileRoute } from '@tanstack/react-router'
import { Globe } from '@/components/ui/globe'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return <Globe />
}
