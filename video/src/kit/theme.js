// The palette and type scale. See docs/STYLE.md for how they're used.

import { FONT } from "../fonts.js";
export { FONT };

export const C = {
  bg: "#090e1c",          // background, edges
  bg2: "#111a33",         // background, centre
  grid: "rgba(150,170,230,0.075)",
  panel: "#121a30",       // panel body
  panel2: "#18223e",      // panel header / raised
  panel3: "#1f2a4a",      // hover / selected row
  border: "#2a3558",
  border2: "#3c4a78",
  text: "#e9edf8",        // primary text
  text2: "#a6b0cc",       // secondary
  text3: "#6c7896",       // tertiary / captions
  text4: "#465170",       // disabled, skipped
  accent: "#7aa2ff",      // UI accent (phases, focus rings, arrows)
  ok: "#5ee38b",
  bad: "#ff6b6b",
  white: "#ffffff",
};

// The three bindings of the counter template, in template order. Everything
// that belongs to binding k (its ${...}, its value, its marker, its template
// part, its Part, the DOM it writes) is drawn in B[k].
export const B = ["#ffb547", "#2fd6c9", "#ff6fae"];
export const BNAME = ["class", "count", "click"];

// JavaScript syntax
export const SYN = {
  keyword: "#b7a6f7",
  fn: "#8fb5ff",
  ident: "#e3e8f5",
  prop: "#c6d0ea",
  string: "#a8d8a0",
  number: "#efb0a2",
  punct: "#8a95b5",
  comment: "#5f6a88",
  // HTML inside template literals
  tag: "#9db4ff",
  attr: "#d0d8ee",
  attrValue: "#a8d8a0",
  text: "#e3e8f5",
  htmlPunct: "#7f8aab",
};

// DOM views (the <template>, the page, the devtools panel)
export const DOMC = {
  tag: "#9db4ff",
  attr: "#d0d8ee",
  value: "#f0c9a0",
  comment: "#7fcf9a",
  text: "#e3e8f5",
  punct: "#7f8aab",
  whitespace: "#465170",
};

// Type scale, in px at 1920x1080.
export const SIZE = {
  title: 88,
  h1: 58,
  h2: 42,
  body: 32,
  label: 26,
  small: 21,
  tiny: 17,
  code: 30,
  codeSmall: 24,
};

// "#rrggbb" + alpha -> "rgba(...)"
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Blend two "#rrggbb" colours.
export function blend(h1, h2, u) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - u) + ((b >> s) & 255) * u);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
