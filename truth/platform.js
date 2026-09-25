// The platform facts episode 2 shows, captured from the running browser and
// the real lit-html / Lit (development builds), like truth/page.js does for
// episode 1. tools/truth.mjs --page platform saves the report as
// truth/platform.json.

globalThis.emitLitDebugLogEvents = false;
// The same marker as episode 1 (lit-html picks it with Math.random() on load).
const random = Math.random;
Math.random = () => 0.480592716;
const lit = await import("/lit-html/development/lit-html.js");
Math.random = random;
const { html, render, _$LH } = lit;
const { LitElement, css } = await import("/vendor/lit-element/development/lit-element.js");

const out = { userAgent: navigator.userAgent };

// ------------------------------------------------ tagged template literals
{
  const tag = (strings, ...values) => ({ strings, values });
  const f = (x) => tag`<p>${x}</p>`;
  const a = f(1), b = f(2);
  const g = (x) => tag`<p>${x}</p>`; // same text, different literal
  const esc = tag`<p>a\tb</p>`;
  out.tagged = {
    strings: [...a.strings],
    values: [a.values, b.values],
    sameArray: a.strings === b.strings,
    otherLiteralSameText: g(1).strings === a.strings,
    frozen: Object.isFrozen(a.strings),
    rawFrozen: Object.isFrozen(a.strings.raw),
    isArray: Array.isArray(a.strings),
    rawEnumerable: Object.keys(a.strings).includes("raw"),
    escape: { cooked: esc.strings[0], raw: esc.strings.raw[0] },
  };
  // A result whose strings came from data (as JSON would give it): lit-html refuses it.
  const fake = JSON.parse('{"_$litType$": 1, "strings": ["<b>hi</b>"], "values": []}');
  const el = document.createElement("div");
  try {
    render(fake, el);
    out.tagged.spoof = { threw: false, html: el.innerHTML };
  } catch (e) {
    out.tagged.spoof = { threw: true, message: String(e.message).split("\n").slice(0, 2).join(" ").trim() };
  }
  // A value that looks like markup stays text.
  const box = document.createElement("div");
  render(html`<p>${"<img src=x onerror=alert(1)>"}</p>`, box);
  const p = box.querySelector("p");
  out.tagged.textValue = { childNodes: [...p.childNodes].map((n) => n.nodeType), text: p.textContent, imgs: box.querySelectorAll("img").length };
}

// ------------------------------------------------------- <template> parsing
{
  const parse = (src) => {
    const t = document.createElement("template");
    t.innerHTML = src;
    const n = t.content.firstChild;
    return n.nodeType === 8 ? { src, node: "Comment", data: n.data }
      : n.nodeType === 7 ? { src, node: "ProcessingInstruction", target: n.target, data: n.data }
      : { src, node: n.nodeName };
  };
  out.parser = {
    marker: _$LH._marker,
    results: [parse(`<?${_$LH._marker}>`), parse("<?lit>"), parse('<?marker name="profile">'), parse("<?lit-html data>")],
  };
  // inertness
  let ran = false;
  globalThis.__templateScriptRan = () => (ran = true);
  class XCard extends HTMLElement {}
  customElements.define("x-card", XCard);
  const t = document.createElement("template");
  t.innerHTML = "<x-card></x-card><script>__templateScriptRan()</script>";
  const inside = t.content.firstChild;
  const clone = document.importNode(t.content, true);
  out.parser.inert = {
    contentOwnerIsPage: t.content.ownerDocument === document,
    contentOwnerHasWindow: t.content.ownerDocument.defaultView !== null,
    elementUpgradedInTemplate: inside instanceof XCard,
    elementUpgradedAfterImport: clone.firstChild instanceof XCard,
    scriptRanInTemplate: ran,
    cloneOwnerIsPage: clone.ownerDocument === document,
  };
}

// ------------------------------------------------------ clone and TreeWalker
out.walker = {
  SHOW_ELEMENT: NodeFilter.SHOW_ELEMENT,
  SHOW_COMMENT: NodeFilter.SHOW_COMMENT,
  SHOW_TEXT: NodeFilter.SHOW_TEXT,
  SHOW_PROCESSING_INSTRUCTION: NodeFilter.SHOW_PROCESSING_INSTRUCTION,
  mask: NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
};

// ------------------------------------------------------- listener objects
{
  const real = EventTarget.prototype.addEventListener;
  let adds = 0;
  EventTarget.prototype.addEventListener = function (...args) {
    adds++;
    return real.apply(this, args);
  };
  const box = document.createElement("div");
  document.body.append(box);
  const calls = [];
  const view = (fn) => html`<button @click=${fn}>go</button>`;
  render(view(() => calls.push("first")), box);
  render(view(() => calls.push("second")), box);
  render(view(() => calls.push("third")), box);
  box.querySelector("button").click();
  const once = document.createElement("div");
  document.body.append(once);
  let onceCalls = 0;
  render(html`<button @click=${{ handleEvent: () => onceCalls++, once: true }}>go</button>`, once);
  once.querySelector("button").click();
  once.querySelector("button").click();
  EventTarget.prototype.addEventListener = real;
  out.events = { rendersWithNewFunctions: 3, addEventListenerCalls: adds - 1, calledOnClick: calls, onceOption: { clicks: 2, calls: onceCalls } };
  box.remove();
  once.remove();
}

// ----------------------------------------------------- Lit: components
{
  let renders = 0;
  class XCounter extends LitElement {
    static properties = { a: {}, b: {}, c: {} };
    static styles = css`:host { display: block; color: rebeccapurple; }`;
    render() {
      renders++;
      return html`${this.a} ${this.b} ${this.c}`;
    }
  }
  customElements.define("x-counter", XCounter);
  const one = document.createElement("x-counter");
  const two = document.createElement("x-counter");
  document.body.append(one, two);
  await one.updateComplete;
  await two.updateComplete;
  const before = renders;
  one.a = 1;
  one.b = 2;
  one.c = 3;
  const pendingAfterSets = one.isUpdatePending;
  const rendersBeforeMicrotask = renders - before;
  const completed = await one.updateComplete;
  out.components = {
    shadowRoot: one.shadowRoot instanceof ShadowRoot,
    shadowMode: one.shadowRoot.mode,
    renderRootIsShadowRoot: one.renderRoot === one.shadowRoot,
    sharedSheet: one.shadowRoot.adoptedStyleSheets[0] === two.shadowRoot.adoptedStyleSheets[0],
    sheetIsCSSStyleSheet: one.shadowRoot.adoptedStyleSheets[0] instanceof CSSStyleSheet,
    styleElements: one.shadowRoot.querySelectorAll("style").length,
    batching: { propertySets: 3, pendingAfterSets, rendersBeforeMicrotask, rendersAfterUpdateComplete: renders - before, updateCompleteResolvedTo: completed },
    observedAttributes: XCounter.observedAttributes,
  };
  // css`` with no expressions: the sheet is cached by the strings array.
  const sheetOf = () => css`p { margin: 0; }`;
  out.components.cssCache = { sameResultObject: sheetOf() === sheetOf(), sameSheet: sheetOf().styleSheet === sheetOf().styleSheet };
}

await fetch("/truth", { method: "POST", body: JSON.stringify(out, null, 1) });
