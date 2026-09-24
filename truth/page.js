// Runs the video's example templates through the real lit-html (the
// development build, with debug log events on) and reports what happened:
// the strings and values, the marker-annotated HTML, the parsed <template>,
// the template parts, every part update and DOM commit, and the DOM after
// each render. tools/truth.mjs saves the report as truth/truth.json, and the
// video draws its data structures from that file.

globalThis.emitLitDebugLogEvents = true;

// Fix the page's marker, so every capture (and the video) shows the same
// one: lit-html builds it from Math.random() once, when the module loads.
const random = Math.random;
Math.random = () => 0.480592716;
const lit = await import("/lit-html/development/lit-html.js");
Math.random = random;
const { html, render, _$LH } = lit;

const ctorName = (p) => p?.constructor?.name ?? String(p);

// A DOM node as plain data.
function node(n) {
  if (n == null) return null;
  switch (n.nodeType) {
    case 1:
      return {
        type: "element",
        name: n.localName,
        attrs: [...n.attributes].map((a) => [a.name, a.value]),
        children: [...n.childNodes].map(node),
      };
    case 3:
      return { type: "text", data: n.data };
    case 8:
      return { type: "comment", data: n.data };
    case 11:
      return { type: "fragment", children: [...n.childNodes].map(node) };
    default:
      return { type: `node${n.nodeType}` };
  }
}

// Where a node is, as a path of child indices from `root`.
function path(root, n) {
  const p = [];
  while (n && n !== root) {
    p.unshift([...n.parentNode.childNodes].indexOf(n));
    n = n.parentNode;
  }
  return n === root ? p : null;
}

function value(v) {
  if (typeof v === "function") return { fn: v.toString() };
  if (typeof v === "symbol") return { symbol: v.description };
  if (v && typeof v === "object") {
    if ("_$litType$" in v) return { templateResult: true, strings: [...v.strings], values: v.values.map(value) };
    if (Array.isArray(v)) return { array: v.map(value) };
    if (v.nodeType) return { node: node(v) };
    return { object: String(v) };
  }
  return v;
}

// The parts of a TemplateInstance, and the nodes they hold.
function parts(instance, root) {
  return instance._$parts.map((p) => ({
    ctor: ctorName(p),
    name: p.name,
    strings: p.strings ? [...p.strings] : undefined,
    element: p.element ? path(root, p.element) : undefined,
    startNode: p._$startNode ? path(root, p._$startNode) : undefined,
    endNode: p._$endNode ? path(root, p._$endNode) : p._$startNode ? null : undefined,
  }));
}

let events = [];
addEventListener("lit-debug", ({ detail: e }) => {
  const out = { kind: e.kind };
  switch (e.kind) {
    case "begin render":
    case "end render":
      out.id = e.id;
      break;
    case "template prep":
      out.strings = [...e.strings];
      out.templateHtml = e.clonableTemplate.innerHTML;
      out.parts = e.parts.map((p) => ({
        type: p.type, index: p.index, name: p.name,
        strings: p.strings ? [...p.strings] : undefined,
        ctor: p.ctor?.name,
      }));
      break;
    case "template instantiated":
      out.parts = e.instance._$parts.map(ctorName);
      out.fragment = node(e.fragment);
      out.values = e.values.map(value);
      break;
    case "template instantiated and updated":
      out.fragment = node(e.fragment);
      break;
    case "template updating":
      out.values = e.values.map(value);
      out.parts = e.parts.map(ctorName);
      break;
    case "set part":
      out.part = ctorName(e.part);
      out.valueIndex = e.valueIndex;
      out.value = value(e.value);
      break;
    case "commit attribute":
    case "commit property":
      out.element = e.element.localName;
      out.name = e.name;
      out.value = value(e.value);
      break;
    case "commit event listener":
      out.element = e.element.localName;
      out.name = e.name;
      out.value = value(e.value);
      out.addListener = e.addListener;
      out.removeListener = e.removeListener;
      break;
    case "commit text":
      out.value = value(e.value);
      break;
    case "commit node":
      out.value = node(e.value);
      break;
    case "commit nothing to child":
      break;
    default:
      out.other = true;
  }
  events.push(out);
});

// A clean body to render into (dropping the root part lit-html keeps on it).
function fresh() {
  document.body.replaceChildren();
  delete document.body._$litPart$;
}

function take() {
  const e = events;
  events = [];
  return e;
}

// Everything lit-html's prepare phase computes for one TemplateResult,
// recomputed step by step with lit-html's own getTemplateHtml.
function prepare(result) {
  const [annotated, attrNames] = _$LH._getTemplateHtml(result.strings, result._$litType$);
  const el = document.createElement("template");
  el.innerHTML = annotated;
  const parsed = node(el.content);
  const walk = [];
  const walker = document.createTreeWalker(el.content, 129 /* elements and comments */);
  let n, i = 0;
  while ((n = walker.nextNode())) walk.push({ index: i++, path: path(el.content, n), type: n.nodeType === 1 ? n.localName : "#comment" });
  return { html: String(annotated), attrNames, parsed, walk };
}

const truth = {
  litHtmlVersion: globalThis.litHtmlVersions,
  marker: _$LH._marker,
  markerMatch: _$LH._markerMatch,
  boundAttributeSuffix: _$LH._boundAttributeSuffix,
};

// ------------------------------------------------------------ the counter
{
  fresh();
  // (The same template the video shows.)
  const counter = (count) => html`
  <span class="${count % 2 ? 'odd' : ''}">${count}</span>
  <button @click=${() => render(counter(count + 1), document.body)}>
    Increment
  </button>`;

  const r0 = counter(0);
  const r1 = counter(1);
  const c = {
    source: counter.toString(),
    result0: { litType: r0._$litType$, strings: [...r0.strings], raw: [...r0.strings.raw], values: r0.values.map(value) },
    result1: { litType: r1._$litType$, strings: [...r1.strings], values: r1.values.map(value) },
    sameStrings: r0.strings === r1.strings,
    stringsFrozen: Object.isFrozen(r0.strings),
    prepare: prepare(r0),
  };
  take();
  render(counter(0), document.body);
  c.render0 = { events: take(), body: node(document.body), bodyHtml: document.body.innerHTML };
  const rootPart = document.body._$litPart$;
  c.rootPart = {
    ctor: ctorName(rootPart),
    startNode: path(document.body, rootPart._$startNode),
    endNode: rootPart._$endNode,
    committed: ctorName(rootPart._$committedValue),
    instanceParts: parts(rootPart._$committedValue, document.body),
  };
  document.querySelector("button").click();
  c.render1 = { events: take(), body: node(document.body), bodyHtml: document.body.innerHTML };
  c.sameInstance = document.body._$litPart$._$committedValue === rootPart._$committedValue;
  // The same values again: no DOM writes.
  const instance = rootPart._$committedValue;
  render(counter(1), document.body);
  c.render1again = { events: take(), bodyHtml: document.body.innerHTML, sameInstance: document.body._$litPart$._$committedValue === instance };
  truth.counter = c;
}

// --------------------------------------------------------------- the list
{
  fresh();
  const list = (items) => html`
  <ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`;

  const l = { source: list.toString() };
  take();
  render(list(["Apples", "Bread", "Cheese"]), document.body);
  l.render0 = { events: take(), body: node(document.body), bodyHtml: document.body.innerHTML };
  render(list(["Apples", "Bread", "Cheese", "Dates"]), document.body);
  l.render1 = { events: take(), bodyHtml: document.body.innerHTML };
  render(list(["Bread", "Cheese", "Dates"]), document.body);
  l.render2 = { events: take(), bodyHtml: document.body.innerHTML };
  truth.list = l;
}

// ------------------------------------------------------ switching templates
{
  fresh();
  const greeting = (user) => user
    ? html`<p>Welcome back, ${user}!</p>`
    : html`<button>Sign in</button>`;
  const page = (user) => html`<header>${greeting(user)}</header>`;
  const g = { source: greeting.toString() + "\n" + page.toString() };
  take();
  render(page(null), document.body);
  g.render0 = { events: take(), bodyHtml: document.body.innerHTML };
  render(page("Ada"), document.body);
  g.render1 = { events: take(), bodyHtml: document.body.innerHTML };
  render(page(null), document.body);
  g.render2 = { events: take(), bodyHtml: document.body.innerHTML };
  truth.greeting = g;
}

// ----------------------------------------------------- one line per part type
{
  const kinds = html`<input id=${"a"} .value=${"b"} ?disabled=${true} @input=${() => {}} ${undefined}>`;
  truth.partKinds = { strings: [...kinds.strings], prepare: prepare(kinds) };
  fresh();
  take();
  render(kinds, document.body);
  truth.partKinds.events = take().filter((e) => e.kind === "template prep");
}

await fetch("/truth", { method: "POST", body: JSON.stringify(truth, null, 1) });
