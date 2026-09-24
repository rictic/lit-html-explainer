# Findings from making these

Things we learned about lit-html and the platform while building the videos
and the explorer, checked against lit-html 3.3.3, lit `main` (2026-09-24),
and Chromium 150.

## 1. `repeat` leaves an end marker behind for every removed item

Each item part that `repeat` creates (via `insertPart`) gets its own start
and end marker comments. Since lit/lit#4975 ("Remove some redundant code from
removePart()", April 2025, released in lit-html 3.3.x), `removePart` removes
the part's content and its **start** marker only:

```ts
// packages/lit-html/src/directive-helpers.ts (main and 3.3.3)
export const removePart = (part: ChildPart) => {
  part._$clear();
  part._$startNode.remove();
};
```

so the part's **end** marker (`<!---->`) stays in the DOM. Before #4975,
`removePart` removed everything from the start marker through the end marker.
`insertPart`, which moves an existing part, still treats the range
`[startNode, endNode]` as the part's (it moves both markers), so the two
helpers now disagree.

Repro (lit-html 3.3.3, any browser):

```js
import {html, render} from 'lit-html';
import {repeat} from 'lit-html/directives/repeat.js';

const view = (items) =>
  html`<ul>${repeat(items, (i) => i, (i) => html`<li>${i}</li>`)}</ul>`;
const emptyComments = () =>
  [...document.querySelector('ul').childNodes]
    .filter((n) => n.nodeType === Node.COMMENT_NODE && n.data === '').length;

render(view(['a', 'b', 'c']), document.body);
emptyComments(); // 6: two markers per item
render(view(['a', 'c']), document.body);
emptyComments(); // 5, not 4: b's end marker is left behind
for (let i = 0; i < 10; i++) {
  render(view(['a', 'b', 'c']), document.body);
  render(view(['a', 'c']), document.body);
}
emptyComments(); // 15 for 2 items: one leaked comment per removal
```

Nothing visible breaks (the comments render nothing, and the leftover
markers sit inside the list's own part, so clearing the list removes them),
but a long-lived list with churn (a chat log, a feed) accumulates one comment
node per removed item. The repeat tests likely miss it because assertions
compare `stripExpressionMarkers(container.innerHTML)` (from `@lit-labs/testing`), which removes marker comments before comparing.

Possible fixes, for the team to weigh:
- make `removePart` remove the end marker too when the part owns it (parts
  from `insertPart` always do; the #4975 test's template part has
  `endNode === null`, so `part._$endNode?.remove()` keeps it passing, but a
  template part with content after it must not lose that content, which is
  why an ownership check, or a flag set by `insertPart`, is safer);
- or have `repeat` remove the end marker itself after `removePart`.

The explorer's `repeat` preset shows the leftover comment ("left behind").

## 2. HTML now has processing instructions; lit-html's marker still parses as a comment

The WHATWG HTML parser gained processing instructions on 2026-06-25
("Support processing instructions in HTML", whatwg/html 320c05f) for
declarative partial updates (`<?marker name="…">`, `<?start>…<?end>`,
`<template for>`), and Chrome 150 ships it. In Chromium 150:

| input to `template.innerHTML` | node |
|---|---|
| `<?lit>` | ProcessingInstruction, target `lit` |
| `<?marker name="profile">` | ProcessingInstruction, target `marker` |
| `<?lit$480592716$>` | Comment, data `?lit$480592716$` |

lit-html's marker survives because a PI target may only continue with ASCII
alphanumerics, `-` and `_`: at the `$` the tokenizer hits an
invalid-processing-instruction-target error, converts what it has read to a
comment ("?lit"), and the bogus comment state appends the rest, which is
exactly `markerMatch`. The safety depends on the `$`, so it would be worth a
test (and a comment on `marker`) so nobody "simplifies" the marker to
letters and digits. Episode 1's v1 line "a processing instruction, which HTML
doesn't support" was true when written and is now out of date; the series
site has a corrected episode 1.

## 3. Small things

- `lit-html.ts` on `main` has one more line at the top than the 3.3.3 tag
  (the copyright header), so line links should use the tag.
- The dev build's first text commit makes an empty Text node and then sets
  its `data` (the security hooks' path), so the debug log shows `commit node`
  then `commit text` where the production build does one `createTextNode`.
