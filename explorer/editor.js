// <code-editor>: a textarea over a highlighted copy of its text. JavaScript,
// with the HTML inside html``/svg``/mathml`` templates highlighted too, and
// each ${…} of a template in its binding's colour (binding k of its own
// template, the same numbering as the TemplateResult's values).

import {LitElement, html, css} from 'lit';
import {shared, bindingColor, rgba} from './theme.js';

const KEYWORDS = new Set(('await break case catch class const continue debugger default delete do else export extends false finally for from function ' +
  'if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while with yield async as').split(' '));
const TAGS = new Set(['html', 'svg', 'mathml']);

// Tokens: {text, c (class), bind (binding colour index, for ${ and }), tint (list of binding indices the token is inside)}
export function tokenize(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  // stack of contexts: {t: 'js', depth, bind} | {t: 'tpl', tagged, count, h (html state)}
  const stack = [{t: 'js', depth: 0, bind: null}];
  let prevSig = ''; // previous significant token, for regex detection and tags
  const tints = () => stack.filter((s) => s.t === 'js' && s.bind !== null).map((s) => s.bind);
  const push = (text, c, extra) => {
    if (text) out.push({text, c, tint: tints(), ...extra});
  };
  while (i < n) {
    const ctx = stack.at(-1);
    if (ctx.t === 'tpl') {
      // static text up to ` or ${
      let j = i;
      while (j < n && src[j] !== '`' && !(src[j] === '$' && src[j + 1] === '{')) j += src[j] === '\\' ? 2 : 1;
      const text = src.slice(i, j);
      if (ctx.tagged) htmlTokens(text, ctx, push);
      else push(text, 'str');
      i = j;
      if (i >= n) break;
      if (src[i] === '`') {
        push('`', ctx.tagged ? 'tick' : 'str');
        stack.pop();
        prevSig = '`';
        i++;
      } else {
        const k = ctx.count++;
        stack.push({t: 'js', depth: 0, bind: {k, tpl: ctx}});
        out.push({text: '${', c: 'bind-open', bind: k, tint: tints()});
        i += 2;
        prevSig = '{';
      }
      continue;
    }
    const ch = src[i];
    // whitespace
    if (/\s/.test(ch)) {
      let j = i;
      while (j < n && /\s/.test(src[j])) j++;
      push(src.slice(i, j), 'ws');
      i = j;
      continue;
    }
    // comments
    if (ch === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i);
      if (j < 0) j = n;
      push(src.slice(i, j), 'com');
      i = j;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j < 0 ? n : j + 2;
      push(src.slice(i, j), 'com');
      i = j;
      continue;
    }
    // strings
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && src[j] !== ch && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      j = Math.min(n, j + 1);
      push(src.slice(i, j), 'str');
      i = j;
      prevSig = 'str';
      continue;
    }
    if (ch === '`') {
      const tagged = TAGS.has(prevSig);
      push('`', tagged ? 'tick' : 'str');
      stack.push({t: 'tpl', tagged, count: 0, h: {s: 'text'}});
      i++;
      continue;
    }
    // regex literal (after an operator or keyword)
    if (ch === '/' && (prevSig === '' || /^[(,=:[!&|?{};+\-*%<>~^]$/.test(prevSig) || prevSig === 'return' || prevSig === 'typeof')) {
      let j = i + 1;
      let cls = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') j++;
        else if (src[j] === '[') cls = true;
        else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/.test(src[j])) j++;
      push(src.slice(i, j), 'str');
      i = j;
      prevSig = 'regex';
      continue;
    }
    // numbers
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(?:0[xob][\da-f_]+|\d[\d_]*\.?\d*(?:e[+-]?\d+)?|\.\d+)n?/i.exec(src.slice(i));
      push(m[0], 'num');
      i += m[0].length;
      prevSig = 'num';
      continue;
    }
    // identifiers
    if (/[A-Za-z_$]/.test(ch)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
      const w = m[0];
      const after = src.slice(i + w.length).match(/^\s*(.)/)?.[1];
      const c = KEYWORDS.has(w) ? 'kw' : TAGS.has(w) && after === '`' ? 'fn' : after === '(' ? 'fn' : prevSig === '.' ? 'prop' : 'id';
      push(w, c);
      i += w.length;
      prevSig = w;
      continue;
    }
    // punctuation, and the braces that end a ${…}
    if (ch === '{') ctx.depth++;
    if (ch === '}') {
      if (ctx.depth === 0 && ctx.bind) {
        stack.pop();
        out.push({text: '}', c: 'bind-close', bind: ctx.bind.k, tint: tints()});
        i++;
        prevSig = '}';
        continue;
      }
      ctx.depth--;
    }
    push(ch, 'p');
    prevSig = ch;
    i++;
  }
  return out;
}

// A small HTML lexer for the static text of a tagged template; its state
// carries across the ${…} holes.
function htmlTokens(text, ctx, push) {
  const h = ctx.h;
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (h.s === 'comment') {
      const j = text.indexOf('-->', i);
      const e = j < 0 ? n : j + 3;
      push(text.slice(i, e), 'h-com');
      if (j >= 0) h.s = 'text';
      i = e;
    } else if (h.s === 'text') {
      if (text.startsWith('<!--', i)) {
        h.s = 'comment';
        continue;
      }
      const m = /^<\/?[A-Za-z][^\s/>]*/.exec(text.slice(i));
      if (m) {
        push(m[0][1] === '/' ? '</' : '<', 'h-p');
        push(m[0].slice(m[0][1] === '/' ? 2 : 1), 'h-tag');
        i += m[0].length;
        h.s = 'tag';
        continue;
      }
      let j = text.indexOf('<', i + 1);
      if (j < 0) j = n;
      if (text[i] === '<') j = Math.max(j, i + 1);
      push(text.slice(i, j), 'h-text');
      i = j;
    } else if (h.s === 'tag') {
      const ch = text[i];
      if (ch === '>' || (ch === '/' && text[i + 1] === '>')) {
        const t = ch === '>' ? '>' : '/>';
        push(t, 'h-p');
        i += t.length;
        h.s = 'text';
      } else if (/\s/.test(ch)) {
        let j = i;
        while (j < n && /\s/.test(text[j])) j++;
        push(text.slice(i, j), 'ws');
        i = j;
      } else if (ch === '=') {
        push('=', 'h-p');
        i++;
        h.s = 'value';
      } else {
        const m = /^[^\s"'>=/]+/.exec(text.slice(i)) ?? [ch];
        push(m[0], 'h-attr');
        i += m[0].length;
      }
    } else if (h.s === 'value') {
      const ch = text[i];
      if (ch === '"' || ch === "'") {
        const j = text.indexOf(ch, i + 1);
        if (j < 0) {
          push(text.slice(i), 'h-val');
          h.s = 'quoted';
          h.q = ch;
          i = n;
        } else {
          push(text.slice(i, j + 1), 'h-val');
          i = j + 1;
          h.s = 'tag';
        }
      } else if (/\s/.test(ch)) {
        push(ch, 'ws');
        i++;
      } else {
        const m = /^[^\s>]+/.exec(text.slice(i)) ?? [ch];
        push(m[0], 'h-val');
        i += m[0].length;
        h.s = 'tag';
      }
    } else if (h.s === 'quoted') {
      const j = text.indexOf(h.q, i);
      if (j < 0) {
        push(text.slice(i), 'h-val');
        i = n;
      } else {
        push(text.slice(i, j + 1), 'h-val');
        i = j + 1;
        h.s = 'tag';
      }
    }
  }
  // A hole right after `name=` leaves the value unquoted: the hole is the value.
  if (h.s === 'value') h.s = 'tag';
}

export class CodeEditor extends LitElement {
  static properties = {
    value: {},
    errorLine: {type: Number},
  };

  static styles = [shared, css`
    :host { display: block; position: relative; min-height: 0; }
    .scroller { position: absolute; inset: 0; overflow: auto; background: #0d1427; }
    .inner { display: flex; min-width: max-content; min-height: 100%; }
    .gutter { flex: none; padding: 12px 8px 12px 10px; text-align: right; color: var(--text4); user-select: none;
      font: 12.5px/20px var(--mono); background: #0d1427; position: sticky; left: 0; z-index: 2; border-right: 1px solid #1c2645; }
    .gutter .err { color: var(--bad); }
    .code { position: relative; flex: 1; }
    pre, textarea {
      margin: 0; padding: 12px 12px 40px 12px; border: 0; font: 12.5px/20px var(--mono); font-variant-ligatures: none;
      tab-size: 2; white-space: pre; letter-spacing: 0;
    }
    pre { color: var(--syn-ident); pointer-events: none; min-height: 100%; }
    textarea {
      position: absolute; inset: 0; width: 100%; height: 100%; resize: none; outline: none; overflow: hidden;
      background: transparent; color: transparent; caret-color: #e9edf8; -webkit-text-fill-color: transparent;
    }
    textarea::selection { background: rgba(122,162,255,.35); -webkit-text-fill-color: transparent; }
    .errline { position: absolute; left: 0; right: 0; height: 20px; background: rgba(255,107,107,.13); border-left: 2px solid var(--bad); pointer-events: none; }
    .kw { color: var(--syn-keyword); }
    .fn { color: var(--syn-fn); }
    .id { color: var(--syn-ident); }
    .prop { color: var(--syn-prop); }
    .str { color: var(--syn-string); }
    .num { color: var(--syn-number); }
    .com { color: var(--syn-comment); font-style: italic; }
    .p { color: var(--syn-punct); }
    .tick { color: var(--syn-fn); }
    .h-tag { color: var(--syn-tag); }
    .h-attr { color: var(--syn-attr); }
    .h-val { color: var(--syn-attrValue); }
    .h-p { color: var(--syn-htmlPunct); }
    .h-text { color: var(--syn-text); }
    .h-com { color: #7fcf9a; }
    .bind { font-weight: 700; }
  `];

  constructor() {
    super();
    this.value = '';
    this.errorLine = 0;
  }

  get textarea() {
    return this.renderRoot.querySelector('textarea');
  }

  render() {
    const tokens = tokenize(this.value);
    const lines = this.value.split('\n').length;
    return html`
      <div class="scroller">
        <div class="inner">
          <div class="gutter" aria-hidden="true">${Array.from({length: lines}, (_, i) => html`<div class=${i + 1 === this.errorLine ? 'err' : ''}>${i + 1}</div>`)}</div>
          <div class="code">
            ${this.errorLine ? html`<div class="errline" style="top:${12 + (this.errorLine - 1) * 20}px"></div>` : ''}
            <pre aria-hidden="true">${tokens.map((t) => this.token(t))}${'\n'}</pre>
            <textarea spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="Code"
              .value=${this.value} @input=${this.onInput} @keydown=${this.onKeydown}></textarea>
          </div>
        </div>
      </div>`;
  }

  token(t) {
    const tint = t.tint?.length ? t.tint.map((b) => rgba(bindingColor(b.k), 0.11)) : null;
    const style = tint ? `background:${tint.at(-1)}` : '';
    if (t.bind !== undefined) {
      const col = bindingColor(t.bind);
      return html`<span class="bind" style="color:${col};background:${rgba(col, 0.2)}">${t.text}</span>`;
    }
    return html`<span class=${t.c} style=${style}>${t.text}</span>`;
  }

  onInput(e) {
    this.value = e.target.value;
    this.errorLine = 0;
    this.dispatchEvent(new CustomEvent('code-change', {detail: this.value}));
  }

  onKeydown(e) {
    const ta = e.target;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('run', {bubbles: true, composed: true}));
      return;
    }
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (!e.shiftKey) document.execCommand('insertText', false, '  ');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const before = ta.value.slice(0, ta.selectionStart);
      const indent = /[^\n]*$/.exec(before)[0].match(/^[ \t]*/)[0];
      e.preventDefault();
      document.execCommand('insertText', false, '\n' + indent);
    }
  }
}
customElements.define('code-editor', CodeEditor);
