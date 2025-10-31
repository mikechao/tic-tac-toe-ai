# AI Arena Design Document

## Product Framing
- Build a playful-yet-modern web experience where multiple LLMs battle in tic tac toe and their records stay visible.
- Prioritize fast comparison between models, easy match setup, and delightful feedback on outcomes.
- Ship with a responsive layout optimized for desktop first, with tablet/phone support for quick monitoring.

## Goals & Metrics
- Reduce match setup time to under 10 seconds with clear confirmation of the chosen LLM pair.
- Maintain always-visible cumulative records (wins, losses, ties) per model; update within one turn after match end.
- Keep perceived responsiveness high: target sub-200 ms transitions between in-app states.
- Achieve WCAG 2.2 AA compliance across views.
- Encourage repeat play through micro-interactions and celebratory visuals; aim for at least half of sessions initiating a second match.

## Primary Users
- ML engineers comparing model strategies and testing prompts.
- Product managers monitoring AI experiments and communicating outcomes.
- Curious players exploring AI-vs-AI battles.

## Information Architecture
- **Global header**: branding, quick stats, view switcher.
- **Match Arena view (default)**: tic tac toe board, matchup controls, match telemetry.
- **Leaderboard view**: sortable model table, trend highlights, historical insights.

## Layout & Component Map (Magic UI)
- **Header bar**: `aurora-text` for logo wordmark, `marquee` cycling experiment highlights, `shimmer-button` for “Start New Match”.
- **Match Arena shell**: `warp-background` hero container; board inside `magic-card` spotlight; `interactive-grid-pattern` as playful background.
- **Board cells**: 3×3 CSS grid using spacing tokens; winning lines trigger `particles` overlay.
- **Match controls panel**: `bento-grid` to group selectors (LLM A, LLM B, difficulty, round count) and status; provide stepper or segmented control for configuring best-of series; `animated-list` for move log.
- **Live counters**: `number-ticker` for streaks and move timing; `neon-gradient-card` mood card reacting to outcome.
- **Leaderboard cards**: responsive `bento-grid` with each entry in a `magic-card`; `number-ticker` animates totals and win rates.
- **Mobile drawer**: `dock` component to surface primary actions below 768 px viewport width.

## Core Interactions
- **Start match**: choose two models, optional presets, set round count, confirm; shimmer button signals state change; board scales in from idle.
- **Turn broadcast**: current model avatar glows; move appended to animated list; subtle audio cues (muted by default).
- **Match complete**: winning line pulses with gradient, one-time `meteors` burst, counters tick upward, toast offers quick rematch.
- **Leaderboard sorting**: interactive column headers with focus-visible styles; animated resort; persistent filters (time range, model type).

## Visual & Brand Direction
- **Palette**: navy `#0B1026`, surface slate `#161C35`, accent mint `#4FF2C2`, accent magenta `#F15BB5`, warning amber `#FFB547`. Maintain 4.5:1 text contrast minimum.
- **Typography**: `Space Grotesk` for headings, `Inter` for body; scale: 12, 14, 16, 20, 28, 40 px.
- **Iconography**: rounded geometric icons with consistent stroke weight.
- **Design tokens**: spacing base 4 px; radii 8/16/24 px; elevation via translucent layers with 20 px blur; animation durations 120 ms (fast), 240 ms (medium), 420 ms (expressive).
- **Fun twist**: animated backgrounds (`warp-background`, `interactive-grid-pattern`) and dynamic color shifts tied to model performance.

## Accessibility & Inclusivity
- Use semantic regions (`header`, `main`, `nav`) and ARIA labels for the board (`role="grid"`, cells as `gridcell` with descriptive labels).
- Full keyboard support: arrow keys navigate board, `Enter` confirms, `Space` activates buttons; maintain prominent focus rings.
- Offer reduced motion toggle in header to disable parallax, particles, and reduce marquee speed.
- Announce state changes through live regions (e.g., “Gemini wins in five moves”).
- Reinforce outcomes with icons/patterns so color alone never conveys status.

## Responsive Behavior
- **Desktop ≥1280 px**: two-column layout (board left, controls right) with leaderboard grid below or in separate view.
- **Tablet 768–1279 px**: stack board above controls; leaderboard shifts to single-column cards with sticky filters.
- **Mobile ≤767 px**: board occupies full width; controls move to bottom sheet using `dock`; header condenses to icon + overflow menu; leaderboard becomes swipeable carousel.

## Data & State Considerations
- Persist per-model records locally and sync with backend when connectivity allows; show last-sync timestamp in header marquee.
- Support queued matches—display active-match badge in header with quick-switch menu.
- Handle server errors with inline alert card (amber accent) and retry; allow board review even if record update fails.
- Fallback for unknown models: neutral avatar, grey card, message “Awaiting first match”.

## Research & Validation
- Guerrilla usability testing with ML team focusing on match setup (goal: ≤3 misclicks).
- A/B test celebratory effects (`particles` vs `meteors`) for delight without distraction.
- Post-launch analytics: matches per session, model selection frequency, leaderboard sort usage.

## Dev Handoff Notes
- Provide annotated Figma wireframes and component specs with references to design tokens exported via Style Dictionary.
- Document board interaction flow, focus order, and live announcements.
- Specify Magic UI customizations (e.g., gradient overrides for `magic-card`).
- Supply motion guidelines and reduced-motion assets.

## Future Enhancements
- Add analysis mode overlay comparing model reasoning steps.
- Introduce historical timeline chart using `animated-circular-progress-bar`.
- Enable user-vs-LLM matches while keeping leaderboard integrity via separate tab.

## Next Steps
1. Produce annotated desktop and mobile wireframes leveraging the component map.
2. Define design tokens in `tokens.json` and align Tailwind configuration.
3. Coordinate with development to spike Magic UI integration and confirm performance budgets.
