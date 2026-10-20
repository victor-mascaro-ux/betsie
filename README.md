# Betsie — coded prototype

A hi-fi, coded recreation of the [Betsie Figma prototype](https://www.figma.com/design/8MOmXASKMPvxyHsxqQLLAq/Betsie).

Live: **https://victor-mascaro-ux.github.io/betsie/**

Both prototype flows are here, with all 197 reachable screens:

- **iMessage Flow**: Maxine challenges Sylvia from iMessage, Sylvia accepts, they set stakes, and the winner is declared and shared.
- **Complete Betsie Flow**: the standalone app, opening on the Betsie splash, from Start a Bet, friend picker, date picker and decision method through stakes, comments, stickers, Accept, Who Won, the "Nailed it!" celebration, the share sheet, the Instagram story and the Book of Bets.

```bash
npm install
npm run dev        # http://localhost:5181
```

## How it works

Nothing is redrawn by hand. Every Figma layer is rendered as an HTML element at its exact
Figma geometry, with fills, strokes, radii, shadows, blurs, masks, blend modes and styled text
precomputed as CSS. Vector art (icons, illustrations, SF Symbols) is exported by Figma itself as
SVG, so it is pixel-exact. Text stays live text.

The player replays the prototype's own interactions:

- triggers: **On click**, **After delay** (on frames and nested layers) and **On drag**
- transitions: **Smart Animate** (layers matched by name and hierarchy; position, size, opacity,
  colour and radius interpolate; unmatched layers dissolve; changed content cross-fades) and **Dissolve**
- Figma's easing curves, including its spring presets (Gentle, Quick, Bouncy, Slow)

### Motion and microinteractions

`src/motion.ts` layers an app-like motion system on top of the Figma data. The flow and layer
matching stay as designed. One set of curves drives every screen, so Betsie inside iMessage and the
standalone app feel like the same app:

- **Transitions**: every Smart Animate (and Figma's "Instant") plays on one quick spring (~380 ms);
  dissolves take 200 ms.
- **Arrivals**: new bubbles, banners, cards and buttons rise in with a light bounce, so iMessage
  messages slide in as the thread scrolls up.
- **Taps**: every hotspot shrinks and dims while pressed and springs back on release.
- **Splash**: the clover spins in, the wordmark and tagline follow, crowns drop onto the winner.
  Tapping a splash skips it.
- **Pacing**: pressed-state holds flash for 120 ms; iMessage messages land about 3× sooner;
  other waits run at 60% of the Figma delay.
- **Countdowns** tick: the colon blinks like a live timer.

| Path | What |
| --- | --- |
| `src/scene.ts` | Scene types, loading, and the layer → DOM renderer |
| `src/player.ts` | Navigation, triggers, history, prefetching, hotspot hints |
| `src/transitions.ts` | Smart Animate and Dissolve |
| `src/easing.ts` | Figma easing presets, springs sampled into CSS `linear()` |
| `src/motion.ts` | Motion system: timings, arrivals, press feedback, splash intro |
| `public/scene/` | Built scene: one JSON per frame, SVGs, optimised images |
| `figma/` | The pipeline that pulls the design out of Figma (below) |

### Viewer

- Desktop shows the prototype inside an iPhone frame. Phones show the screen edge to edge.
- The sidebar lists the two flows, like Figma's prototype sidebar. The Complete Betsie Flow opens on the splash.
- **R** restarts the flow, **←** goes back. Clicking outside a hotspot flashes the hotspots.
- The URL hash is the current frame (`#307-9951`), so any screen can be linked.
- `?frame=<id>` renders a single frame at 1× with no timers (used for visual diffs).

## Re-syncing from Figma

The Figma connector needs an editor seat, so the pipeline reads the file straight from the
Figma web editor through its Plugin API, read-only:

1. `node figma/receiver.mjs figma/raw` (a localhost endpoint the page posts to)
2. Open the Betsie file on figma.com, open the browser console and run:
   ```js
   (0, eval)(await (await fetch('http://127.0.0.1:47821/extract.js')).text())
   await __bx.graph()
   for (let i = 0; i < 201; i += 5) await __bx.frames(i, 5)
   await __bx.images()
   await __bx.refs(0, 201)   // optional: 1x reference renders for visual diffs
   ```
3. `npm run scene` rebuilds `public/scene` (layer CSS, SVG copies, WebP images sized for 2×).

`figma/raw` is git-ignored. Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/pages.yml`).

## Fidelity notes

- **SF Pro** isn't bundled (Apple's licence doesn't allow redistribution). Apple devices render it
  natively. Elsewhere, Inter stands in, scaled per weight band to SF Pro Text's measured widths.
- **Emoji** use the platform's emoji font.
- **GIF stickers and confetti** animate, as they do in Figma's player.
- Measured against Figma's own 1× exports of all 197 frames, the mean pixel mismatch is under 2%,
  almost all of it text anti-aliasing and the font stand-in.
