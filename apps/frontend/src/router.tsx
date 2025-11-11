import { createRouter } from '@tanstack/react-router'

import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import { PreferencesProvider } from './integrations/state/preferences'
import { LiveRegionProvider } from './integrations/a11y'
import { GameLoopProvider } from './integrations/game-loop/context'
import { TransformersJSProvider } from './integrations/transformers/context'
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
          <LiveRegionProvider>
            <TransformersJSProvider>
              <GameLoopProvider>{children}</GameLoopProvider>
            </TransformersJSProvider>
          </LiveRegionProvider>
        </PreferencesProvider>
      </TanstackQuery.Provider>
    ),
  })

  return router
}
