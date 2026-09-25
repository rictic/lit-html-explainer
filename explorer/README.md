# lit-html explorer

Write a lit-html template and watch the real lit-html (3.3.3, development
build) process it: the TemplateResult, prepare (the marker scan, the annotated
HTML, the parsed `<template>`, the template parts), create (TemplateInstances
and their Parts), update (every part update and DOM write, in order), and the
page's DOM. A companion to the video "How lit-html renders"; same palette,
fonts and binding colours (docs/STYLE.md).

No build step: modern JS modules, Lit for the UI, loaded through import maps
from `./vendor/` (the `site` flake output copies the npm packages there;
`node tools/render.mjs serve` serves them from `$LIT_VENDOR`).

## Two lit-htmls, two documents

- **The UI** (`index.html`, `app.js`, …) uses Lit's production build.
- **The explored code** runs in an iframe, `frame.html`, with lit-html's
  **development** build and `globalThis.emitLitDebugLogEvents = true`. Its
  `document.body` is the render container. The iframe has its own module map,
  so its lit-html instance, template cache, marker and `lit-debug` events are
  separate from the UI's. **Run** makes a new iframe, so every run starts with
  an empty template cache.
- In the frame, `lit-html` and `lit` resolve to `frame-lit-html.js`: the
  development build re-exported unchanged, except that `html`, `svg`, `mathml`
  and `render` are wrapped (they call straight through) so the explorer sees
  every TemplateResult and every `render()` call, including ones from event
  handlers in the page. `lit-html/…` (directives etc.) is the development
  build itself.
- lit-html makes its marker from `Math.random()` when it loads. Like the
  video's capture (`truth/page.js`), the frame fixes `Math.random` while
  lit-html loads, so the marker is `lit$480592716$`. `?marker=random` turns
  that off.

## Where the data comes from

Everything shown about lit-html comes from the running development build
(`frame.js` turns it into plain-data records, one per render):

- the `lit-debug` events: `begin render`, `template prep`, `template
  instantiated`, `template instantiated and updated`, `template updating`,
  `set part` and the `commit …` events;
- the objects they carry (Template, TemplateInstance, the Parts, their
  `_$committedValue`s), `_$LH` (`_marker`, `_getTemplateHtml`, the Part
  classes), and the TemplateResult objects `html` returned;
- the DOM: the prepared template's content (`clonableTemplate`), each
  instance's cloned fragment, and `document.body` after each render, walked
  with a TreeWalker using lit-html's filter (129) for the node indices;
- a MutationObserver on the frame's document and on each instance's fragment.
  It attaches each DOM change to the commit event that made it, and shows the
  DOM operations lit-html makes **without** a debug event: `render()`'s first
  `<!---->`, the two markers per list item, `_$clear()` removals (list
  truncation, replacing content), `removeAttribute` when an attribute part
  commits `nothing`, and directives' own work (`repeat` moving and removing
  nodes). These are labelled "dom" in the Update view.
- One patch: `ChildPart.prototype._$setValue` is wrapped (it still runs
  unchanged) to know where each ChildPart's work starts and ends. List items
  and the root part have no `set part` event, and a `template updating`
  instance has no end event, so without it the Update view couldn't nest
  those correctly.

"DOM writes" counts the DOM operations lit-html performed: one per commit
event (an event-listener commit counts its add and remove calls, so a
listener swap counts 0; an element-part commit counts 0), plus one per DOM
operation that has no debug event. A part that was set and committed nothing
is "skipped".

**The one reimplementation** is `scan.js`, a replay of `getTemplateHtml`'s
scan (ported from `video/src/scenes/markers-scan.js`) that records the lexer
state at every regex match, for the scan view and its ▶ caret. For every
prepared template, `frame.js` compares the replay's HTML and `attrNames` with
lit-html's own `_$LH._getTemplateHtml(strings, type)`; the Template card
shows "replay = lit-html ✓", or a warning if they differ. The annotated HTML
shown is always lit-html's own output. (When prepare throws, e.g. for a
binding in a tag name, there is no lit-html output to compare with; the card
says so.)

Links to `lit-html.ts` point at the tag `lit-html@3.3.3`; `source.js` keeps
each line number with the text expected on that line, so they can be checked:

```sh
git -C <lit checkout> show lit-html@3.3.3:packages/lit-html/src/lit-html.ts > /tmp/lit-html.ts
# then compare LINES in source.js against it
```

## Files

- `index.html`, `app.js`: the page, layout, controls, history, the live page.
- `editor.js`: the code editor (a textarea over a highlighted copy; `${…}` in
  binding colours, numbered per template like `values`).
- `pipeline.js`: the five stages for one render. `scan-view.js`: the scan and
  its player. `tree.js`: DOM trees, devtools style. `values.js`: shared
  renderers. `theme.js`: palette. `source.js`: links into lit-html.ts.
- `frame.html`, `frame.js`, `frame-lit-html.js`: the explored page and the
  capture. `scan.js`: the scan replay.
- `presets.js`: the examples.

## Examples and URL

Each example is a module exporting `view(state)` and `states`; the explorer
calls `render(view(states[i]), document.body)`. Code may also call `render()`
itself (the counter's button does); those renders go in the history too.
`?preset=<id>&step=<n>` loads an example and renders its first n states
(`step=0`: none), for repeatable screenshots.

Examples: `counter` (the video's), `multi-attr`, `bindings` (`.prop`,
`?bool`, `@event`), `element-part` (`ref`), `nested` (the video's greeting),
`list-map`, `list-repeat`, `raw-text` (`<style>`, `<textarea>`), `comment`,
`svg`, `tag-name` (the dev-mode error).
