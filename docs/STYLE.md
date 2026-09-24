# Style and engine guide

How the video is built, and the rules every scene follows so that sixteen
scenes written by different hands look like one video. Read this, then
[STORYBOARD.md](STORYBOARD.md) for your scenes.

## The engine

- `video/index.html` + `video/src/main.js` draw the video on one 1920×1080
  canvas, in headless Chromium for rendering, or live in a browser with the
  narration playing.
- **Every frame is a pure function of time.** `draw(F, S)` must not keep
  state between calls (caching a layout object such as a `Code` or `Tree`
  instance in a module variable is fine; anything that depends on `t` is not).
  Frames are rendered out of order by several workers.
- The narration drives the timing. `timing/timeline.json` has every scene's
  span, every paragraph and word, and every `{mark}` from
  `script/narration.md`. Scenes schedule everything relative to marks:
  `S.m("found0")`, `S.m("found0") + 0.4`, `S.word(2, "button")`. Never write
  absolute times: the narration can be re-recorded and every mark moves.
- `truth/truth.json` is what the real lit-html 3.3.3 did with the video's
  examples (captured by `tools/truth.mjs`): the strings arrays, the marker,
  the annotated HTML, the parsed `<template>`, the template parts, every part
  update and DOM commit, the DOM after each render. **Any lit-html data shown
  on screen comes from there or from `kit/lit.js`**, not retyped.

### A scene module

`video/src/scenes/<id>.js`, registered in `scenes/index.js` (already done
for every scene):

```js
import { scene } from "../timing.js";         // (S is passed in; this is for other scenes' marks)
export const transition = "fade";             // "fade" (default): 0.6 s crossfade from the previous scene
                                              // "cut": no crossfade; you must start exactly where the previous scene ended
export function draw(F, S) {
  const { ctx, t } = F;                       // ctx is already scaled to 1920×1080 logical px
  ...
}
```

`S` (from `timing.js`): `S.start`, `S.end`, `S.dur`, `S.m(name)` (throws on an
unknown mark, so typos fail loudly), `S.after(name, dt)`, `S.p(i)` (paragraph
`i`: `{start, end, text, words: [{w, s, e}]}`), `S.word(i, "text", nth)`.

During a crossfade the renderer calls `draw` for up to 0.3 s outside the
scene's span, so `draw` must work for any `t` (clamp; don't throw).

### Rendering and looking at your work

Run inside `nix develop` (from the repo root):

```sh
node tools/render.mjs still 212.5 230 --scale 0.5 --out out/stills/markers   # PNGs
node tools/render.mjs sheet --scene markers --step 1.5 --cols 6              # contact sheet, stamped with times
node tools/render.mjs video --scene markers --fps 30 --scale 0.5             # out/scene-markers.mp4 (with narration)
node tools/render.mjs serve                                                  # live preview on :8123 (seek with ?t=212)
```

Look at stills at the moments that matter: just before and just after each
mark, and mid-motion. A contact sheet at `--step 1` over your scene is the
best overall check. Stills are cheap; render many.

## Visual language

The look is a calm, dark "technical desk": navy background with a faint dot
grid, panels and cards with soft shadows, crisp type, colour used to carry
meaning. Think of a careful conference-talk animation, not a trailer.

### Colour means something

- **The three bindings.** The counter template has three `${}` expressions.
  Binding k and everything that comes from it (its expression, its value,
  its hole, its marker, its template part, its runtime Part, the DOM it
  writes) is drawn in `B[k]` (`kit/theme.js`):
  `B[0]` amber = the `class` attribute, `B[1]` teal = the count (child),
  `B[2]` pink = the click handler (event). This is the video's main device:
  the viewer can follow a hole from the source code to the DOM by colour.
  Don't use these three colours for anything else.
- **Objects** have one colour per kind (`OBJ` in `kit/lit.js`):
  TemplateResult light blue, Template lavender, TemplateInstance sky, the root
  ChildPart made by `render()` near-white, the template cache gold.
- **Syntax** colours (`SYN`, `DOMC`) are deliberately muted so bindings pop.
- `C.accent` (blue) for UI emphasis: focus rings, arrows, the active phase.
  `C.ok` green for "yes / cache hit / done", `C.bad` red for "no / miss",
  used sparingly.
- Comments in DOM views are sage green (`DOMC.comment`), like devtools.
  The two "mystery comments" get the gold ring treatment from `open`
  (`#ffd166`) whenever the narration explains one of them.

### Type

- Inter (`sans(size, weight)`) for words; JetBrains Mono (`mono(size, weight)`)
  for code, values, DOM. Monospace text is drawn with ligatures off (the kit
  does this in `setFont`); always go through the kit's text functions or
  `setFont`, never set `ctx.font` directly for mono text.
- Sizes (`SIZE`): code 30 in focus, 24 in diagrams (never below 20); labels
  24–28; captions 21; titles 58–88. Keep on-screen words few: a label, not a
  sentence. The narration does the explaining.
- Sentence case for labels. No emoji. No exclamation marks.

### Layout

- 1920×1080, margins 60 px. When the phase bar is showing
  (`hudVisible(t) > 0`, see `kit/hud.js`), keep y < 100 clear. It's shown
  from `code.phases` to the end of `code`, and from `root.render` to the end
  of `rerender`.
- One focus at a time. The thing the narration is talking about is bright
  and large; context is dimmed (alpha 0.35–0.5), not removed, when it helps
  orientation.
- Prefer building a composition up over a scene and changing it at clear
  moments, over constant motion.

### Motion

- Moves: 0.5–0.9 s, `ease.inOutCubic`. Fades: 0.3–0.4 s. Appearances that
  should feel like "a new thing": `ease.outBack` scale-in over 0.35–0.45 s.
  Staggers: 0.08–0.15 s.
- Start a motion 0.1–0.2 s before the word it illustrates, so it lands on the
  word. The eye forgives early, not late.
- After a beat, hold still. Idle motion is limited to slow "breathing" on an
  active highlight.
- Things travel along curves (`arrow`, `along` in `kit/draw.js`) when a value
  moves from one object to another: the path explains the data flow.
- Removal: fade and collapse (e.g. an attribute removed from a DOM row fades,
  then the row closes the gap); don't just vanish.

## The kit (`video/src/kit/`)

- `util.js` (in `src/`): `prog(t, a, dur, ease)`, `window(t, a, b)`,
  `pulse(t, a, dur)`, `mix(a, b, u)` (numbers or objects), `ease.*`, `hash`.
- `theme.js`: `C`, `B`, `SYN`, `DOMC`, `SIZE`, `rgba(hex, a)`, `blend`.
- `draw.js`: `text`, `paragraph`, `measure`, `sans`, `mono`, `setFont`,
  `monoAdvance`, `fillRR`, `strokeRR`, `panel`, `chip`, `ring`, `wash`,
  `arrow`, `along`, `check`, `cross`, `withAlpha`, `withScale`, `withGlow`.
- `code.js`: `new Code(src, {size})` with `draw(ctx, x, y, {style})`,
  `rect`, `center`, `find`, `binding(k)`, `bindingRects`, `statics(t)`,
  `ranges`. Tokens know their binding (`tok.bind = {template, index}`), so a
  style function can colour, dim, move (`dx`, `dy`) or hide any token.
- `tree.js`: `new Tree(node, {size, whitespace: "show"|"hide", inline})` for a
  truth.json DOM node; `draw(ctx, x, y, {style, rowStyle})`, `rows`,
  `walk` (the rows lit-html's TreeWalker visits: elements and comments, in
  order, so `walk[i]` is node index i), `rowOf(path)`, `rowRect`,
  `attrRect`. Segment styles can `hide`, fade, recolour, `strike` or
  `collapse` (shrink away) any part of a row, e.g. an attribute.
- `objects.js`: `card` (an object with rows and ports for arrows),
  `measureCard`, `cells` (an array as a row of cells).
- `browser.js`: `browserWindow`, `counterApp`, `cursor`, `devtools`.
- `lit.js`: the domain vocabulary. `COUNTER_SRC`, `LIST_SRC`, `GREETING_SRC`;
  `OBJ` colours; `marker()`; `literalPieces`, `drawPieces`, `stringsArray`,
  `valuesArray`, `counterValues(n)`, `templateResultCard`, `cacheTable`,
  `miniStrings`, `templateParts()`, `templatePartCard`, `partCard`,
  `markerPieces`. Use these for those objects so they look the same in every
  scene.
- `hud.js`: the phase bar, drawn by the renderer (not by scenes).

If you need something the kit doesn't have, write it in your own scene file
(or `scenes/<id>-*.js`). Don't edit shared kit files while other scenes are
being written in parallel; say what you added in your report, and the lead
folds useful pieces into the kit afterwards.

## Accuracy

The audience includes people who wrote lit-html. Everything on screen must
be literally true of lit-html 3.3.3 (`packages/lit-html/src/lit-html.ts` in
[lit/lit](https://github.com/lit/lit), and the capture in truth.json):
names, field names, types, indices, marker text, the order things happen in.
When the video simplifies, it must simplify by leaving things out, never by
saying something false. If you're unsure whether a detail is right, check
the source (a copy is at `/tmp/lit-html.ts`, or `git -C /work/lit show
origin/main:packages/lit-html/src/lit-html.ts`) or leave it out.
