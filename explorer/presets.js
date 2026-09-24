// The explorer's examples. Each is a module: a view(state) function using
// lit-html, and the states to step through (the explorer calls
// render(view(states[i]), document.body)). Code can also call render() itself,
// e.g. from an event handler; those renders are recorded too.

export const PRESETS = [
  {
    id: 'counter',
    title: 'Counter (the video)',
    teaches: 'The video’s example, exactly: one template with an attribute, a child and an event binding. Prepare and create run once; later renders only update, and write only what changed. Click Increment: the handler calls render() itself.',
    code: `import {html, render} from 'lit-html';

// The counter from "How lit-html renders", exactly.
const counter = (count) => html\`
  <span class="\${count % 2 ? 'odd' : ''}">\${count}</span>
  <button @click=\${() => render(counter(count + 1), document.body)}>
    Increment
  </button>\`;

// The explorer renders view(states[i]) into document.body.
// "Render the same state again" shows an update with no DOM writes.
export const view = counter;
export const states = [0, 1, 2, 3, 4, 5];
`,
  },
  {
    id: 'multi-attr',
    title: 'Two bindings in one attribute',
    teaches: 'Each ${} adds an entry to the strings array, but one attribute is one AttributePart: its strings are the static pieces, and it consumes one value per binding. Any change rewrites the whole attribute; nothing in any binding removes it (a DOM write the debug log has no event for).',
    code: `import {html, nothing} from 'lit-html';

// class="a \${x} b \${y}": one attribute, two bindings, one part.
export const view = ({size, tone}) => html\`
  <p class="note \${size} tone-\${tone}">One attribute, two bindings</p>\`;

export const states = [
  {size: 'small', tone: 'calm'},
  {size: 'large', tone: 'calm'},   // one value changed: setAttribute
  {size: 'large', tone: 'calm'},   // same values: no DOM write
  {size: 'large', tone: nothing},  // nothing: the attribute is removed
];
`,
  },
  {
    id: 'bindings',
    title: 'Property, boolean and event bindings',
    teaches: 'The attribute name’s prefix picks the Part: .value makes a PropertyPart, ?disabled a BooleanAttributePart, @input an EventPart. Type in the box: the handler renders again. The EventPart gets a new function every render but never re-adds its listener.',
    code: `import {html, render} from 'lit-html';

const view = ({name, busy}) => html\`
  <label>Name <input .value=\${name} ?disabled=\${busy}
    @input=\${(e) => rename(e.target.value, busy)}></label>
  <button ?disabled=\${busy || !name}>Save</button>
  <p>Hello, \${name || 'stranger'}</p>\`;

// Typing renders again, from the event handler.
const rename = (name, busy) => render(view({name, busy}), document.body);

export {view};
export const states = [
  {name: 'Ada', busy: false},
  {name: 'Ada', busy: true},
  {name: '', busy: false},
];
`,
  },
  {
    id: 'element-part',
    title: 'Element part (ref)',
    teaches: 'A binding where an attribute name would go is an element part. The scan writes the marker plus the binding’s index as an attribute name; the walk turns it into an ELEMENT_PART. An ElementPart writes nothing itself: it hands the value to its directive, here ref().',
    code: `import {html} from 'lit-html';
import {ref, createRef} from 'lit-html/directives/ref.js';

const input = createRef();

export const view = (hint) => html\`
  <input \${ref(input)} placeholder=\${hint}>
  <button @click=\${() => input.value.focus()}>Focus the input</button>\`;

export const states = ['Type here', 'Or here'];
`,
  },
  {
    id: 'nested',
    title: 'Nested and switching templates',
    teaches: 'A TemplateResult in a child position gets its own Template and TemplateInstance inside the outer instance’s ChildPart. A different template (a different strings array) replaces the instance. Switching back finds the Template in the cache, but still has to create a new instance.',
    code: `import {html} from 'lit-html';

// The greeting example from the video.
const greeting = (user) => user
  ? html\`<p>Welcome back, \${user}!</p>\`
  : html\`<button>Sign in</button>\`;

const page = (user) => html\`<header>\${greeting(user)}</header>\`;

export const view = page;
export const states = [null, 'Ada', 'Grace', null];
`,
  },
  {
    id: 'list-map',
    title: 'A list with map()',
    teaches: 'An array in a child position: one ChildPart per item, each between two empty comments lit-html inserts. Items are matched by position, so removing the first item rewrites every item’s text and removes the last one.',
    code: `import {html} from 'lit-html';

// The list example from the video.
const list = (items) => html\`
  <ul>\${items.map((item) => html\`<li>\${item}</li>\`)}</ul>\`;

export const view = list;
export const states = [
  ['Apples', 'Bread', 'Cheese'],
  ['Apples', 'Bread', 'Cheese', 'Dates'],
  ['Bread', 'Cheese', 'Dates'],
  ['Dates', 'Cheese', 'Bread'],
];
`,
  },
  {
    id: 'list-repeat',
    title: 'A list with repeat()',
    teaches: 'The same list and states with repeat(): items are matched by key. Removing Apples removes its <li> and leaves the other items alone (one of its two comments stays behind: see the page). Reordering moves nodes instead of rewriting text. The directive moves and removes nodes itself; the debug log has no events for that.',
    code: `import {html} from 'lit-html';
import {repeat} from 'lit-html/directives/repeat.js';

const list = (items) => html\`
  <ul>\${repeat(items, (item) => item, (item) => html\`<li>\${item}</li>\`)}</ul>\`;

export const view = list;
export const states = [
  ['Apples', 'Bread', 'Cheese'],
  ['Apples', 'Bread', 'Cheese', 'Dates'],
  ['Bread', 'Cheese', 'Dates'],
  ['Dates', 'Cheese', 'Bread'],
];
`,
  },
  {
    id: 'raw-text',
    title: 'Bindings in raw text (<style>, <textarea>)',
    teaches: 'Inside <script>, <style>, <textarea> and <title> the HTML parser treats markup as text, so a comment marker wouldn’t become a comment. The scan writes a bare marker; the walk splits the text on it and appends empty comments, so each binding becomes a ChildPart. The dev build warns about <textarea>: its value only follows its text until someone edits it.',
    code: `import {html} from 'lit-html';

export const view = ({color, note}) => html\`
  <style>.swatch { padding: 6px 10px; background: \${color}; }</style>
  <div class="swatch">A swatch</div>
  <textarea>\${note}</textarea>\`;

export const states = [
  {color: '#ffb547', note: 'Hello'},
  {color: '#2fd6c9', note: 'Hello again'},
];
`,
  },
  {
    id: 'comment',
    title: 'A binding in an HTML comment',
    teaches: 'In a comment the scan writes a bare marker. The walk finds it in the comment’s text and records a COMMENT_PART, but cloning creates no Part for it: its value is never written, and the marker stays in the comment. Bindings after it still line up.',
    code: `import {html} from 'lit-html';

export const view = (n) => html\`
  <!-- rendered \${n} times -->
  <p>Rendered \${n} times</p>\`;

export const states = [1, 2, 3];
`,
  },
  {
    id: 'svg',
    title: 'svg`` fragments',
    teaches: 'svg`` returns a TemplateResult with _$litType$ 2. Its HTML is wrapped in <svg>…</svg> for parsing, so the parser makes SVG elements, and lit-html removes the wrapper before the walk. The fragments go inside an <svg> element of an html`` template.',
    code: `import {html, svg} from 'lit-html';

const dot = ([x, y], i) =>
  svg\`<circle cx=\${x} cy=\${y} r="7" fill=\${i % 2 ? '#2fd6c9' : '#ffb547'}></circle>\`;

export const view = (points) => html\`
  <svg viewBox="0 0 200 80" width="300" height="120">
    <polyline points=\${points.join(' ')} fill="none" stroke="#8fb5ff"></polyline>
    \${points.map(dot)}
  </svg>\`;

export const states = [
  [[20, 60], [70, 20], [120, 50], [170, 30]],
  [[20, 40], [70, 55], [120, 20], [170, 60]],
];
`,
  },
  {
    id: 'tag-name',
    title: 'Error: a binding in a tag name',
    teaches: 'lit-html can’t bind a tag name. The development build throws as soon as the scan finds <${…} (static templates from lit-html/static.js can do it instead). The render fails before any DOM is created, apart from render()’s marker.',
    code: `import {html} from 'lit-html';

const tag = 'h2';
export const view = (text) => html\`<\${tag}>\${text}</\${tag}>\`;
export const states = ['Hello'];
`,
  },
];

export const presetById = (id) => PRESETS.find((p) => p.id === id);
