// Small renderers shared by the pipeline views: JS string literals, values,
// Parts, markers.

import {html} from 'lit';
import {bindingColor, OBJ, rgba} from './theme.js';

// A string as a JS literal, with escapes dimmed: '\n  <span class="'
export function strLit(s, {quote = "'"} = {}) {
  const out = [html`<span class="esc">${quote}</span>`];
  let buf = '';
  const flush = () => {
    if (buf) out.push(buf);
    buf = '';
  };
  for (const ch of s) {
    if (ch === '\n' || ch === '\t' || ch === '\r' || ch === '\\' || ch === quote) {
      flush();
      const e = ch === '\n' ? '\\n' : ch === '\t' ? '\\t' : ch === '\r' ? '\\r' : '\\' + ch;
      out.push(html`<span class="esc">${e}</span>`);
    } else buf += ch;
  }
  flush();
  out.push(html`<span class="esc">${quote}</span>`);
  return out;
}

export const TYPE_NAME = {1: 'html', 2: 'svg', 3: 'mathml'};
export const PART_TYPE = {1: 'ATTRIBUTE_PART', 2: 'CHILD_PART', 3: 'PROPERTY_PART', 4: 'BOOLEAN_ATTRIBUTE_PART', 5: 'EVENT_PART', 6: 'ELEMENT_PART', 7: 'COMMENT_PART'};

// A value record from frame.js desc(), as code.
export function valueT(d, {color, onResult, max = 70} = {}) {
  if (!d) return html`<span class="dim">?</span>`;
  const style = color ? `color:${color}` : '';
  switch (d.k) {
    case 'string': {
      const s = d.v.length > max ? d.v.slice(0, max) + '…' : d.v;
      return html`<span style=${style}>${strLit(s)}</span>`;
    }
    case 'number':
    case 'boolean':
    case 'bigint':
      return html`<span style=${style}>${d.v}</span>`;
    case 'undefined':
    case 'null':
      return html`<span style=${style}>${d.k}</span>`;
    case 'nothing':
      return html`<span style=${style} title="lit-html's nothing: Symbol.for('lit-nothing')">nothing</span>`;
    case 'noChange':
      return html`<span style=${style} title="lit-html's noChange: Symbol.for('lit-noChange')">noChange</span>`;
    case 'symbol':
      return html`<span style=${style}>${d.v}</span>`;
    case 'function': {
      const s = d.v.length > max ? d.v.slice(0, max - 1) + '…' : d.v;
      return html`<span style=${style} title=${d.v}>${s}</span>`;
    }
    case 'result':
      return resultChip(d.id, onResult, d.type);
    case 'directive':
      return html`<span style=${style} title="a DirectiveResult: {_$litDirective$: ${d.name}, values}">DirectiveResult<span class="dim">(</span>${d.name}<span class="dim">, [</span>${d.values.map((v, i) => html`${i ? html`<span class="dim">, </span>` : ''}${valueT(v, {onResult, max: 24})}`)}<span class="dim">])</span></span>`;
    case 'array': {
      const shown = d.items.slice(0, 8);
      return html`<span style=${style}><span class="dim">[</span>${shown.map((v, i) => html`${i ? html`<span class="dim">, </span>` : ''}${valueT(v, {onResult, max: 30})}`)}${d.length > shown.length ? html`<span class="dim">, …${d.length - shown.length} more</span>` : ''}<span class="dim">]</span></span>`;
    }
    case 'node':
      return html`<span style=${style}>${d.v}</span>`;
    case 'iterable':
      return html`<span style=${style}>${d.name || 'iterable'} {…}</span>`;
    default:
      return html`<span style=${style}>${d.v ?? d.name ?? 'object'}</span>`;
  }
}

export function resultChip(id, onResult, type) {
  return html`<a class="objref" style="--c:${OBJ.result}" href="#" @click=${(e) => {
    e.preventDefault();
    onResult?.(id);
  }} title="a TemplateResult${type && type !== 1 ? ` (${TYPE_NAME[type]}\`\`)` : ''}">TemplateResult #${id}</a>`;
}

export const objStyle = (color) => `--c:${color}`;

// The marker, with its digits a shade dimmer.
export function markerT(marker, color) {
  return html`<span class="mk" style=${color ? `color:${color}` : ''}>lit$<span class="digits">${marker.slice(4, -1)}</span>$</span>`;
}

// Text with every occurrence of the marker highlighted: occurrence k in
// binding colour k (for annotated HTML, occurrence k is hole k).
export function withMarkers(text, marker, {byOccurrence = true, color} = {}) {
  const parts = text.split(marker);
  const out = [];
  parts.forEach((p, i) => {
    if (p) out.push(nlT(p));
    if (i < parts.length - 1) {
      const c = color ?? (byOccurrence ? bindingColor(i) : '#ffd166');
      out.push(html`<span class="mkbox" style="color:${c};background:${rgba(c, 0.13)}">${markerT(marker)}</span>`);
    }
  });
  return out;
}

// Newlines as a dim ↵ and a real line break.
export function nlT(s) {
  if (!s.includes('\n')) return s;
  const parts = s.split('\n');
  return parts.map((x, k) => (k < parts.length - 1 ? html`${x}<span class="nl">↵</span>\n` : x));
}

// Where a Part lives, in words.
export function partWhere(ref) {
  if (!ref) return '';
  if (ref.root) return 'the root ChildPart (container._$litPart$)';
  if (ref.instance !== undefined) return `TemplateInstance #${ref.instance}, _$parts[${ref.index}]`;
  if (ref.item !== undefined) {
    const of = ref.of ? partShort(ref.of) : 'a ChildPart';
    return ref.item >= 0 ? `item ${ref.item} of ${of}${ref.directive ? ` (${ref.directive})` : ''}` : `an item of ${of}${ref.directive ? ` (${ref.directive})` : ''}`;
  }
  return '';
}

export function partShort(ref) {
  if (!ref) return '';
  if (ref.root) return 'root ChildPart';
  if (ref.instance !== undefined) return `#${ref.instance}[${ref.index}] ${ref.ctor}${ref.name !== undefined ? ` ${ref.name}` : ''}`;
  if (ref.item !== undefined) return `item ${ref.item >= 0 ? ref.item : '?'} of ${partShort(ref.of)}`;
  return ref.ctor;
}

// Value index of each template part (how many values each consumes, in
// order): an attribute part takes strings.length - 1, the rest one each.
// (TemplateInstance._update steps through values the same way.)
export function valueIndices(parts) {
  let v = 0;
  return parts.map((p) => {
    const first = v;
    v += p.type === 1 && p.strings ? p.strings.length - 1 : 1;
    return first;
  });
}

// The colour of a part: its first binding's.
export const partColor = (firstValue) => bindingColor(firstValue);
