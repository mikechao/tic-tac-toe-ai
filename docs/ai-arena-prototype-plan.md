# AI Arena Prototype Plan

Prototype coverage for two critical flows: **Match Start (multi-round configuration)** and **Leaderboard Sorting**. Implement in Figma using existing wireframes and Magic UI component references. Goal is to validate interaction timing, perceived responsiveness, and clarity before development.

## Objectives & Success Metrics
- Confirm users complete match setup (model selection + round count) in ≤7 seconds on desktop, ≤10 seconds on mobile, with ≤1 hesitation event (measured by pointer idle >1.5 s).
- Ensure confirmation feedback after tapping “Start Match” appears within 200 ms; board activation animation completes ≤420 ms.
- Validate leaderboard sort transition clarity: at least 80% of test observers correctly identify sort order change without prompt; animation duration ≤360 ms.
- Capture qualitative reactions to celebratory effects and detect motion sensitivity; collect toggled reduced-motion rates.

## Prototype Scope
- Desktop and mobile frames for Match Arena and Leaderboard views.
- Interactive hotspots: model selectors, round count stepper, start button, match in-progress state, sort controls, card resort animation.
- Include reduced-motion variant paths (no parallax, simplified transitions).

## Flow 1: Match Start Prototype

### Frame Sequence
1. **Idle State** (Match Arena default) – controls neutral, start button active.
2. **Model A Selection** – dropdown/combobox open (`bento-grid` card expands).
3. **Model B Selection** – second card expanded.
4. **Round Count Adjustment** – segmented control toggled to “Best of 5”; custom input variant accessible via modal.
5. **Pre-Launch Summary** – telemetry card updates next-match preview.
6. **Activation Transition** – rainbow button press → board scale-in + glow.
7. **Match In Progress** – controls locked, countdown running.

### Interaction Specs
- **Selectors**: Use Figma component variants with `While Hovering` highlight (80 ms) and `On Click` → `Change To` selection state.
- **Round Count**: Stepper increments animate with `Smart Animate`, easing `Ease Out` 160 ms; segmented control toggles with `Spring` (damping 26, stiffness 320).
- **Start Button**: Trigger `On Click` → `Change To` “In Progress” variant; overlay confirmation toast slides in from top (move 24 px, 220 ms).
- **Board Activation**: `Auto Layout` board card scales from 0.96 to 1.0 (Ease Out 200 ms); winning path placeholder set to invisible for later states.
- **Countdown**: `number-ticker` imitation via rapid text change (Smart Animate 120 ms per tick).
- **Reduced Motion Path**: Duplicate flow with `Instant` transitions and color-only feedback; accessible via header toggle.

### Annotation Notes
- Mark each frame with labels referencing design tokens (spacing, color) for developer alignment.
- Include overlay note for ARIA announcements triggered at steps 4 (“Rounds set to Best of 5”) and 6 (“Match starting; Gemini vs GPT-4o”).

### Validation Checklist
- Observe time to select two models and confirm rounds across 5 participants.
- Record whether confirmation toast was noticed (yes/no).
- Collect feedback on clarity of multi-round setting; note confusion over terminology (“best of” vs “rounds”).

## Flow 2: Leaderboard Sorting Prototype

### Frame Sequence
1. **Default Leaderboard** – sorted by win rate descending.
2. **Sort Menu Interaction** – segmented control highlight on “Most Matches”.
3. **Transition State** – cards animate to new order; placeholder for reflow.
4. **Sorted Result** – cards settled; top card detail expands slightly.
5. **Reduced Motion Variant** – fade-only reorder.

### Interaction Specs
- **Segmented Control**: `On Click` → `Smart Animate` 140 ms, ease `Ease Out`. Focus state border persists for keyboard navigation.
- **Card Resort**: Use `Move In` animation for each card with 60 ms stagger; total reorder ≤320 ms. Provide alternative `Fade` animation for reduced motion path.
- **Highlight Pulse**: Winning card uses `neon-gradient-card` accent, shimmering border (opacity oscillate 0.6–1.0 in 480 ms loop).
- **Live Data Toast**: Optional overlay triggered after sort, sliding from bottom 16 px upward; 200 ms in/out.

### Annotation Notes
- Document `aria-live` behaviour: polite announcement “Leaderboard sorted by Most Matches.”
- Note requirement for accessible reorder description (cards update `aria-posinset`).
- Indicate performance considerations: limit simultaneous animations to ≤6 elements in view to maintain 60 fps.

### Validation Checklist
- Watch for user comprehension of new sort order – ask them to state top-three models post sort.
- Measure recognition time for animation (time from click to user verbally acknowledging change).
- Collect motion-sensitivity feedback; ensure reduced-motion toggle easy to find.

## Prototyping Setup
- **Figma file**: Duplicate “AI Arena Wireframes” page; create “Prototype – Flows” page with variant components.
- **Libraries**: Link Magic UI design kit; sync tokens via Figma Variables (`Color`, `Spacing`, `Radiuses`, `Motion`).
- **Component Variants**: Implement `State=Idle|Hover|Active|Disabled` for selectors and buttons; `Motion=Default|Reduced`.
- **Interactions**: Use Figma “Prototype” panel; set starting points for desktop and mobile flows separately.
- **Device Frames**: Desktop 1440 px width; mobile iPhone 15 Pro template (Magic UI device mock optional).

## Testing Protocol
- Conduct hallway tests with at least 3 internal users per flow.
- Record sessions (screen + audio) to capture hesitation and comments.
- Log timings: use manual stopwatch or Figma’s built-in playback timestamp.
- After each session, ask SUS-style quick rating on interaction clarity.
- Iterate prototypes based on findings; document changes in version history.

## Handoff Notes
- Export interaction map (Figma plugin “Prototype Tracer”) and share in design review doc.
- Provide GIF captures (≤5 MB) for key transitions to engineering.
- Update `docs/ai-tic-tac-toe-design.md` if prototype insights necessitate spec changes.
