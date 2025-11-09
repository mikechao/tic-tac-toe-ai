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
