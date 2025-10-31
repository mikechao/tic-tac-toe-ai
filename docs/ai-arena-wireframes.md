# AI Arena Wireframes

High-level wireframe annotations aligned with `docs/ai-tic-tac-toe-design.md`. Each diagram references Magic UI components and design tokens for development pairing.

## Desktop — Match Arena View

```
+--------------------------------------------------------------+
| [A] Header                                                   |
+------------------------+-------------------------------------+
|                        |                                     |
| [B] Match Controls     | [C] Board Card                      |
|                        |  +-----------------------------+    |
|                        |  | 3 × 3 grid with hover states|    |
|                        |  +-----------------------------+    |
|                        |                                     |
|                        | [D] Live Match Telemetry            |
+------------------------+-------------------------------------+
| [E] Move Log & Insights                                     |
+--------------------------------------------------------------+
```

### Component Map
- **[A] Header**: `warp-background` container with `aurora-text` logo left, view switcher center, quick stats marquee (`marquee`), `shimmer-button` for “Start New Match”.
- **[B] Match Controls**: `bento-grid` with cards for LLM A selector, LLM B selector, difficulty presets, and round count stepper (best-of configuration using segmented control). Include tooltip icons for explanations.
- **[C] Board Card**: `magic-card` providing spotlight effect, housing 3×3 responsive grid; cells use tokens for spacing and show active outline. Winning state triggers `particles`.
- **[D] Live Match Telemetry**: `neon-gradient-card` displaying active turn, countdown `number-ticker`, and streak badge.
- **[E] Move Log & Insights**: `animated-list` stacked along bottom width; each entry shows model, move coordinate, reasoning snippet toggle.

### Interaction Notes
- Round count selector cycles between “Single”, “Best of 3”, “Best of 5”, and “Custom” (opens numeric input).
- Starting a match froze header button to “Match In Progress” state; board scales in with 120 ms animation.
- Telemetry card pulses when countdown <3 seconds; move log auto-scrolls with accessible pause control.

### Accessibility Callouts
- Header nav items maintain focus order: logo → view tabs → stats → primary call-to-action.
- Match controls grouped with fieldset legends; round count control exposes `aria-live` updates (“Rounds set to Best of 5”).
- Board grid labeled `role="grid"` with arrow-key navigation.

## Desktop — Leaderboard View

```
+--------------------------------------------------------------+
| [A] Header (shared)                                          |
+---------------------+----------------------------------------+
| [F] Filters Panel   | [G] Leaderboard Grid                   |
|                     |  +-----------+ +-----------+           |
|                     |  | Card 1    | | Card 2    |           |
|                     |  +-----------+ +-----------+           |
|                     |  | Card 3    | | Card 4    | ...       |
|                     |  +-----------+ +-----------+           |
|                     |                                            |
+---------------------+----------------------------------------+
| [H] Trend Highlights & Notes                                 |
+--------------------------------------------------------------+
```

### Component Map
- **[F] Filters Panel**: `bento-grid` with time-range picker, model family filter, search input; sticky on scroll with `progressive-blur` indicator.
- **[G] Leaderboard Grid**: Responsive `bento-grid` of `magic-card` entries; each card includes avatar, win/loss/tie counters via `number-ticker`, win-rate meter (ring chart adaptation).
- **[H] Trend Highlights**: `marquee` or `animated-list` showcasing streaks, upset alerts, last sync timestamp.

### Interaction Notes
- Column sorting toggled via segmented control above grid; cards animate into new order.
- Hover reveals “View Matchups” secondary action; keyboard focus presents same action with clear outline.

### Accessibility Callouts
- Filters use proper labels and `aria-describedby` for helper text.
- Leaderboard cards expose ordering via `aria-posinset` to screen readers.
- Trend highlights announced in polite live region when data updates.

## Mobile — Match Arena View

```
+---------------------------------------+
| [A] Header                            |
+---------------------------------------+
| [C] Board Card                        |
+---------------------------------------+
| [B] Match Controls (Dock Drawer)      |
+---------------------------------------+
| [D] Live Telemetry (stacked)          |
+---------------------------------------+
| [E] Move Log (collapsible)            |
+---------------------------------------+
```

### Component Map
- **Header**: Condensed `warp-background` bar with logo icon, overflow menu (`pointer` effect), and primary action collapsed into icon button.
- **Board Card**: Same `magic-card`, full-width, tap-friendly cell spacing.
- **Match Controls**: `dock` bottom sheet triggered by “Configure Match”; includes stacked selectors and round count stepper (vertical layout).
- **Live Telemetry**: `neon-gradient-card` below board; countdown `number-ticker` spans width; streak badge wraps.
- **Move Log**: Collapsible `animated-list`; default collapsed with summary chip.

### Interaction Notes
- Dock supports swipe gestures; round count control uses +/- stepper with min 1, max 9.
- Persistent mini toast shows match status when dock closed.

### Accessibility Callouts
- Dock announces state (“Match configuration expanded”).
- Buttons sized ≥48 px touch target.
- Move log supports voiceover with chronological order preserved.

## Mobile — Leaderboard View

```
+---------------------------------------+
| [A] Header                            |
+---------------------------------------+
| [F] Filters (accordion)               |
+---------------------------------------+
| [G] Leaderboard Carousel              |
+---------------------------------------+
| [H] Highlights Banner                 |
+---------------------------------------+
```

### Component Map
- **Filters**: Accordion using `bento-grid` cards stacked; time range and family filters accessible via segmented controls.
- **Leaderboard Carousel**: `magic-card` entries in horizontal scroll (snap points); `number-ticker` animates when card enters viewport.
- **Highlights Banner**: Inline `marquee` with slower speed for readability.

### Interaction Notes
- Carousel includes pagination dots and `aria-roledescription="carousel"`.
- Long-press on card reveals quick stats modal.

### Accessibility Callouts
- Filters accordion manages focus on open/close.
- Carousel offers alternative “Show as list” link for reduced-motion users.

## Deliverables & Next Actions
- Translate wireframes into Figma frames with layout grids (12-column desktop, 4-column mobile).
- Prepare interaction prototypes for match start, round selection, and leaderboard sorting.
- Capture token references in shared style sheet for developer alignment.
