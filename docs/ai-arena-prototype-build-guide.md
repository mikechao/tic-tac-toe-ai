# AI Arena Prototype Build Guide

Practical instructions for constructing the interactive Figma prototypes described in `docs/ai-arena-prototype-plan.md`.

> Note: This assumes the AI Arena wireframes and tokens already exist in the shared Figma library.

## 1. Set Up the Prototype Workspace
1. Duplicate the “AI Arena Wireframes” page and rename it `Prototype – Match Flows`.
2. Create four frames:
   - **Desktop / Match Arena** – 1440 × 1024, 12-col layout (margin 120, gutter 24).
   - **Desktop / Leaderboard** – same dimensions/layout.
   - **Mobile / Match Arena** – 390 × 844 (iPhone 15 Pro), 4-col layout (margin 16, gutter 16).
   - **Mobile / Leaderboard** – same dimensions/layout.
3. Assign each frame a starting point in Figma Prototype panel (flow name prefixes: `D-Match`, `D-Leaderboard`, `M-Match`, `M-Leaderboard`).

## 2. Wire Desktop Match Start Flow
1. Place the existing components:
   - Header: `aurora-text` logo + `marquee` stats bar.
   - Controls: `bento-grid` card set (LLM A, LLM B, Difficulty, Rounds).
   - Board: `magic-card` variant with 3×3 grid.
   - Telemetry: `neon-gradient-card`.
   - Move log: `animated-list`.
2. Create component variants for each interactive module:
   - **Selectors** (`LLMSelect`): states `Idle`, `Hover`, `Open`, `Selected`. Include `Motion=Default` and `Motion=Reduced`.
   - **Round Selector**: segmented control with options `Single`, `Best of 3`, `Best of 5`, `Custom`. Add stepper modal component for `Custom`.
   - **Start Button**: `Idle`, `Hover`, `Pressed`, `In Progress`.
   - **Telemetry card**: `Idle`, `Pre-Launch`, `In Progress`.
3. Duplicate the frame to create a sequence of artboards depicting each state (use suffixes Step 01–07 as listed in the plan).
4. Link transitions:
   - Step 01 → Step 02 via `On Click` on LLM A card (`Smart Animate`, 160 ms, Ease Out).
   - Step 02 → Step 03 same spec.
   - Step 03 → Step 04 triggered by round selector segmented control.
   - Step 04 → Step 05 for summary update (`Smart Animate`, 180 ms).
   - Step 05 → Step 06 via Start button (set to `Change To` variant `Pressed`, then navigate to Step 06 with `After Delay 120 ms`).
   - Step 06 → Step 07 automatically `After Delay 200 ms` to show match in-progress.
5. Add overlay toast component (`Frame: Toast – Match Start`) positioned top-right; attach to Start button interaction with `Open Overlay`, animation `Move In` 220 ms.
6. For reduced-motion path:
   - Duplicate Step 01–07 frames with `RM` suffix.
   - Set prototype interactions to `Instant` or `Dissolve 100 ms`.
   - Connect header toggle to branch into reduced-motion sequence (use On Click + `Change To` on master frame).

## 3. Wire Mobile Match Start Flow
1. Mirror the desktop sequence using bottom dock controls:
   - Configure dock component with `Collapsed` and `Expanded` variants.
   - Step transitions: Idle → Dock Expanded (gesture `Drag Up`), apply `Smart Animate` 220 ms.
   - Stepper uses +/- buttons with `Smart Animate` 160 ms.
2. Ensure board scale animation is toned down (0.98 → 1.0 over 200 ms). In reduced motion, swap for color change only.
3. Add persistent toast as mini banner at top; use `Sticky` option in prototype settings (Figma property).

## 4. Wire Desktop Leaderboard Sorting Flow
1. Reuse Master components:
   - Filters panel `bento-grid`.
   - Leaderboard cards (component with states `Default`, `Highlighted`, `Reduced Motion`).
2. Frame sequence Step 01–05:
   - Step 01: default view.
   - Step 02: segmented control `Most Matches` active.
   - Step 03: transitional reflow (cards mid-motion).
   - Step 04: sorted result.
   - Step 05: reduced motion list.
3. Connect interactions:
   - Step 01 → Step 02: `On Click` on segmented control, `Smart Animate` 140 ms.
   - Step 02 → Step 03: `After Delay 60 ms`.
   - Step 03 → Step 04: `After Delay 280 ms` with `Smart Animate` to show card reordering.
   - Step 02 → Step 05 (via reduced motion toggle).
4. Apply stagger effect by grouping cards into auto layout: set `Smart Animate` with `Match Layers` to maintain identity; optionally use Figma “Delay” property (20–40 ms increments).
5. Overlay `Live Data Toast` component triggered `After Delay 320 ms` once sorted state loads; `Open Overlay` bottom center, `Move In` 200 ms.

## 5. Wire Mobile Leaderboard Sorting Flow
1. Convert leaderboard into horizontal carousel using frame with `Snap` property enabled.
2. Sorting interaction:
   - Step 01: default order.
   - Step 02: segmented control tap.
   - Step 03: `After Delay 100 ms` to show re-ordered carousel (cards repositioned, duplicates hidden).
3. For reduced motion, provide `Show as List` button linking to alternative Step 05 (vertical stack, `Dissolve` 120 ms).

## 6. Apply Annotations
1. Use Figma sticky notes or comments to reference token names (e.g., `Color / Accent / Mint`, `Motion / Expressive`).
2. Mark ARIA announcements on relevant frames with callouts (e.g., Step 04: “aria-live polite: Rounds set to Best of 5”).
3. Include measurement overlays for spacing and component bounds to support development.

## 7. Prototype Checks
1. Preview each flow in Figma (desktop and mobile). Ensure transitions respect durations defined in the plan.
2. Toggle reduced motion using the header switch; confirm branch navigates correctly.
3. Inspect animation performance by viewing with “Mirror” app (optional).
4. Lock flows by setting “Reset scroll position when revisiting” where necessary (move log frame).

## 8. Prepare for Testing
1. Publish a share link with `Can View` access; enable “Open in Presentation view” for testers.
2. Create observation sheet (spreadsheet or FigJam) capturing:
   - Start/End times for each flow.
   - Hesitation notes.
   - Toast visibility feedback.
   - Motion comfort comments.
3. Schedule hallway sessions; have script ready (intro, tasks, follow-up questions).

## 9. Deliverables for Handoff
1. Export GIFs of:
   - Match start activation (desktop & mobile).
   - Leaderboard sorting (default & reduced motion).
2. Run “Prototype Tracer” plugin to generate interaction map; export PDF.
3. Update `docs/ai-tic-tac-toe-design.md` references if interactions differ from spec.
4. Add testing findings (once collected) to a new section in `docs/ai-arena-prototype-plan.md` or dedicated results doc.
