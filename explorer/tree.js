// <dom-tree>: a DOM snapshot (frame.js snap()) drawn like a devtools
// Elements panel: one row per open tag, close tag, text or comment.
// Whitespace text is shown (⏎ and ·), and the gutter shows lit-html's
// TreeWalker index for elements and comments (text nodes are skipped).
//
// Options (all optional):
//   walk: show the walker gutter; lastVisited: nodes after it get a dimmed
//   index (the walk stopped); removed: {id: [{name, value, at}]} bound
//   attributes the walk removed (struck through); marks: {id: [{text,
//   color, title}]} badges; colors: {id: color} for a node's marker text;
//   notes: {id: note} (hover explanations); touched: Set of ids written by
//   the render; marker: the marker string, highlighted wherever it appears.

import {LitElement, html, css, nothing as litNothing} from 'lit';
import {shared, rgba, bindingColor} from './theme.js';

export const showWs = (s) => s.replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/ /g, '·');

// Splits text on the marker, highlighting each occurrence (colour k for the
// k-th, or one colour).
export function markerSpans(text, marker, colorOf) {
  if (!marker || !text.includes(marker)) return text;
  const parts = text.split(marker);
  const out = [];
  parts.forEach((p, i) => {
    if (p) out.push(p);
    if (i < parts.length - 1) {
      const c = colorOf ? colorOf(i) : '#ffd166';
      out.push(html`<span class="mk" style="color:${c}">lit$<span class="digits">${marker.slice(4, -1)}</span>$</span>`);
    }
  });
  return out;
}

export class DomTree extends LitElement {
  static properties = {
    root: {attribute: false},
    options: {attribute: false},
    hover: {state: true},
  };

  static styles = [shared, css`
    :host { display: block; font: 12.5px/19px var(--mono); color: var(--dom-text); overflow-x: auto; scrollbar-width: thin; }
    .row { display: flex; align-items: flex-start; white-space: pre; min-height: 19px; border-radius: 4px; position: relative; width: max-content; min-width: 100%; }
    .row.hover { background: rgba(122,162,255,.12); }
    .row.touched { background: rgba(94,227,139,.07); }
    .row.touched.hover { background: rgba(122,162,255,.14); }
    .row.touched::before { content: ''; position: absolute; left: 34px; top: 3px; bottom: 3px; width: 2px; background: var(--ok); border-radius: 1px; }
    .g { flex: none; width: 30px; text-align: right; padding-right: 8px; color: var(--text4); user-select: none; font-size: 11px; }
    .g .ix { display: inline-block; min-width: 18px; text-align: center; padding: 0 3px; border-radius: 4px; background: rgba(122,162,255,.16); color: #b9ccff; font-weight: 600; line-height: 15px; margin-top: 2px; }
    .g .ix.late { background: none; color: var(--text4); border: 1px dashed var(--text4); line-height: 13px; }
    .g .skip { color: var(--text4); }
    .body { padding-left: 6px; padding-right: 8px; }
    .tag { color: var(--dom-tag); }
    .an { color: var(--dom-attr); }
    .av { color: var(--dom-value); }
    .p { color: var(--dom-punct); }
    .com { color: var(--dom-comment); }
    .tx { color: var(--dom-text); }
    .ws { color: var(--dom-whitespace); }
    .pi { color: #d8b4fe; }
    .gone { text-decoration: line-through; text-decoration-thickness: 1.5px; opacity: .85; }
    .mk { font-weight: 600; }
    .mk .digits { opacity: .72; }
    .badge { display: inline-block; margin-left: 8px; padding: 0 6px; border-radius: 5px; font: 600 10.5px/16px var(--sans); vertical-align: 1px; white-space: nowrap; }
    .ind { display: inline-block; }
    .has-note { cursor: help; }
    .has-note .body { text-decoration: underline dotted rgba(166,176,204,.35); text-underline-offset: 3px; }
  `];

  constructor() {
    super();
    this.options = {};
  }

  render() {
    if (!this.root) return litNothing;
    const rows = [];
    const visit = (n, depth) => {
      if (n.type === 'fragment') {
        n.children.forEach((c) => visit(c, depth));
        return;
      }
      if (n.type !== 'element') {
        rows.push({n, depth, kind: n.type});
        return;
      }
      const kids = n.children;
      if (kids.length === 0) rows.push({n, depth, kind: 'leaf'});
      else if (kids.length === 1 && kids[0].type === 'text' && !/^\s*$/.test(kids[0].data) && !kids[0].data.includes('\n') && kids[0].data.length < 50 && !this.options.expandText) {
        rows.push({n, depth, kind: 'inline', text: kids[0]});
      } else {
        rows.push({n, depth, kind: 'open'});
        kids.forEach((c) => visit(c, depth + 1));
        rows.push({n, depth, kind: 'close'});
      }
    };
    visit(this.root, this.root.type === 'fragment' ? 0 : 0);
    return rows.map((r) => this.row(r));
  }

  row(r) {
    const o = this.options;
    const n = r.n;
    const touched = o.touched?.has(n.id) || (r.kind === 'inline' && o.touched?.has(r.text.id));
    const note = r.kind !== 'close' ? o.notes?.[n.id] ?? (r.kind === 'inline' ? o.notes?.[r.text.id] : undefined) : undefined;
    const cls = `row${this.hover === n.id && r.kind !== 'close' ? ' hover' : ''}${touched && r.kind !== 'close' ? ' touched' : ''}${note ? ' has-note' : ''}`;
    return html`<div class=${cls} @mouseenter=${(e) => this.enter(e, n, note)} @mouseleave=${() => this.leave(n)}>
      <span class="g">${o.walk ? this.gutter(r) : ''}</span>
      <span class="body"><span class="ind">${'  '.repeat(r.depth)}</span>${this.content(r)}${r.kind !== 'close' ? this.badges(n, r) : ''}</span>
    </div>`;
  }

  gutter(r) {
    const n = r.n;
    if (r.kind === 'close') return '';
    if (n.walk !== undefined) {
      const late = this.options.lastVisited !== undefined && n.walk > this.options.lastVisited;
      return html`<span class="ix ${late ? 'late' : ''}" title=${late ? `node ${n.walk}: the walk stopped before this node (it had one part per binding)` : `node ${n.walk}: TreeWalker index (elements and comments)`}>${n.walk}</span>`;
    }
    if (n.type === 'text' || n.type === 'pi') return html`<span class="skip" title="not counted: the TreeWalker shows only elements and comments (NodeFilter.SHOW_ELEMENT | SHOW_COMMENT = 129)">·</span>`;
    return '';
  }

  content(r) {
    const o = this.options;
    const n = r.n;
    const color = o.colors?.[n.id];
    const mk = (text) => markerSpans(text, o.marker, color ? () => color : null);
    switch (r.kind) {
      case 'text': {
        if (n.data === '') return html`<span class="ws" title="an empty Text node">""</span>`;
        const ws = /^\s*$/.test(n.data);
        return ws ? html`<span class="ws" title=${JSON.stringify(n.data)}>${showWs(n.data)}</span>` : html`<span class="tx">"${mk(n.data.replace(/\n/g, '⏎'))}"</span>`;
      }
      case 'comment':
        return html`<span class="com">&lt;!--${mk(n.data)}--&gt;</span>`;
      case 'pi':
        return html`<span class="pi">&lt;?${n.target} ${n.data}&gt;</span>`;
      case 'close':
        return html`<span class="p">&lt;/</span><span class="tag">${n.name}</span><span class="p">&gt;</span>`;
      default: {
        const open = this.open(n);
        if (r.kind === 'leaf') return html`${open}<span class="p">&lt;/</span><span class="tag">${n.name}</span><span class="p">&gt;</span>`;
        if (r.kind === 'inline') {
          const tc = o.colors?.[r.text.id];
          return html`${open}<span class="tx">${markerSpans(r.text.data, o.marker, tc ? () => tc : null)}</span><span class="p">&lt;/</span><span class="tag">${n.name}</span><span class="p">&gt;</span>`;
        }
        return open;
      }
    }
  }

  open(n) {
    const o = this.options;
    const attrs = n.attrs.map(([k, v]) => ({k, v, gone: false}));
    const removed = o.removed?.[n.id] ?? [];
    removed.forEach((a, i) => attrs.splice(Math.min(a.at, attrs.length), 0, {k: a.name, v: a.value, gone: true, color: o.removedColors?.[n.id]?.[i]}));
    return html`<span class="p">&lt;</span><span class="tag">${n.name}</span>${attrs.map((a) => {
      const style = a.color ? `color:${a.color}` : '';
      const mk = (t) => markerSpans(t, o.marker, a.color ? () => a.color : null);
      return html` <span class=${a.gone ? 'gone' : ''} style=${style} title=${a.gone ? 'removed by the walk (bound attribute)' : ''}><span class="an" style=${style}>${mk(a.k)}</span>${a.v === '' && !a.gone ? '' : html`<span class="p">=</span><span class="av" style=${style}>"${mk(a.v)}"</span>`}</span>`;
    })}<span class="p">&gt;</span>`;
  }

  badges(n, r) {
    const marks = [...(this.options.marks?.[n.id] ?? []), ...(r.kind === 'inline' ? this.options.marks?.[r.text.id] ?? [] : [])];
    return marks.map((m) => html`<span class="badge" style="color:${m.color};background:${rgba(m.color, 0.13)};border:1px solid ${rgba(m.color, 0.4)}" title=${m.title ?? ''}>${m.text}</span>`);
  }

  enter(e, n, note) {
    this.hover = n.id;
    this.dispatchEvent(new CustomEvent('node-hover', {detail: {id: n.id, note, rect: e.currentTarget.getBoundingClientRect()}, bubbles: true, composed: true}));
  }

  leave(n) {
    if (this.hover === n.id) this.hover = null;
    this.dispatchEvent(new CustomEvent('node-hover', {detail: {id: null}, bubbles: true, composed: true}));
  }
}
customElements.define('dom-tree', DomTree);

export {bindingColor};
