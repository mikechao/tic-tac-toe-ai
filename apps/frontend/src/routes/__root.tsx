import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

import appCss from '../styles.css?url'
import { AppHeader } from '@/components/layout/AppHeader'
import { ToastProvider } from '@/components/ui'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'AI Arena' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeadContent />
      <ToastProvider>
        <div className="min-h-screen bg-slate-950 text-white antialiased">
          <AppHeader />
          <div className="pb-16 pt-8">{children}</div>
        </div>
      </ToastProvider>
      <Scripts />
    </>
  )
}
