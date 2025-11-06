import { Wifi } from 'lucide-react'
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner'

const transparentToastClass = 'bg-transparent p-0 shadow-none border-none'

const Toaster = (props: ToasterProps) => (
  <SonnerToaster
    theme="dark"
    toastOptions={{
      className: transparentToastClass,
      style: {
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
      },
      closeButton: false,
    }}
    icons={{
      loading: (
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
          <Wifi className="h-3.5 w-3.5 animate-pulse text-white/60" />
          Syncing…
        </div>
      ),
    }}
    position="bottom-right"
    {...props}
  />
)

export { Toaster }
