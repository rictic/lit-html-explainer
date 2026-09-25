// The explorer's palette and shared styles: the video's visual language
// (docs/STYLE.md, video/src/kit/theme.js and kit/lit.js), for the DOM.

import {css, unsafeCSS} from 'lit';

export const C = {
  bg: '#090e1c',
  bg2: '#111a33',
  panel: '#121a30',
  panel2: '#18223e',
  panel3: '#1f2a4a',
  border: '#2a3558',
  border2: '#3c4a78',
  text: '#e9edf8',
  text2: '#a6b0cc',
  text3: '#6c7896',
  text4: '#465170',
  accent: '#7aa2ff',
  ok: '#5ee38b',
  bad: '#ff6b6b',
  warn: '#ffd166',
};

// Binding colours. The video's three (amber, teal, pink) come first, in
// template order; templates with more bindings continue with further hues
// chosen to stay distinct from them and from the object colours below.
export const B = ['#ffb547', '#2fd6c9', '#ff6fae', '#b4e35c', '#a58bff', '#ff8f5e', '#5fb8ff', '#f2e36b', '#e39cff', '#6fe0b0'];
export const bindingColor = (k) => B[((k % B.length) + B.length) % B.length];

// One colour per kind of object (kit/lit.js OBJ).
export const OBJ = {
  result: '#8fb5ff', // TemplateResult
  template: '#c3a6ff', // Template (prepared, cached)
  instance: '#7ad6ff', // TemplateInstance
  root: '#dfe6ff', // the root ChildPart made by render()
  cache: '#ffd166', // the template cache
  dom: '#9db4ff',
};

// DOM views (kit/theme.js DOMC).
export const DOMC = {
  tag: '#9db4ff',
  attr: '#d0d8ee',
  value: '#f0c9a0',
  comment: '#7fcf9a',
  text: '#e3e8f5',
  punct: '#7f8aab',
  whitespace: '#465170',
};

// JavaScript syntax (kit/theme.js SYN).
export const SYN = {
  keyword: '#b7a6f7',
  fn: '#8fb5ff',
  ident: '#e3e8f5',
  prop: '#c6d0ea',
  string: '#a8d8a0',
  number: '#efb0a2',
  punct: '#8a95b5',
  comment: '#5f6a88',
  tag: '#9db4ff',
  attr: '#d0d8ee',
  attrValue: '#a8d8a0',
  text: '#e3e8f5',
  htmlPunct: '#7f8aab',
};

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Custom properties on :host of every component, and the pieces they share.
const vars = Object.entries({...C}).map(([k, v]) => `--${k}: ${v};`).join('\n') +
  Object.entries(OBJ).map(([k, v]) => `--obj-${k}: ${v};`).join('\n') +
  Object.entries(DOMC).map(([k, v]) => `--dom-${k}: ${v};`).join('\n') +
  Object.entries(SYN).map(([k, v]) => `--syn-${k}: ${v};`).join('\n');

export const shared = css`
  :host {
    ${unsafeCSS(vars)}
    --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --sans: Inter, system-ui, sans-serif;
    box-sizing: border-box;
    font-variant-ligatures: none;
    font-feature-settings: "calt" 0, "liga" 0;
  }
  *, *::before, *::after { box-sizing: border-box; }
  /* No ligatures or contextual forms anywhere (JetBrains Mono would draw
     <!-- and --> as arrows). !important because every font: shorthand
     resets these properties. */
  :host, * { font-variant-ligatures: none !important; font-feature-settings: "calt" 0, "liga" 0 !important; }
  .mono, code { font-family: var(--mono); font-variant-ligatures: none; }
  code { font-size: 0.94em; color: #c6d0ea; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .dim { color: var(--text3); }
  .dim2 { color: var(--text4); }
  .src {
    font: 500 11px/1 var(--mono); color: var(--text3); border: 1px solid var(--border); border-radius: 5px;
    padding: 2px 5px; white-space: nowrap; vertical-align: 1px; font-variant-ligatures: none;
  }
  .src:hover { color: var(--accent); border-color: var(--accent); text-decoration: none; }
  .chip {
    display: inline-flex; align-items: center; gap: 5px; font: 600 11.5px/1 var(--sans); letter-spacing: .02em;
    padding: 4px 8px; border-radius: 999px; white-space: nowrap; border: 1px solid transparent;
  }
  .chip.ok { color: var(--ok); background: rgba(94,227,139,.1); border-color: rgba(94,227,139,.35); }
  .chip.bad { color: var(--bad); background: rgba(255,107,107,.1); border-color: rgba(255,107,107,.35); }
  .chip.warn { color: var(--warn); background: rgba(255,209,102,.1); border-color: rgba(255,209,102,.35); }
  .chip.muted { color: var(--text3); background: rgba(108,120,150,.1); border-color: var(--border); }
  .chip.accent { color: var(--accent); background: rgba(122,162,255,.1); border-color: rgba(122,162,255,.35); }
  .kv { display: grid; grid-template-columns: max-content 1fr; gap: 3px 12px; font: 12.5px/1.5 var(--mono); }
  .kv > .k { color: var(--text3); }
  .ws { color: var(--dom-whitespace); }
  .esc { color: var(--text3); }
  button { font-family: var(--sans); }
`;

export const sectionStyles = css`
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .card-head {
    display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--panel2);
    border-bottom: 1px solid var(--border); font: 600 13px/1.3 var(--sans); flex-wrap: wrap;
  }
  .card-head .title { font: 600 13px/1.2 var(--mono); }
  .card-head .grow { flex: 1; }
  .card-body { padding: 10px 12px; }
  .sub { font: 600 11px/1 var(--sans); letter-spacing: .08em; text-transform: uppercase; color: var(--text3); margin: 12px 0 7px; display: flex; gap: 8px; align-items: center; }
  .sub:first-child { margin-top: 2px; }
  .note { font: 13px/1.5 var(--sans); color: var(--text2); }
  .note code { font-size: 12.5px; }
`;
