# Storyboard, episode 2: What the browser does for Lit

A 7-minute companion to "How lit-html renders". Where episode 1 followed a
template through lit-html, this one looks at the web platform features
underneath, and what each does for Lit. Same engine, kit, visual language and
rules as episode 1: read [STYLE.md](STYLE.md) first (everything there
applies), and skim episode 1's [STORYBOARD.md](STORYBOARD.md) for the facts
about lit-html itself.

- Narration: [`script/platform.md`](../script/platform.md). Timing:
  `timing/platform/timeline.json` (marks as in episode 1).
- Scenes: `video/src/platform/<scene>.js`, registered in
  `video/src/platform/index.js` (already done for every scene).
- Render with `--episode platform` on every `tools/render.mjs` command, e.g.
  `nix develop -c node tools/render.mjs still 120 --episode platform --scale 0.5 --out out/stills/p-parser`,
  `... sheet --episode platform --scene parser --step 1.5`.
- Ground truth for this episode: `truth/platform.json` (from
  `truth/platform.js`, run in Chromium 150 against lit-html 3.3.3 and Lit
  3.3.3), loaded as `platformTruth()` from `timing.js`. Episode 1's
  `truth()` (the counter, the list…) is also available. Show real values
  from these; don't retype them.
- No phase bar in this episode: the full frame is yours.
- Visual continuity with episode 1: the same objects look the same (use
  `kit/lit.js` for TemplateResult, strings arrays, the cache table, parts;
  `kit/tree.js` for DOM; `kit/browser.js` for devtools). New things in this
  episode are platform objects: spec excerpts, browser internals, DOM APIs.
  Give "platform" things a consistent look of their own, e.g. a
  spec-excerpt card (source name, section, quoted text) and an API-call chip
  in mono (`document.importNode(node, true)`), so the viewer can tell "this
  is the browser" from "this is Lit".

## The facts (all checked; see truth/platform.json)

- Sizes, measured from the npm packages (lit 3.3.3):
  | file | minified | gzip -9 | brotli -q 11 |
  |---|---|---|---|
  | lit-html/lit-html.js | 7,309 B | 3,234 B | 2,937 B |
  | + css-tag.js, reactive-element.js, lit-element.js (all of Lit's core, concatenated) | 16,324 B | 6,164 B | 5,576 B |
  Say "about three kilobytes" and "about six"; show the table.
- ECMAScript, GetTemplateObject (ECMA-262 §13.2.8.4, "Template Literals"):
  the realm's [[TemplateMap]] is keyed by the template literal's Parse Node
  ([[Site]]); the template array and its `raw` array are frozen; `raw` is
  non-enumerable. Spec note, verbatim: "Each TemplateLiteral in the program
  code of a realm is associated with a unique template object that is used in
  the evaluation of tagged Templates. The template objects are frozen and the
  same template object is used each time a specific tagged Template is
  evaluated." truth: `sameArray: true`, `otherLiteralSameText: false` (two
  literals with identical text get different arrays), `frozen`, `rawFrozen`,
  `escape` (cooked `a<TAB>b` vs raw `a\tb`).
- lit-html's `trustFromTemplateString(tsa, s)`: throws unless
  `isArray(tsa) && tsa.hasOwnProperty('raw')`; then, if Trusted Types are
  available, passes the static HTML through the `lit-html` policy's
  `createHTML`. truth `spoof`: a result parsed from JSON is rejected with
  "expected template strings to be an array with a 'raw' field".
- Values are never parsed: truth `textValue` shows the string
  `<img src=x onerror=alert(1)>` rendered as a text node (no `<img>` created).
  `unsafeHTML` is the explicit opt-in.
- HTML: a template's contents are a DocumentFragment whose node document is
  the "associated inert template document", created with no browsing context
  (HTML spec). truth `inert`: content's ownerDocument isn't the page and has
  no window; a custom element inside isn't upgraded, and is upgraded after
  `importNode`; a script inside didn't run.
- Processing instructions: the WHATWG HTML spec added them to the parser
  ("Support processing instructions in HTML", 2026-06-25) for declarative
  partial updates / out-of-order streaming (`<?marker name="…">`,
  `<?start>…<?end>`, `<template for="…">`); Chrome 150 ships it. The
  tokenizer: tag open state, `?` → processing instruction open state; the
  target (name) must start with an ASCII letter or `_` and continue with
  ASCII alphanumerics, `-` or `_`; any other character (like `$`) is an
  "invalid-processing-instruction-target" parse error: "Convert the temporary
  buffer to a comment" (a comment whose data is "?" followed by what was read
  so far, e.g. "?lit"), then reconsume in the bogus comment state, which
  appends the rest up to `>`. truth `results`: `<?lit$480592716$>` → Comment
  `?lit$480592716$`; `<?lit>` → ProcessingInstruction target "lit";
  `<?marker name="profile">` → ProcessingInstruction.
- `document.importNode(node, true)`: clones node and its subtree with the
  page's document as node document. lit-html: `(options?.creationScope ?? d).importNode(content, true)`.
- TreeWalker: lit-html creates one at module load:
  `d.createTreeWalker(d, 129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */)`, and
  moves it with `walker.currentNode = …`. `NodeFilter.SHOW_ELEMENT` = 1
  (bit 0), `SHOW_COMMENT` = 128 (bit 7), `SHOW_TEXT` = 4,
  `SHOW_PROCESSING_INSTRUCTION` = 64.
- ChildPart content sits after its start marker; inserts are
  `parentNode.insertBefore(node, this._$endNode)`.
- Events: `addEventListener(type, listener, options)`; `listener` may be an
  object with `handleEvent` (DOM spec, EventListener). lit-html's EventPart
  calls `this.element.addEventListener(this.name, this, newListener)`:
  itself as the listener, your function or object as the options (capture,
  once, passive read from it); `handleEvent` calls the current
  `_$committedValue`. truth `events`: three renders with three new arrow
  functions → 1 `addEventListener` call; a click runs the third function;
  `{handleEvent, once: true}` clicked twice → called once.
- Custom elements: `customElements.define(name, class)`; lifecycle
  callbacks `connectedCallback`, `disconnectedCallback`,
  `attributeChangedCallback` (for `static observedAttributes`).
  ReactiveElement derives `observedAttributes` from declared properties
  (truth: `["a","b","c"]`).
- Shadow DOM: `createRenderRoot()` → `this.attachShadow(shadowRootOptions)`
  (open by default; truth `shadowMode: "open"`), then `adoptStyles`.
- Constructable stylesheets: `css`…`` → CSSResult; its `styleSheet` getter
  makes `new CSSStyleSheet()` + `replaceSync(cssText)` once, and
  `renderRoot.adoptedStyleSheets = [...]`. truth: two instances share the same
  CSSStyleSheet object; no `<style>` elements in the shadow root. A css
  literal with no expressions is cached in `cssTagCache`, a WeakMap keyed by
  the strings array (truth `cssCache.sameSheet: true` across two CSSResults).
- Batching: property setter → `requestUpdate()` (records the change in
  `_$changedProperties`; if `!isUpdatePending`, `__updatePromise =
  __enqueueUpdate()`); `__enqueueUpdate` sets `isUpdatePending = true` and
  `await this.__updatePromise` ("This `await` also ensures that property
  changes are batched.") then `scheduleUpdate()` → `performUpdate()` →
  `update()` → `render()`. `updateComplete` is that promise. truth
  `batching`: 3 sets → pending, 0 renders before the microtask, 1 after.
- Microtasks run at the end of the current task (the microtask checkpoint),
  before the browser's next rendering step.

## Scenes

### intro (30 s)
Callback to episode 1: a compact strip of its pipeline (template literal →
prepare → create → update), and on `recap` the browser's share lights up:
`parse` (the parser), `clone` (importNode), `walk` (TreeWalker), each a
chip marked "the browser". `size`: the sizes table (numbers above), lit-html's
row first, then on `lit` the rest of Lit's core. `tour`: the title card:
"What the browser does for Lit" (same title treatment as episode 1's title,
kit colours), held through the pause; the music plays under it.

### tagged (70 s)
- `js` / `engine`: the counter's template literal (episode 1's
  `COUNTER_SRC`) → the engine's parse: statics vs expressions (reuse the
  episode 1 split look, quickly).
- `spec`: a spec card: ECMA-262, GetTemplateObject, with the note quoted.
  `once`: one literal → one array; `frozen`: a lock on it; `same`: two calls,
  one array (truth `sameArray`), and a note that a second literal with the
  same text gets its own (truth `otherLiteralSameText: false`).
- `key`: the array becomes the template cache key (kit `cacheTable`).
  `nobuild` / `already`: "no build step", with a crossed-out compiler/bundler step.
- `raw`: the `raw` property: cooked vs raw strings (truth `escape`), non-enumerable.
  `trust`: `trustFromTemplateString`'s check as code (from cache/lit-html.ts).
  `json`: a JSON payload `{"_$litType$":1,"strings":[…]}` bounces off with the
  real error message (truth `spoof.message`).
- `values` / `text` / `attrs`: the markup-looking string becomes a text node
  (truth `textValue`); an attribute value goes through `setAttribute`.
  `safe`: "unless you opt in: `unsafeHTML`".

### parser (82 s): the centerpiece
- `html` … `native` / `irregular`: the one HTML string → `template.innerHTML`
  → the browser's parser (native), with a few irregular-HTML examples it
  handles (unquoted attributes, optional end tags), briefly.
- `inert` / `document`: the template and its contents in a separate,
  inert document ("no browsing context"); `scripts`, `images`, `elements`:
  the three facts, from truth `inert` (the custom element upgrades only
  after importNode).
- `markers` / `comment`: the `<?` → comment history: the old tokenizer
  (tag open state, `?` → bogus comment).
- `news`: the new spec: processing instructions in HTML, for streaming into
  place: show `<?marker name="profile">` and `<template for="profile">`
  (truth: `<?marker …>` → ProcessingInstruction). `pi`: "in the spec and in
  Chrome".
- `still` → `exact`: the tokenizer walking `<?lit$480592716$>` character by
  character: `<` tag open → `?` PI open → `l`,`i`,`t` into the target buffer
  → `$`: invalid target (the allowed characters shown as a small legend on
  `dollar`) → "convert the temporary buffer to a comment": `?lit` → bogus
  comment state appends `$480592716$` → `<!--?lit$480592716$-->`, with the
  gold ring from episode 1 (it's the mystery comment again). `exact`:
  `data === '?' + marker` (lit-html's `markerMatch`).

### clone (54 s)
- `import` … `owned`: `document.importNode(template.content, true)` as an API
  chip; the template's tree copies across a document boundary (inert doc →
  page doc); "no parsing".
- `walker` … `skips`: one TreeWalker, created at module load (code line
  from lit-html.ts); `bits`: a row of NodeFilter bits with bit 0 (elements,
  1) and bit 7 (comments, 128) lit, = 129; the walker hopping over text nodes
  in a tree (episode 1's counter template tree with whitespace shown).
- `anchors` … `insert`: comments as anchors: a ChildPart's start comment and
  `insertBefore(node, endNode)` adding content after it.

### events (38 s)
- `listener` … `handle`: `addEventListener(type, listener, options)` with
  `listener` = any object with `handleEvent`.
- `part` / `calls` / `free`: `addEventListener('click', part, fn)`; three
  renders with new functions, one registration (truth `events`); a click →
  `part.handleEvent()` → the current function ("third").
- `options` … `props`: the same function or object as the options argument:
  `@click=${{handleEvent: …, once: true}}` → two clicks, one call (truth).

### components (64 s)
- `lit` / `adds` / `platform`: Lit = ReactiveElement + lit-html; the
  component layer is platform too.
- `custom` … `reactive`: `customElements.define('x-counter', XCounter)`; the
  browser's lifecycle callbacks; ReactiveElement's `observedAttributes`
  (truth).
- `shadow` … `norewrite`: the element with its shadow root (open); scoped
  DOM and styles; a `<slot>`; "no class-name rewriting".
- `sheets` … `cachekey`: many instances pointing at one CSSStyleSheet via
  `adoptedStyleSheets` (truth `sharedSheet`, `styleElements: 0`); `thousand`:
  a crowd of instances, one sheet; `sametrick`/`cachekey`: `cssTagCache`, a
  WeakMap keyed by the strings array (echo the template cache).

### batching (40 s)
- `timing` / `three` / `once`: `el.a = 1; el.b = 2; el.c = 3;` → renders: 1
  (truth).
- `request` … `then`: each set → `requestUpdate()` → `_$changedProperties`
  fills; the first starts `__enqueueUpdate()`, whose `await` parks it; the
  rest of the synchronous code runs; then one render.
- `microtask` … `half`: the event loop: task → microtask checkpoint →
  rendering; the update lands before paint. `complete`: `await
  el.updateComplete` (resolves true).

### recap (44 s) and outro (12 s)
- `all`, `r1`…`r7`: a table (or stack) of feature → what it does for Lit,
  one row per mark, each with its small icon from the scenes.
- `glue` / `why` / `fast`: Lit as the thin glue layer between the platform
  features (a closing diagram).
- outro: link cards: the lit-html explorer (/explorer/), MDN/spec links for
  each feature (ECMA-262 GetTemplateObject; HTML template element; DOM
  importNode, TreeWalker, EventListener; custom elements; shadow DOM;
  adoptedStyleSheets; HTML processing instructions); credits; fade.
