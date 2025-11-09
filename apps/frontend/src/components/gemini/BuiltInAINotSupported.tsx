import { MyMagicCard, RainbowButton } from '@/components/ui'

export function BuiltInAINotSupported({
  onRetry,
}: {
  onRetry?: () => void
}) {
  return (
    <MyMagicCard className="border border-amber-400/40 bg-amber-500/10 text-amber-200">
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg">Built-in AI not supported</h2>
          <p className="text-sm text-amber-100/80">
            This browser doesn&apos;t expose Gemini Nano. Use Chrome 127+ and enable the Prompt API
            flag at
            <br />
            <code className="mt-1 block rounded bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
              chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
            </code>
            Then download the model from the Models page.
          </p>
          <div className="mt-3 space-y-1 text-xs text-amber-100/70">
            <p className="text-amber-100/90">Hardware requirements</p>
            <p>
              <span className="font-semibold text-amber-100">OS:</span> Windows 10/11, macOS 13+, Linux, or
              ChromeOS 16389+ on Chromebook Plus. Chrome for Android, iOS, and non-Chromebook Plus
              devices aren’t supported yet.
            </p>
            <p>
              <span className="font-semibold text-amber-100">Storage:</span> Ensure at least 22&nbsp;GB of free space on
              the drive that hosts your Chrome profile (model downloads can slightly vary in size).
            </p>
            <p>
              <span className="font-semibold text-amber-100">Memory / Compute:</span> GPU with &gt;4&nbsp;GB VRAM or CPU with
              16&nbsp;GB RAM and ≥4 cores. Built-in models can run on either GPU or CPU.
            </p>
            <p>
              <span className="font-semibold text-amber-100">Network:</span> Use an unmetered or unlimited connection for the
              initial download.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <RainbowButton
            type="button"
            className="uppercase tracking-[0.2em]"
            onClick={onRetry}
            disabled={!onRetry}
          >
            Recheck support
          </RainbowButton>
        </div>
      </div>
    </MyMagicCard>
  )
}
