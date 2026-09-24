# Storyboard

Scene by scene: what the viewer should understand, what's on screen, and
which narration mark triggers which beat. Narration text and marks are in
[`script/narration.md`](../script/narration.md); times in
`timing/timeline.json` (seconds below are from each scene's start, for
orientation only: always schedule from `S.m(...)`). Style rules:
[STYLE.md](STYLE.md).

The example everywhere is the counter (`COUNTER_SRC` in `kit/lit.js`):

```js
const counter = (count) => html`
  <span class="${count % 2 ? 'odd' : ''}">${count}</span>
  <button @click=${() => render(counter(count + 1), document.body)}>
    Increment
  </button>`;

render(counter(0), document.body);
```

Binding 0 (amber) = the class, binding 1 (teal) = the count, binding 2
(pink) = the click handler.

## The facts (lit-html 3.3.3, all checked against truth.json)

- `strings` = `['\n  <span class="', '">', '</span>\n  <button @click=', '>\n    Increment\n  </button>']`.
  `counter(0).strings === counter(1).strings`.
- `values` of `counter(0)` = `['', 0, () => …]`; of `counter(1)` = `['odd', 1, () => …]` (a new function each call).
- A TemplateResult is `{ _$litType$: 1, strings, values }`.
- `render()` looks for `container._$litPart$`. The first time, it creates a
  `ChildPart` whose start node is a new empty comment (`<!---->`) inserted
  into the container, stores it on the container, and calls
  `part._$setValue(result)`.
- A ChildPart given a TemplateResult looks the template up in
  `templateCache` (a `WeakMap` keyed by the strings array); on a miss it
  constructs a `Template` (prepare) and caches it.
- Prepare: `getTemplateHtml` scans the strings with a few regular expressions
  (states: text, inside a tag, attribute value, comments, raw text) and emits:
  - in text: `<?lit$480592716$>` (a processing instruction, which the HTML
    parser turns into the comment `<!--?lit$480592716$-->`);
  - in an attribute value: the marker `lit$480592716$` as the value, and the
    attribute name gets the suffix `$lit$`; the original names are saved in
    order (`attrNames = ['class', '@click']`) because the parser lowercases names.
  The marker is `lit$` + 9 random digits + `$`, made once when the module loads.
- Annotated HTML (truth `counter.prepare.html`):
  ```
  \n  <span class$lit$="lit$480592716$"><?lit$480592716$></span>\n  <button @click$lit$=lit$480592716$>\n    Increment\n  </button>
  ```
- `template.innerHTML = html`. The parsed content: text `\n  `, `<span class$lit$="lit$480592716$">` containing `<!--?lit$480592716$-->`, text `\n  `, `<button @click$lit$="lit$480592716$">` containing text `\n    Increment\n  `.
- The walk: a TreeWalker with `NodeFilter.SHOW_ELEMENT | SHOW_COMMENT`
  (text nodes are not visited or counted). Node 0 = span, 1 = the comment,
  2 = the button. Bound attributes are removed; the comment stays. It stops
  once it has one part per hole.
- Template parts: `{type: 1 (ATTRIBUTE_PART), index: 0, name: 'class', strings: ['', ''], ctor: AttributePart}`,
  `{type: 2 (CHILD_PART), index: 1}`, `{type: 1, index: 2, name: 'click', strings: ['', ''], ctor: EventPart}`.
  The ctor comes from the name's prefix: `.` PropertyPart, `?` BooleanAttributePart, `@` EventPart, none AttributePart.
- After prepare, the template's HTML is `\n  <span><!--?lit$480592716$--></span>\n  <button>\n    Increment\n  </button>`.
- Create: `new TemplateInstance(template, part)`, `_clone()`:
  `document.importNode(template.el.content, true)`, then the same walk over
  the copy, creating at node 0 an `AttributePart(span, 'class')`, at 1 a
  `ChildPart(startNode: the copied comment, endNode: its nextSibling, null here)`,
  at 2 an `EventPart(button, 'click')`.
- Update (`instance._update(values)`), still on the detached fragment:
  AttributePart: `''` vs last value `nothing` → `setAttribute('class', '')`.
  ChildPart: `0` → creates a text node and inserts it before its end node
  (right after the comment). EventPart: `addEventListener('click', part)`:
  the part itself is the listener (`handleEvent` calls the latest function).
  Then the root part inserts the fragment (after its `<!---->`) and sets its
  `_$committedValue` to the instance.
- Page DOM after the first render: `<!---->` `<span class=""><!--?lit$480592716$-->0</span>` `<button>Increment</button>`.
- Second render, `counter(1)`: same strings → cache hit; root part's
  committed instance has the same template → skip create; update:
  `setAttribute('class', 'odd')`; the text node's `data` becomes `'1'`
  (same node); the EventPart stores the new function, adds/removes nothing.
  Two DOM writes. Rendering `counter(1)` again writes nothing.
- Attribute parts compare primitives with `!==`; a new object or function
  value always counts as a change for them. (So say "strings and numbers"
  when talking about skipping.)

## open (35 s) — done (lead)

Browser with the counter; three clicks; devtools slides in; gold rings on
`<!---->` and `<!--?lit$480592716$-->`; question marks; the title "How
lit-html renders" over the dimmed UI. Ends dim, title centred.

## code (33 s) — lead

The example in a code panel. `fn`: the counter function lights up. `b0`,
`b1`, `b2`: each binding gets its colour wash and a small label (class,
count, click handler). `render`: the last line. `handler`: the handler
binding again, with a short arrow to the render line ("same call, next
number"). `phases`: the phase bar appears (drawn by the HUD); `prepare`,
`create`, `update` light up in turn. `skip`: caption under the code:
"most renders skip the first two".

## literal (62 s)

Purpose: a template is data. `html` just packages strings and values; the
strings array is one object per template literal, reused forever.

- Start: the template literal (lines 2-5 of the example, from `html`` ` to
  the closing backtick) large on screen, from `COUNTER_SRC` via `Code`.
- `tag`: `html` and the two backticks are highlighted; label "tagged
  template literal".
- `split` → `strings` → `values`: the literal comes apart. The static pieces
  (use `code.statics(0)`) fly up into the strings array (`stringsArray`), the
  three `${…}` expressions fly down and become the values array
  (`valuesArray`, `counterValues(0)`), each in its binding's colour. Label
  each row ("strings", "values") on its mark.
- `call`: a small call expression appears, e.g. `html(strings, …values)`.
- `result` / `object`: a `templateResultCard` appears, arrows from its
  `strings` and `values` ports to the two arrays; its rows light in turn as
  they're named (strings, values, `_$litType$: 1` with "1 = HTML").
- `name`: the card's title is emphasised. `nothing`: a quiet caption, e.g.
  "nothing parsed · no DOM touched".
- `again`: `counter(1)` → a second TemplateResult with its own values array
  (`counterValues(1)`: 'odd', 1, () => …) (`newvalues`: highlight).
  `same` / `identical`: its `strings` arrow bends over to the *same* strings
  array; a badge `result0.strings === result1.strings` → `true`.
- `rule`: one strings array per template literal: an arrow from the source
  literal (dimmed) to the array, "made once, reused every run". `key`: a
  key tag on the strings array ("cache key"). `meaning`: "same strings
  array → same template".
- End: two TemplateResults sharing one strings array.

## root (35 s) and lookup (21 s)

Purpose: `render()` keeps one ChildPart per container; that's where every
render starts. Explain the first mystery comment. Then the cache lookup
misses: lit-html touches the template's HTML for the first time now.

root:
- Start: `render(counter(0), document.body)` as code, the TemplateResult
  (compact) at left, a `document.body` box at right (a small DOM view: empty
  at first).
- `render`: the call highlights (the HUD shows the label). `lookup`: a query
  from render to the body: `document.body._$litPart$` → `none`: `undefined`
  (red cross).
- `make`: a `ChildPart` card appears (OBJ.root colour): startNode, endNode
  `null`, `_$committedValue: nothing`. `comment`: an empty comment
  `<!---->` is inserted into the body box and the card's startNode arrow
  points at it. `first`: gold ring on it, label "mystery comment #1".
- `childpart`: what a child part can hold: four small chips (text · nodes ·
  a list · a template). `store`: an arrow `document.body._$litPart$` → the
  part. `hand`: the TemplateResult moves into the part (`_$setValue(result)`).

lookup:
- The `cacheTable` (empty) appears. `ask`: the part queries it with the
  strings array: `templateCache.get(strings)`. `cache`: the table glows;
  "keyed by strings array". `miss`: `undefined`, red cross, "miss".
  `lazy`: caption "first look at this template's HTML". `prepare`: the HUD
  activates PREPARE; the strings array moves to centre stage, ready for
  `markers`.

## markers (100 s)

Purpose: the most interesting part. lit-html doesn't parse HTML itself; it
makes the strings into complete HTML by putting a marker in each hole, and
which marker depends on a tiny lexer's state at the end of each string.

- `goal`: the strings (as cells, or as one run of HTML with three gaps in
  binding colours). `parser`: a box "the browser's HTML parser" (native,
  fast). `holes`: the gaps pulse; the parser refuses the string with holes.
  `fill`: preview of markers dropping into the holes.
- `which`: each hole gets a "?". `scan`: a caret runs along the HTML,
  character by character (fast), with its state above it. `states`: the
  three states named: text · inside a tag · attribute value. `regex`: the
  real regexes' names from lit-html.ts as small print (`textEndRegex`,
  `tagEndRegex`, `doubleQuoteAttrEndRegex`, …); optionally one real regex.
- `h0`: caret at hole 0, state "attribute value". `value`: the marker
  (`lit$480592716$`, amber, `markerPieces`) slides into the value.
  `suffix`: `$lit$` slides onto `class` → `class$lit$`. `why`: short caption
  (easy to find; not a real class). Optional small note: original names are
  kept in order, since the parser lowercases attribute names.
- `h1`: caret at hole 1, state "text". `pi`: `<?lit$480592716$>` slides in
  (teal). `syntax`: label "processing instruction". `bogus`: preview of what
  the parser will make of it: `<!--?lit$480592716$-->`. `short`: `<?…>` vs
  `<!--…-->`: "4 bytes shorter".
- `h2`: caret at hole 2, state "attribute value" (unquoted). `attr`:
  `@click` → `@click$lit$`, marker in (pink).
- `marker`: close-up of the marker: `lit$` · `480592716` · `$`.
  `once`: "random, picked once per page load".
- End: the complete annotated HTML (truth `counter.prepare.html`), shown as
  lines, centred: ready for `parse`.

## parse (27 s), walk (56 s), cache (18.5 s)

Purpose: the browser parses the annotated HTML into an inert template; one
walk turns markers into template parts (numbers: node indices); the result
is cached.

parse:
- Start: the annotated HTML. `template`: a `<template>` element box.
  `inner`: `template.innerHTML = html` (the string flies in). `parsed`: its
  content tree grows row by row (`Tree` of truth `counter.prepare.parsed`,
  `whitespace: "show"`).
- `inert`: the template box goes "inert" (frosted, desaturated). `scripts`,
  `images`, `elements`: three small icons with crosses, labelled.
  `copied`: "only there to be copied".

walk:
- The tree large. `walk`: a walker cursor enters; a counter badge "node 0".
  `skip` / `text`: text rows (the ⏎·· whitespace) flash and dim; the walker
  hops over them. Label: `SHOW_ELEMENT | SHOW_COMMENT`.
- `n0`: cursor on the span, badge 0. `found0`: `class$lit$="lit$…"` glows
  amber; a `templatePartCard` for part 0 emerges into a parts list (right).
  `remove0`: the attribute strikes out and collapses from the row.
- `n1`: the comment, badge 1. `found1`: part card (teal). `keep1`: "stays".
- `n2`: the button, badge 2. `found2`: `@click$lit$` glows pink; part card
  (ctor EventPart). `prefixes`: a small legend: `.prop` PropertyPart,
  `?attr` BooleanAttributePart, `@event` EventPart, `attr` AttributePart.
  `remove2`: removed.
- `done`: "3 holes, 3 parts" with a check. `stop`: cursor leaves.

cache:
- `template`: the cleaned tree + parts list combine into a Template card
  (OBJ.template): `el: <template>`, `parts: [3]`. `stored`: it goes into the
  `cacheTable` under the strings array. `once`: the HUD marks PREPARE done.
  `rule`: "once per template literal, however many renders, however many
  places".

## create (46 s) and update (55 s)

Purpose: the per-location work. Clone once, find the parts once (by index,
never by searching), then update writes values.

create:
- Start: root ChildPart card (`_$committedValue: nothing`), the Template
  (from the cache). `check`: "showing an instance of this template?" `no`:
  red cross. `phase`: HUD CREATE.
- `instance`: a TemplateInstance card (OBJ.instance). `clone`:
  `document.importNode(template.content, true)`: the template's tree
  duplicates; the copy slides out and looks "live". `fast`: caption "native
  copy, no parsing".
- `walk`: the walker runs over the copy with the same counter; `stop`: it
  pauses at 0, 1, 2. `part`: at each, a Part object is created with an arrow
  to its node. `p0` AttributePart (amber) → span; `p1` ChildPart (teal) →
  the comment (startNode; endNode null); `p2` EventPart (pink) → button
  (`partCard`). The instance's `_$parts` fills.
- `never`: "direct references: no searching again".

update:
- `update`: HUD UPDATE. `pairs`: the values array (`counterValues(0)`) lines
  up against the three parts; each value flies to its part in turn.
- `v0`: `''` → AttributePart; `was`: its `_$committedValue` shows
  `nothing`; `change`: `'' !== nothing` → `setAttribute('class', '')`; the
  span row gains `class=""` (amber flash).
- `v1`: `0` → ChildPart; `text`: a text node `"0"` appears right after the
  comment (teal flash).
- `v2`: the handler → EventPart; `add`: `addEventListener('click', part)`;
  `itself`: the listener arrow from the button points back at the part.
  `calls`: "click → part.handleEvent() → latest function".
- `detached`: the fragment is labelled "detached (DocumentFragment)".
  `insert`: its nodes move into `document.body`, after `<!---->`.
  `remember`: the root part's `_$committedValue` → the TemplateInstance.
- `devtools`: a devtools panel (page DOM after render 0,
  truth `counter.render0.body`), gold ring on `<!--?lit$480592716$-->`.
  `explain`: "the template's marker, cloned". `starts`: bracket from the
  comment over the part's content (the text `0`): "child part starts here".

## rerender (54.5 s), nesting (31 s), lists (33 s)

Purpose: the fast path, and then that the same machinery composes.

rerender:
- `click`: the browser's button is clicked (the HUD label changes to
  `render(counter(1), …)`). `again`: new TemplateResult: `strings`: same
  array (check), `values`: new values (`counterValues(1)`).
- `render`: `document.body._$litPart$` → found (check). `hit`: cache lookup
  → hit (green). `inst`: "already showing an instance of this template"
  (check). `skip`: HUD marks prepare and create skipped. `straight`: update.
- `a`: AttributePart: `'odd' !== ''` → `set`: `setAttribute('class','odd')`;
  a "DOM writes: 1" counter; the page's number turns green and underlined.
  `b`: ChildPart `1 !== 0`; `textnode`: no new node (a crossed-out
  `createTextNode`); `data`: `text.data = '1'` on the same node; writes: 2.
  `c`: a new function reaches the EventPart; `keep`: it's stored;
  `listener`: the listener arrow button → part is unchanged.
- `two`: "2 DOM writes". `rest`: every static node dims, "untouched".
  `samevalue`: render `counter(1)` again: each part compares and skips;
  "0 DOM writes".

nesting (`GREETING_SRC`; truth `greeting.*`):
- `nested`: the outer template's ChildPart holding an inner TemplateInstance
  (boxes within boxes). `same`, `lookup`, `create`, `update`: the three steps
  replayed small on the inner part.
- `switch`: `page('Ada')` → a different template (different strings array).
  `clear`: the old content (the Sign in button) is removed; a new instance
  is created. `back`: `page(null)` again: cache hit, no prepare (check);
  `again`: but create runs again (new instance). `directive`: a snippet
  `${cache(greeting(user))}`: "keeps both instances".

lists (`LIST_SRC`; truth `list.*`):
- `arrays`: the `<ul>`'s ChildPart gets an array. `items`: one ChildPart per
  item. `pairs`: each item between two `<!---->` in a devtools view
  (truth `list.render0.bodyHtml`). `more`: gold rings on them: "the rest of
  the empty comments".
- `one`: the `<li>${item}</li>` template: `prep`: one cache entry;
  `three`: three instances.
- `next`: the next render (truth `list.render2`: Apples removed): items
  match by position: each instance's text updates in place, the last item
  is removed. `repeat`: snippet `repeat(items, (item) => item, (item) =>
  html`…`)`: "match by key".

## recap (51 s) and outro (16 s)

recap:
- `stack`: four layers build up, one per mark:
  `l1` one strings array per template literal (JavaScript);
  `l2` templateCache: strings → Template: scan and parse once;
  `l3` ChildPart → TemplateInstance: clone when the template in that spot changes;
  `l4` Part → last value: unchanged strings and numbers never touch the DOM.
- `answer`: the devtools view of the page again (truth `counter.render1.body`).
  `empty`: `<!---->` ringed: "made by render() (and for list items)".
  `lit`: `<!--?lit$480592716$-->` ringed: "the template's marker, copied".
  `starts`: "where a child part starts".

outro:
- `read`: "Life of a lit-html render": `lit/lit` ›
  `dev-docs/design/how-lit-html-works.md`. `source`: `packages/lit-html/src/lit-html.ts`.
  `file`: "one file, well commented". Then small credits: narration by
  Gemini 3.8 Flash TTS; data captured from lit-html 3.3.3; drawn on a canvas.
