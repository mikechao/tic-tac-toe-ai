import { createRouter } from '@tanstack/react-router'

import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import { PreferencesProvider } from './integrations/state/preferences'
import { LiveRegionProvider } from './integrations/a11y'
import { routeTree } from './routeTree.gen.ts'

export const getRouter = () => {
  const { queryClient } = TanstackQuery.getContext()

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    Wrap: ({ children }: { children: React.ReactNode }) => (
      <TanstackQuery.Provider queryClient={queryClient}>
        <PreferencesProvider>
          <LiveRegionProvider>{children}</LiveRegionProvider>
        </PreferencesProvider>
      </TanstackQuery.Provider>
    ),
  })

  return router
}
