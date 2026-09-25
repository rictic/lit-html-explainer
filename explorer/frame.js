// Runs inside explorer/frame.html, the iframe the explored code renders into.
//
// Loads lit-html's development build with `emitLitDebugLogEvents` on, runs the
// user's module, and turns everything lit-html does during each render() into
// a plain-data record for the UI (the parent page): the TemplateResults, each
// prepared Template (lit-html's own getTemplateHtml output next to the
// explorer's scan replay, the parsed and walked <template>, the template
// parts), each TemplateInstance and its Parts, the ordered part updates and
// commits from the `lit-debug` events, and the page's DOM afterwards.
//
// Sources, all from this frame's running lit-html:
//  - `lit-debug` events (lit-html.ts L196-209),
//  - the `_$LH` private exports (L2183) and the objects the events carry
//    (Template, TemplateInstance, Parts, their `_$committedValue`s),
//  - the TemplateResults the real html/svg/mathml return (frame-lit-html.js),
//  - the DOM, including a MutationObserver that sees the DOM operations the
//    debug log has no event for (render()'s first marker, list item markers,
//    `_$clear()` removals, removeAttribute for `nothing`, directives' moves).
//  - One patch: ChildPart.prototype._$setValue is wrapped (it still runs
//    unchanged) so the records know where each ChildPart's work begins and
//    ends, including list items and the root part, which have no 'set part'
//    event.

import {scanTemplate} from './scan.js';

globalThis.emitLitDebugLogEvents = true;
const params = new URLSearchParams(location.search);
// lit-html builds its marker from Math.random() once, when the module loads
// (lit-html.ts L349). Like the video's capture (truth/page.js), the explorer
// fixes Math.random while lit-html loads so the marker is lit$480592716$.
// ?marker=random leaves it alone.
const SEEDED = params.get('marker') !== 'random';
const random = Math.random;
if (SEEDED) Math.random = () => 0.480592716;
const lit = await import('./vendor/lit-html/development/lit-html.js');
Math.random = random;

const {_$LH, nothing, noChange} = lit;
const {_ChildPart: ChildPart, _TemplateInstance: TemplateInstance} = _$LH;
const marker = _$LH._marker;
const XHTML = 'http://www.w3.org/1999/xhtml';

document.body.replaceChildren();

// ------------------------------------------------------------------ console

const sessionConsole = [];
let cur = null; // the record being captured
let seq = 0;

function fmtArg(a) {
  try {
    if (typeof a === 'string') return a;
    if (a instanceof Error) return `${a.name}: ${a.message}`;
    if (a && a.nodeType) return nodeLabel(a);
    return jsPreview(a, 2, 200);
  } catch {
    return '[?]';
  }
}
function noteConsole(level, args) {
  const entry = {level, text: args.map(fmtArg).join(' ')};
  (cur ? cur.console : sessionConsole).push(entry);
  api.onConsole?.(entry, cur?.seq ?? null);
}
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    noteConsole(level, args);
    orig(...args);
  };
}
{
  const orig = console.assert.bind(console);
  console.assert = (cond, ...args) => {
    if (!cond) noteConsole('assert', ['Assertion failed:', ...args]);
    orig(cond, ...args);
  };
}
let locating = false; // locateSyntaxError's probe is running
addEventListener('error', (e) => {
  if (e.error?.__litExplorerReported || locating) return;
  noteConsole('error', [e.error ?? e.message]);
  api.onUncaught?.(errorInfo(e.error ?? {message: e.message}));
});
addEventListener('unhandledrejection', (e) => {
  noteConsole('error', ['Unhandled rejection:', e.reason]);
  api.onUncaught?.(errorInfo(e.reason));
});

// -------------------------------------------------------------- node data

const nodeIds = new WeakMap();
const nodeRefs = new Map(); // id -> WeakRef(node)
let nextNodeId = 1;
function nid(n) {
  let id = nodeIds.get(n);
  if (id === undefined) {
    nodeIds.set(n, (id = nextNodeId++));
    nodeRefs.set(id, new WeakRef(n));
  }
  return id;
}

// A DOM node as plain data. walk: Map(node -> TreeWalker index).
function snap(n, walk) {
  const out = {id: nid(n)};
  switch (n.nodeType) {
    case 1:
      out.type = 'element';
      out.name = n.localName;
      if (n.namespaceURI !== XHTML) out.ns = n.namespaceURI === 'http://www.w3.org/2000/svg' ? 'svg' : n.namespaceURI === 'http://www.w3.org/1998/Math/MathML' ? 'mathml' : n.namespaceURI;
      out.attrs = [...n.attributes].map((a) => [a.name, a.value]);
      out.children = [...n.childNodes].map((c) => snap(c, walk));
      break;
    case 3:
      out.type = 'text';
      out.data = n.data;
      break;
    case 8:
      out.type = 'comment';
      out.data = n.data;
      break;
    case 7:
      out.type = 'pi';
      out.target = n.target;
      out.data = n.data;
      break;
    case 11:
      out.type = 'fragment';
      out.children = [...n.childNodes].map((c) => snap(c, walk));
      break;
    default:
      out.type = `node${n.nodeType}`;
  }
  if (walk?.has(n)) out.walk = walk.get(n);
  return out;
}

// The nodes a TreeWalker with lit-html's filter (129 = SHOW_ELEMENT |
// SHOW_COMMENT, lit-html.ts L730-733) visits under root, in order.
function walkIndices(root) {
  const m = new Map();
  const w = document.createTreeWalker(root, 129);
  let n;
  let i = 0;
  while ((n = w.nextNode())) m.set(n, i++);
  return m;
}

function nodeLabel(n) {
  if (!n) return String(n);
  switch (n.nodeType) {
    case 1: {
      const attrs = [...n.attributes].map((a) => (a.value === '' ? ` ${a.name}` : ` ${a.name}="${a.value}"`)).join('');
      const s = `<${n.localName}${attrs}>`;
      return s.length > 60 ? s.slice(0, 58) + '…>' : s;
    }
    case 3:
      return `"${n.data.length > 40 ? n.data.slice(0, 40) + '…' : n.data}"`;
    case 8:
      return `<!--${n.data}-->`;
    case 7:
      return `<?${n.target} ${n.data}>`;
    case 9:
      return '#document';
    case 11:
      return '#document-fragment';
    default:
      return `#node(${n.nodeType})`;
  }
}

// ----------------------------------------------------------------- values

// A short JavaScript-ish rendering of any value (for states, objects).
function jsPreview(v, depth = 2, max = 120) {
  const s = preview(v, depth);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
function preview(v, depth) {
  if (v === nothing) return 'nothing';
  if (v === noChange) return 'noChange';
  if (v === null) return 'null';
  switch (typeof v) {
    case 'undefined': return 'undefined';
    case 'string': return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
    case 'number': return Object.is(v, -0) ? '-0' : String(v);
    case 'boolean': return String(v);
    case 'bigint': return `${v}n`;
    case 'symbol': return v.toString();
    case 'function': return fnText(v, 60);
  }
  if (v._$litType$ !== undefined) return `html\`…\``;
  if (v.nodeType) return nodeLabel(v);
  if (depth <= 0) return Array.isArray(v) ? '[…]' : '{…}';
  if (Array.isArray(v)) return `[${v.slice(0, 12).map((x) => preview(x, depth - 1)).join(', ')}${v.length > 12 ? ', …' : ''}]`;
  const keys = Object.keys(v);
  const name = ctorName(v);
  const body = keys.slice(0, 8).map((k) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${preview(v[k], depth - 1)}`).join(', ');
  return `${name && name !== 'Object' ? name + ' ' : ''}{${body}${keys.length > 8 ? ', …' : ''}}`;
}
function ctorName(v) {
  try {
    return v?.constructor?.name ?? '';
  } catch {
    return '';
  }
}
function fnText(f, max = 90) {
  let s;
  try {
    s = Function.prototype.toString.call(f);
  } catch {
    s = 'function';
  }
  s = s.replace(/\s+/g, ' ');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// A value, as a record the UI can show: TemplateResults by id, directive
// results with their directive class, and so on.
function desc(v, depth = 0) {
  try {
    if (v === nothing) return {k: 'nothing'};
    if (v === noChange) return {k: 'noChange'};
    if (v === undefined) return {k: 'undefined'};
    if (v === null) return {k: 'null'};
    switch (typeof v) {
      case 'string': return {k: 'string', v: v.length > 300 ? v.slice(0, 300) + '…' : v};
      case 'number':
      case 'boolean':
        return {k: typeof v, v: Object.is(v, -0) ? '-0' : String(v)};
      case 'bigint': return {k: 'bigint', v: `${v}n`};
      case 'symbol': return {k: 'symbol', v: v.toString()};
      case 'function': return {k: 'function', v: fnText(v)};
    }
    if (v._$litType$ !== undefined) return {k: 'result', id: registerResult(v), type: v._$litType$};
    if (v._$litDirective$ !== undefined) {
      return {k: 'directive', name: v._$litDirective$.name, values: depth > 3 ? [] : (v.values ?? []).map((x) => desc(x, depth + 1))};
    }
    if (Array.isArray(v)) return {k: 'array', length: v.length, items: depth > 3 ? [] : v.slice(0, 40).map((x) => desc(x, depth + 1))};
    if (v.nodeType !== undefined) return {k: 'node', v: nodeLabel(v), id: nid(v)};
    if (typeof v[Symbol.iterator] === 'function') return {k: 'iterable', name: ctorName(v)};
    return {k: 'object', name: ctorName(v), v: jsPreview(v, 2, 90)};
  } catch (e) {
    return {k: 'object', v: '[unreadable]'};
  }
}

// ------------------------------------------------------ TemplateResults

// Every TemplateResult html/svg/mathml returned (frame-lit-html.js), in order.
const results = [];
const resultIds = new WeakMap();
const firstResultOfStrings = new WeakMap(); // strings -> result id
let resultsTaken = 0; // results[0..resultsTaken) belong to earlier records
function registerResult(r) {
  let id = resultIds.get(r);
  if (id === undefined) {
    id = results.length;
    resultIds.set(r, id);
    results.push(r);
    if (r.strings && !firstResultOfStrings.has(r.strings)) firstResultOfStrings.set(r.strings, id);
  }
  return id;
}

// ------------------------------------------------ Templates and instances

const templates = []; // records
const templateIds = new Map(); // Template -> id
const stringsTemplate = new WeakMap(); // TemplateStringsArray -> template id
const instances = []; // records
const instanceIds = new WeakMap(); // TemplateInstance -> id

function templateRecord(e) {
  const id = templates.length;
  templateIds.set(e.template, id);
  stringsTemplate.set(e.strings, id);
  // The TemplateResult being prepared: the latest one with these strings.
  let type = null;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].strings === e.strings) {
      type = results[i]._$litType$;
      break;
    }
  }
  const t = {
    id, seq: cur?.seq ?? null, type: type ?? 1, typeKnown: type !== null,
    strings: [...e.strings], raw: [...e.strings.raw],
    parts: e.parts.map((p) => ({
      type: p.type, index: p.index, name: p.name,
      strings: p.strings ? [...p.strings] : undefined,
      ctor: p.ctor?.name,
    })),
  };
  // lit-html's own getTemplateHtml (lit-html.ts L798), and the replay.
  try {
    const [h, attrNames] = _$LH._getTemplateHtml(e.strings, t.type);
    t.html = String(h);
    t.attrNames = [...attrNames];
    // What the HTML parser made of it, before the walk (the same parse
    // Template.createElement does, L1121-1125, into a separate <template>).
    const el = document.createElement('template');
    el.innerHTML = h;
    t.parsed = snap(el.content, walkIndices(el.content));
    t.parsedEls = [...el.content.querySelectorAll('*')].map((n) => [...n.attributes].map((a) => [a.name, a.value]));
  } catch (err) {
    t.htmlError = errorInfo(err);
  }
  try {
    t.replay = scanTemplate(e.strings, marker, t.type, _$LH._boundAttributeSuffix);
    t.replayMatches = t.html !== undefined && t.replay.html === t.html && JSON.stringify(t.replay.attrNames) === JSON.stringify(t.attrNames);
  } catch (err) {
    t.replayError = errorInfo(err);
    t.replayMatches = false;
  }
  // The <template> after the walk (template.el: what every instance clones),
  // with lit-html's TreeWalker indices, and which attributes the walk removed
  // (elements pair up in document order: the walk removes bound attributes
  // and splits raw text, but never adds or removes elements; svg`` and
  // mathml`` templates lose their <svg>/<math> wrapper element first).
  const content = e.clonableTemplate.content;
  const walk = walkIndices(content);
  t.final = snap(content, walk);
  const finalEls = [...content.querySelectorAll('*')];
  const parsedEls = t.parsedEls ?? [];
  const offset = t.type !== 1 ? 1 : 0;
  t.removedAttrs = {};
  finalEls.forEach((n, i) => {
    const before = parsedEls[i + offset];
    if (!before) return;
    const now = new Set([...n.attributes].map((a) => a.name));
    const removed = before.map(([k, v], at) => ({name: k, value: v, at})).filter((a) => !now.has(a.name));
    if (removed.length) t.removedAttrs[nid(n)] = removed;
  });
  delete t.parsedEls;
  t.walkCount = walk.size;
  // The walk runs while parts.length < partCount (one per binding, L986). If
  // it gets that many parts it stops at the last one; otherwise (e.g. two
  // bindings in one attribute make one part) it visits every node.
  const partCount = t.strings.length - 1;
  t.lastVisited = t.parts.length >= partCount ? (t.parts.length ? Math.max(...t.parts.map((p) => p.index)) : -1) : walk.size - 1;
  templates.push(t);
  return t;
}

function partInfo(p, k) {
  if (p === undefined) return {k, none: true};
  const o = {k, ctor: ctorName(p), type: p.type};
  if (p instanceof ChildPart) {
    o.startNode = nid(p._$startNode);
    o.startLabel = nodeLabel(p._$startNode);
    o.endNode = p._$endNode ? nid(p._$endNode) : null;
    o.endLabel = p._$endNode ? nodeLabel(p._$endNode) : null;
  } else {
    o.element = nid(p.element);
    o.elementLabel = nodeLabel(p.element);
    if (p.name !== undefined) o.name = p.name;
    if (p.strings !== undefined) o.strings = [...p.strings];
  }
  return o;
}

// Where a Part lives: the root part, part k of a TemplateInstance, or an item
// of an iterable (or a repeat) in another ChildPart.
function partRef(p, depth = 0) {
  if (!p) return null;
  const ref = {ctor: ctorName(p)};
  if (p.name !== undefined) ref.name = p.name;
  const parent = p._$parent;
  if (parent === undefined && p instanceof ChildPart) {
    ref.root = true;
  } else if (parent instanceof TemplateInstance) {
    ref.instance = instanceIds.get(parent) ?? null;
    ref.index = parent._$parts.indexOf(p);
  } else if (parent instanceof ChildPart && depth < 6) {
    const list = parent._$committedValue;
    ref.item = Array.isArray(list) ? list.indexOf(p) : -1;
    ref.of = partRef(parent, depth + 1);
    if (parent.__directive) ref.directive = ctorName(parent.__directive);
  }
  return ref;
}

// --------------------------------------------------------- the recorder

const OBSERVE = {subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true};
const mo = new MutationObserver((recs) => outside(recs));
mo.observe(document, OBSERVE);

function newRecord(meta) {
  return {
    seq: ++seq, ...meta,
    tree: {t: 'root', kids: []},
    stack: [],
    console: [],
    error: null,
    renders: [], // values passed to lit's render() in this record
    prepared: [], created: [], updated: [],
    live: new Map(), // tree node -> live objects for matching DOM records
    lastCommit: null,
    touched: new Set(),
  };
}
const top = () => cur.stack.at(-1) ?? cur.tree;
function attach(node) {
  top().kids.push(node);
  return node;
}
function push(node) {
  top().kids.push(node);
  cur.stack.push(node);
  return node;
}
function popTo(pred) {
  while (cur.stack.length) {
    const n = cur.stack.pop();
    if (pred(n)) return n;
  }
  return null;
}

// Take the DOM records since the last event: the ones the last commit
// explains go on that commit; the rest are DOM operations with no debug
// event, placed where they happened.
function flush() {
  const recs = mo.takeRecords();
  if (!cur) {
    if (recs.length) outside(recs);
    return;
  }
  let rest = recs;
  if (cur.lastCommit) {
    rest = claim(cur.lastCommit, recs);
    cur.lastCommit = null;
  }
  for (const op of ops(rest)) {
    attach(op);
  }
}

function touch(n) {
  if (n) cur.touched.add(nid(n));
}

function claim(commit, recs) {
  const live = cur.live.get(commit) ?? {};
  const taken = new Set();
  const take = (r) => {
    taken.add(r);
    commit.dom.push(recDesc(r));
  };
  commit.dom = [];
  switch (commit.kind) {
    case 'commit attribute':
    case 'commit boolean attribute': {
      const r = recs.find((r) => r.type === 'attributes' && r.target === live.element && r.attributeName === commit.name);
      if (r) take(r);
      break;
    }
    case 'commit property':
      for (const r of recs) if (r.type === 'attributes' && r.target === live.element) take(r);
      break;
    case 'commit text': {
      const r = recs.find((r) => r.type === 'characterData' && r.target === live.node);
      if (r) take(r);
      break;
    }
    case 'commit node':
      for (const r of recs) {
        if (r.type !== 'childList') continue;
        if (live.first && [...r.addedNodes].includes(live.first)) take(r);
        else if (live.value && r.target === live.value && r.removedNodes.length && !r.addedNodes.length) take(r);
      }
      break;
    case 'commit nothing to child':
      for (const r of recs) {
        if (r.type === 'childList' && r.removedNodes.length && !r.addedNodes.length) take(r);
        else break;
      }
      commit.writes = commit.dom.length;
      break;
  }
  for (const r of taken) {
    touch(r.target);
    r.addedNodes?.forEach?.(touch);
  }
  return recs.filter((r) => !taken.has(r));
}

function recDesc(r) {
  if (r.type === 'attributes') {
    const has = r.target.hasAttribute(r.attributeName);
    return {type: 'attributes', target: nid(r.target), name: r.attributeName, old: r.oldValue, value: has ? r.target.getAttribute(r.attributeName) : null};
  }
  if (r.type === 'characterData') return {type: 'characterData', target: nid(r.target), old: r.oldValue, value: r.target.data};
  return {
    type: 'childList', target: nid(r.target), targetLabel: nodeLabel(r.target),
    added: [...r.addedNodes].map(nodeLabel), removed: [...r.removedNodes].map(nodeLabel),
  };
}

// MutationRecords with no debug event, as DOM operations.
function ops(recs) {
  const out = [];
  for (let j = 0; j < recs.length; j++) {
    const r = recs[j];
    touch(r.target);
    if (r.type === 'childList') {
      const next = recs[j + 1];
      // insertBefore of a node that was already in the tree: a move
      // (one remove record, then one insert record).
      if (r.removedNodes.length === 1 && !r.addedNodes.length && next?.type === 'childList' &&
          next.addedNodes.length === 1 && next.addedNodes[0] === r.removedNodes[0] && !next.removedNodes.length) {
        const n = r.removedNodes[0];
        touch(n);
        out.push({t: 'dom', op: 'move', nodes: [nodeLabel(n)], ids: [nid(n)], parent: nodeLabel(next.target), writes: 1});
        j++;
        continue;
      }
      if (r.addedNodes.length) {
        r.addedNodes.forEach(touch);
        out.push({t: 'dom', op: 'insert', nodes: [...r.addedNodes].map(nodeLabel), ids: [...r.addedNodes].map(nid), parent: nodeLabel(r.target), writes: 1});
      }
      if (r.removedNodes.length) {
        out.push({t: 'dom', op: 'remove', nodes: [...r.removedNodes].map(nodeLabel), parent: nodeLabel(r.target), writes: 1});
      }
    } else if (r.type === 'attributes') {
      const has = r.target.hasAttribute(r.attributeName);
      out.push({t: 'dom', op: has ? 'setAttribute' : 'removeAttribute', el: nodeLabel(r.target), elId: nid(r.target), name: r.attributeName, old: r.oldValue,
        value: has ? r.target.getAttribute(r.attributeName) : null, writes: 1});
    } else if (r.type === 'characterData') {
      out.push({t: 'dom', op: 'data', node: nid(r.target), old: r.oldValue, value: r.target.data, writes: 1});
    }
  }
  // Consecutive removals from one parent, and consecutive insertions of
  // markers, read better as one row each.
  const merged = [];
  for (const o of out) {
    const prev = merged.at(-1);
    if (prev && prev.op === o.op && (o.op === 'remove' || o.op === 'insert' || o.op === 'move') && prev.parent === o.parent) {
      prev.nodes.push(...o.nodes);
      if (o.ids) prev.ids.push(...o.ids);
      prev.writes += o.writes;
    } else {
      merged.push(o);
    }
  }
  return merged;
}

// DOM changes outside any render (event handlers, async code). The UI only
// needs to know the page changed.
function outside(recs) {
  if (!recs.length || cur) return;
  api.onPageChange?.();
}

// -------------------------------------------------- the lit-debug events

addEventListener('lit-debug', (ev) => {
  const e = ev.detail;
  if (!cur) implicitRecord();
  try {
    onDebug(e);
  } catch (err) {
    console.error('explorer: failed to record', e.kind, err);
  }
});

function setScopeOf(instance) {
  // pop lingering attribute-part set scopes of the same instance
  while (cur.stack.length) {
    const t = top();
    if (t.t === 'set' && !t.child && t._instance === instance) cur.stack.pop();
    else break;
  }
}

function onDebug(e) {
  flush();
  switch (e.kind) {
    case 'begin render': {
      const node = push({t: 'render', id: e.id, container: nodeLabel(e.container), found: e.part !== undefined, value: desc(e.value), kids: []});
      cur.renders.push(e.value);
      if (e.part === undefined) node.createdRoot = true;
      break;
    }
    case 'end render': {
      popTo((n) => n.t === 'render' && n.id === e.id);
      break;
    }
    case 'template prep': {
      const t = templateRecord(e);
      cur.prepared.push(t.id);
      attach({t: 'prep', template: t.id});
      break;
    }
    case 'template instantiated': {
      const id = instances.length;
      instanceIds.set(e.instance, id);
      const walk = walkIndices(e.fragment);
      const templateId = templateIds.get(e.template) ?? null;
      const inst = {
        id, seq: cur.seq, template: templateId,
        parent: partRef(e.instance._$parent),
        fragment: snap(e.fragment, walk),
        parts: e.instance._$parts.map(partInfo),
        result: resultIdByValues(e.values),
      };
      instances.push(inst);
      cur.created.push(id);
      const prev = top().kids.at(-1);
      const node = push({t: 'instance', mode: 'create', instance: id, template: templateId, result: inst.result,
        cache: prev?.t === 'prep' && prev.template === templateId ? 'miss' : 'hit', part: partRef(e.instance._$parent), kids: []});
      node._partObj = e.instance._$parent;
      instanceParents.set(id, e.instance._$parent);
      mo.observe(e.fragment, OBSERVE);
      break;
    }
    case 'template instantiated and updated': {
      const id = instanceIds.get(e.instance);
      popTo((n) => n.t === 'instance' && n.instance === id);
      break;
    }
    case 'template updating': {
      const id = instanceIds.get(e.instance) ?? null;
      cur.updated.push(id);
      const templateId = templateIds.get(e.template) ?? null;
      const prev = top().kids.at(-1);
      const node = push({t: 'instance', mode: 'update', instance: id, template: templateId, result: resultIdByValues(e.values),
        cache: prev?.t === 'prep' && prev.template === templateId ? 'miss' : 'hit', part: partRef(e.instance._$parent), kids: []});
      node._partObj = e.instance._$parent;
      break;
    }
    case 'set part': {
      setScopeOf(e.templateInstance);
      const p = e.part;
      const multi = p.strings !== undefined && !(p instanceof ChildPart);
      const n = multi ? p.strings.length - 1 : 1;
      const values = [];
      for (let i = 0; i < n; i++) values.push(desc(e.values[e.valueIndex + i]));
      const node = push({t: 'set', part: partRef(p), valueIndex: e.valueIndex, count: n, values, child: p instanceof ChildPart, kids: []});
      node._instance = e.templateInstance;
      node._part = p;
      break;
    }
    default:
      commitEvent(e);
  }
}

function commitEvent(e) {
  const c = {t: 'commit', kind: e.kind, writes: 1, dom: []};
  const live = {};
  switch (e.kind) {
    case 'commit attribute':
    case 'commit property':
    case 'commit boolean attribute':
      c.el = nodeLabel(e.element);
      c.elId = nid(e.element);
      c.name = e.name;
      c.value = desc(e.value);
      live.element = e.element;
      touch(e.element);
      break;
    case 'commit event listener':
      c.el = nodeLabel(e.element);
      c.elId = nid(e.element);
      c.name = e.name;
      c.value = desc(e.value);
      c.old = desc(e.oldListener);
      c.add = e.addListener;
      c.remove = e.removeListener;
      c.writes = (e.addListener ? 1 : 0) + (e.removeListener ? 1 : 0);
      if (c.writes) touch(e.element);
      break;
    case 'commit text':
      c.node = nid(e.node);
      c.value = desc(e.value);
      c.old = e.node.data;
      live.node = e.node;
      touch(e.node);
      break;
    case 'commit node':
      c.value = desc(e.value);
      c.start = nid(e.start);
      c.startLabel = nodeLabel(e.start);
      if (e.value.nodeType === 11) {
        c.fragment = [...e.value.childNodes].map(nodeLabel);
        live.first = e.value.firstChild;
        live.value = e.value;
      } else {
        live.first = e.value;
      }
      break;
    case 'commit nothing to child':
      c.start = nid(e.start);
      c.startLabel = nodeLabel(e.start);
      c.end = e.end ? nid(e.end) : null;
      break;
    case 'commit to element binding':
      c.el = nodeLabel(e.element);
      c.elId = nid(e.element);
      c.value = desc(e.value);
      c.writes = 0;
      break;
    default:
      c.unknown = true;
      c.writes = 0;
  }
  cur.live.set(c, live);
  cur.lastCommit = c;
  attach(c);
}

// A TemplateResult by its values array (the debug events carry `values`, the
// same array object as the TemplateResult's).
function resultIdByValues(values) {
  for (let i = results.length - 1; i >= 0; i--) if (results[i].values === values) return i;
  return null;
}

// ChildPart._$setValue, wrapped: every ChildPart's work gets its own scope,
// including the root part and list items, which have no 'set part' event.
{
  const proto = ChildPart.prototype;
  const setValue = proto._$setValue;
  proto._$setValue = function (value, directiveParent) {
    const implicit = !cur;
    if (implicit) implicitRecord();
    flush();
    let scope = top();
    if (!(scope.t === 'set' && scope._part === this && !scope._entered)) {
      scope = push({t: 'child', part: partRef(this), value: desc(value), kids: []});
    }
    scope._entered = true;
    scope._part = this;
    try {
      return setValue.call(this, value, directiveParent);
    } finally {
      if (cur) {
        flush();
        popTo((n) => n === scope);
      }
    }
  };
}

// Events outside render() (an async directive committing later): a record of
// their own, closed at the end of the task.
function implicitRecord() {
  cur = newRecord({kind: 'async', label: 'outside render()'});
  cur.results = [];
  setTimeout(() => {
    if (cur && cur.kind === 'async') finishRecord(null);
  });
}

// ------------------------------------------------------------- records

function capture(meta, fn) {
  if (cur && cur.kind !== 'async') {
    // A render() inside a render (e.g. from a directive): part of this record.
    return fn();
  }
  if (cur) finishRecord(null);
  cur = newRecord(meta);
  let ret;
  let error = null;
  try {
    ret = fn();
  } catch (err) {
    error = err;
  }
  finishRecord(error);
  if (error) {
    if (error && typeof error === 'object') error.__litExplorerReported = true;
    if (meta.kind === 'page' || meta.kind === 'module') throw error;
  }
  return ret;
}

function finishRecord(error) {
  const rec = cur;
  flush();
  cur.stack.length = 0;
  cur = null;
  if (error) rec.error = errorInfo(error);
  // TemplateResults: the ones created since the last record, plus any
  // reachable from what was rendered, plus any an instance event used.
  const ids = new Set();
  for (let i = resultsTaken; i < results.length; i++) ids.add(i);
  resultsTaken = results.length;
  const roles = new Map();
  const order = new Map(); // tree order from what was rendered: outer first
  const visit = (v, role, depth) => {
    if (depth > 8 || v == null || typeof v !== 'object') return;
    if (v._$litType$ !== undefined) {
      const id = registerResult(v);
      ids.add(id);
      if (!order.has(id)) order.set(id, order.size);
      if (!roles.has(id)) roles.set(id, role);
      v.values?.forEach((x, i) => visit(x, {parent: id, path: [i]}, depth + 1));
    } else if (v._$litDirective$ !== undefined) {
      (v.values ?? []).forEach((x, i) => visit(x, {...role, path: [...role.path, `${v._$litDirective$.name}.values`, i]}, depth + 1));
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => visit(x, {...role, path: [...role.path, i]}, depth + 1));
    }
  };
  rec.renders.forEach((v) => visit(v, {root: true, path: []}, 0));
  const used = new Map();
  const walkTree = (n) => {
    if (n.t === 'instance' && n.result !== null && n.result !== undefined) {
      ids.add(n.result);
      if (!used.has(n.result)) used.set(n.result, []);
      used.get(n.result).push({instance: n.instance, mode: n.mode});
    }
    n.kids?.forEach(walkTree);
  };
  walkTree(rec.tree);
  const rank = (id) => (order.has(id) ? order.get(id) : 1e6 + id);
  rec.results = [...ids].sort((a, b) => rank(a) - rank(b)).map((id) => {
    const r = results[id];
    return {
      id, type: r._$litType$,
      strings: r.strings ? [...r.strings] : null,
      values: (r.values ?? []).map((v) => desc(v)),
      template: r.strings ? stringsTemplate.get(r.strings) ?? null : null,
      firstWithStrings: r.strings ? firstResultOfStrings.get(r.strings) : null,
      role: roles.get(id) ?? null,
      used: used.get(id) ?? [],
    };
  });
  rec.templates = rec.prepared.map((id) => templates[id]);
  // A render that threw while preparing: replay the scan of the template
  // lit-html was preparing (the one rendered whose strings aren't cached), so
  // the UI can show where getTemplateHtml gave up.
  if (error && /getTemplateHtml|new Template|Template\b/.test(String(error.stack))) {
    const r = rec.results.find((x) => x.strings && x.template === null);
    if (r) {
      try {
        rec.failedPrep = {result: r.id, type: r.type, strings: r.strings, replay: scanTemplate(results[r.id].strings, marker, r.type, _$LH._boundAttributeSuffix)};
      } catch {}
    }
  }
  rec.instances = rec.created.map((id) => instances[id]);
  rec.page = snap(document.body);
  rec.notes = pageNotes();
  rec.rootPart = rootPartInfo();
  rec.touched = [...rec.touched];
  rec.counts = counts(rec.tree);
  // Item indices were read while the render ran; repeat() sets the list of
  // parts only at the end, so read them again from the final lists.
  const refix = (ref, part) => {
    if (!ref || ref.item === undefined || !part) return;
    const list = part._$parent?._$committedValue;
    if (Array.isArray(list)) ref.item = list.indexOf(part);
  };
  const fixItems = (n) => {
    if (n.t === 'child') refix(n.part, n._part);
    if (n.t === 'instance') refix(n.part, n._partObj);
    n.kids?.forEach(fixItems);
  };
  fixItems(rec.tree);
  for (const id of rec.created) refix(instances[id].parent, instanceParents.get(id));
  delete rec.stack;
  delete rec.live;
  delete rec.lastCommit;
  delete rec.renders;
  strip(rec.tree);
  records.push(rec);
  api.onRecord?.(rec);
  return rec;
}

const instanceParents = new Map(); // instance id -> the ChildPart it was created in
function strip(n) {
  delete n._instance;
  delete n._part;
  delete n._partObj;
  delete n._entered;
  n.kids?.forEach(strip);
}

function counts(tree) {
  const c = {prepared: 0, created: 0, updated: 0, sets: 0, skipped: 0, writes: 0, commits: 0, silent: 0};
  const walk = (n) => {
    if (n.t === 'prep') c.prepared++;
    if (n.t === 'instance') c[n.mode === 'create' ? 'created' : 'updated']++;
    if (n.t === 'commit') {
      c.commits++;
      c.writes += n.writes;
    }
    if (n.t === 'dom') {
      c.silent += n.writes;
      c.writes += n.writes;
    }
    if (n.t === 'set') {
      c.sets++;
      if (!n.kids.some((k) => k.t === 'commit' || k.t === 'dom' || k.t === 'instance' || k.t === 'child' || k.t === 'prep')) {
        n.skipped = true;
        c.skipped++;
      }
    }
    n.kids?.forEach(walk);
  };
  walk(tree);
  return c;
}

// What each node of the page is to lit-html: which Part holds it, which
// markers are whose. From the live Parts, starting at body._$litPart$.
function pageNotes() {
  const notes = {};
  const add = (node, note) => {
    if (!node) return;
    (notes[nid(node)] ??= []).push(note);
  };
  const seen = new Set();
  const child = (part, depth) => {
    if (!part || seen.has(part) || depth > 40) return;
    seen.add(part);
    const ref = partRef(part);
    add(part._$startNode, {role: 'start', part: ref});
    if (part._$endNode) add(part._$endNode, {role: 'end', part: ref});
    const v = part._$committedValue;
    if (v instanceof TemplateInstance) {
      v._$parts.forEach((p, k) => {
        if (!p) return;
        if (p instanceof ChildPart) child(p, depth + 1);
        else add(p.element, {role: 'element', part: partRef(p)});
      });
    } else if (Array.isArray(v)) {
      v.forEach((p) => p instanceof ChildPart && child(p, depth + 1));
    } else if (v !== nothing && v != null && typeof v !== 'object' && typeof v !== 'function') {
      add(part._$startNode?.nextSibling, {role: 'text', part: ref});
    } else if (v?.nodeType) {
      add(v, {role: 'node', part: ref});
    }
  };
  child(document.body._$litPart$, 0);
  // Comments that were a Part's marker in an earlier render but aren't now.
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
  let c;
  while ((c = w.nextNode())) {
    const id = nid(c);
    if (notes[id]) markerHistory.set(c, notes[id]);
    else if (markerHistory.has(c)) notes[id] = [{role: 'orphan', was: markerHistory.get(c).find((n) => n.role === 'end' || n.role === 'start')}];
  }
  return notes;
}
const markerHistory = new WeakMap();

function rootPartInfo() {
  const p = document.body._$litPart$;
  if (!p) return null;
  const v = p._$committedValue;
  return {
    startNode: nid(p._$startNode), endNode: p._$endNode ? nid(p._$endNode) : null,
    committed: v instanceof TemplateInstance ? {k: 'instance', id: instanceIds.get(v) ?? null} : Array.isArray(v) ? {k: 'array', length: v.length} : desc(v),
  };
}

function errorInfo(err) {
  if (err == null) return {message: String(err)};
  const out = {name: err.name ?? 'Error', message: String(err.message ?? err)};
  const stack = String(err.stack ?? '');
  out.stack = stack.split('\n').slice(0, 12).join('\n');
  // Where in the user's code, if the stack says so.
  const m = stack.match(/blob:[^\s)]+?:(\d+):(\d+)/);
  if (m) {
    out.line = +m[1];
    out.col = +m[2];
  }
  return out;
}

// ------------------------------------------------------------- the API

const records = [];
let mod = null;
let codeUrl = null;

globalThis.__litExplorer = {
  result(r) {
    registerResult(r);
    return r;
  },
  render(value, container, options) {
    const ev = globalThis.event;
    const kind = loading ? 'module' : 'page';
    const el = ev?.currentTarget?.localName ?? ev?.target?.localName;
    const where = ev && ev.type ? `${ev.type} on ${el ? `<${el}>` : 'the page'}` : null;
    return capture({kind, label: kind === 'module' ? 'render() in module code' : where ? `render() from the ${ev.type} event on ${el ? `<${el}>` : 'the page'}` : 'render() from page code', event: where},
      () => lit.render(value, container, options));
  },
};
let loading = false;

const api = {
  info: {
    version: (globalThis.litHtmlVersions ?? []).join(', '),
    marker, markerMatch: _$LH._markerMatch, boundAttributeSuffix: _$LH._boundAttributeSuffix,
    seeded: SEEDED, devMode: true,
  },
  sessionConsole,
  onRecord: null,
  onConsole: null,
  onUncaught: null,
  onPageChange: null,
  view: null,
  states: [],

  async load(code) {
    const blob = new Blob([code], {type: 'text/javascript'});
    codeUrl = URL.createObjectURL(blob);
    loading = true;
    let error = null;
    try {
      mod = await import(codeUrl);
    } catch (err) {
      error = errorInfo(err);
      if (err?.name === 'SyntaxError' && error.line === undefined) {
        const at = await locateSyntaxError(code);
        if (at.line) {
          error.line = at.line;
          error.col = at.col;
        }
      }
    } finally {
      loading = false;
    }
    if (error) return {ok: false, error};
    const view = typeof mod.view === 'function' ? mod.view : null;
    let states = mod.states;
    if (states !== undefined && !Array.isArray(states)) states = [states];
    api.view = view;
    api.states = states ?? (view ? [undefined] : []);
    return {ok: true, hasView: !!view, states: api.states.map((s) => jsPreview(s, 2, 80))};
  },

  renderState(i, meta = {}) {
    const state = api.states[i];
    return capture({kind: 'state', index: i, label: `view(states[${i}])`, state: jsPreview(state, 2, 80), ...meta},
      () => lit.render(api.view(state), document.body));
  },

  // The viewport rect of a node, for highlighting it from the UI.
  rectOf(id) {
    const n = nodeRefs.get(id)?.deref();
    if (!n || !n.isConnected) return null;
    let r;
    if (n.nodeType === 1) r = n.getBoundingClientRect();
    else {
      const range = document.createRange();
      range.selectNode(n);
      r = range.getBoundingClientRect();
    }
    return {x: r.x, y: r.y, w: r.width, h: r.height};
  },
};

// A SyntaxError from import() has no position; an inline module script with
// the same code reports one to window.onerror (and a module that fails to
// parse or link never runs, so nothing executes twice).
function locateSyntaxError(code) {
  return new Promise((resolve) => {
    const onError = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      done({line: e.lineno, col: e.colno, message: e.message?.replace(/^Uncaught /, '')});
    };
    const done = (v) => {
      removeEventListener('error', onError, true);
      s.remove();
      setTimeout(() => (locating = false));
      resolve(v);
    };
    locating = true;
    addEventListener('error', onError, true);
    const s = document.createElement('script');
    s.type = 'module';
    s.textContent = code;
    document.head.append(s);
    setTimeout(() => done({}), 1500);
  });
}

globalThis.explorerFrame = api;
parent.postMessage({explorer: 'ready'}, location.origin);
