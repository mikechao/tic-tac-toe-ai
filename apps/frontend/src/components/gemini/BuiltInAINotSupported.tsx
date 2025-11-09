import { MyMagicCard, RainbowButton } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MagicCard } from '@/components/ui/magic-card'

export function BuiltInAINotSupported({
  onRetry,
}: {
  onRetry?: () => void
}) {
  return (
    <MyMagicCard className="border border-white/15 bg-white/5 text-white">
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg">Built-in AI not supported</h2>
          <p className="text-sm text-white/80">
            This browser doesn&apos;t expose Gemini Nano. Use Chrome 127+ and enable the Prompt API
            flag at
            <br />
            <code className="mt-1 block rounded bg-white/10 px-2 py-1 text-xs text-white">
              chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
            </code>
            Then download the model from the Models page.
          </p>
          <MagicCard gradientFrom="#4ff2c2" gradientTo="#f15bb5" className="mt-4 rounded-2xl">
            <Card className="border-border/30 bg-black/40 text-white">
              <CardHeader className="border-b border-white/10 pb-3">
                <CardTitle className="text-sm uppercase tracking-[0.3em] text-white/80">
                  Hardware Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 text-xs text-white/80">
                <p>
                  <span className="font-semibold text-white">OS:</span> Windows 10/11, macOS 13+, Linux, or ChromeOS 16389+ on Chromebook
                  Plus. Chrome for Android, iOS, and non-Chromebook Plus devices aren’t supported yet.
                </p>
                <p>
                  <span className="font-semibold text-white">Storage:</span> Keep at least 22&nbsp;GB free on the drive that hosts your
                  Chrome profile so Gemini Nano has room to install (sizes can vary slightly).
                </p>
                <p>
                  <span className="font-semibold text-white">Memory / Compute:</span> Either a GPU with more than 4&nbsp;GB VRAM or a CPU
                  with 16&nbsp;GB RAM and ≥4 cores. Built-in models can run on GPU or CPU.
                </p>
                <p>
                  <span className="font-semibold text-white">Network:</span> Use an unmetered or unlimited connection for the initial download.
                </p>
              </CardContent>
            </Card>
          </MagicCard>
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
