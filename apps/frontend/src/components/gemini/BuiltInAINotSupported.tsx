import { ClipboardCopy, ExternalLink } from 'lucide-react'

import { MyMagicCard, RainbowButton, useToast } from '@/components/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MagicCard } from '@/components/ui/magic-card'

export function BuiltInAINotSupported({
  onRetry,
}: {
  onRetry?: () => void
}) {
  const { showToast } = useToast()
  return (
    <MyMagicCard className="border border-white/15 bg-white/5 text-white">
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg">Browser Built-in AI not supported</h2>
          <div className="space-y-2 text-sm text-white/80">
            <p>Enable Browser Built-in AI in 2 steps:</p>
            <ol className="list-decimal ml-4">
              <li>Check the hardware requirements</li>
              <li>Enable the Prompt API flag</li>
            </ol>
            <p>
              Learn more about{' '}
              <a
                href="https://developer.chrome.com/docs/ai/built-in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 hover:underline"
                >
                Built-in AI on Chrome Developers
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </p>
          </div>
          <MagicCard gradientFrom="#4ff2c2" gradientTo="#f15bb5" className="mt-4 rounded-2xl">
            <Card className="border-border/30 bg-black/40 text-white">
              <CardHeader className="border-b border-white/10 pb-3">
                <CardTitle className="text-sm uppercase tracking-[0.3em] text-white/80">
                  Hardware Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 text-sm text-white/80">
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
              <CardFooter>
                Gemini Nano's exact size may vary as the browser updates the model. To determine the current size, visit chrome://on-device-internals.
              </CardFooter>
            </Card>
          </MagicCard>
          <MagicCard gradientFrom="#4ff2c2" gradientTo="#f15bb5" className="mt-4 rounded-2xl">
            <Card className="border-border/30 bg-black/40 text-white">
              <CardHeader className="border-b border-white/10 pb-3">
                <CardTitle className="text-sm uppercase tracking-[0.3em] text-white/80">
                  Enable the Prompt API flag
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 text-sm text-white/80">
                <p className="flex items-center gap-2  text-white">
                  To enable this experimental feature, open the following link in a new tab and set it to{" "}
                  <span className="font-medium text-foreground">Enabled</span>
                </p>
                <p className="flex items-center gap-2  text-white">
                  <code className="rounded bg-white/10 px-2 py-1">
                    chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
                  </code>
                  <button
                    type="button"
                    aria-label="Copy Chrome flag"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input',
                      )
                      showToast({ title: 'Copied!', description: 'Flag path copied to clipboard.' })
                    }}
                    className="cursor-pointer text-white/70 transition hover:text-white"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                  </button>
                </p>
              </CardContent>
              <CardFooter>
                ⚠️ Chrome internal pages can’t be opened directly from websites.
        Please paste this link manually into your address bar.
              </CardFooter>
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
