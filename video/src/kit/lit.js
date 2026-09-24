// The video's vocabulary of lit-html objects, drawn the same way in every
// scene: the example source, the strings and values arrays, TemplateResult,
// the template cache, Template, template parts, TemplateInstance and Parts.
// Data comes from truth/truth.json (what lit-html 3.3.3 actually did).

import { truth } from "../timing.js";
import { B, C, rgba } from "./theme.js";
import { card, cells } from "./objects.js";
import { fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow } from "./draw.js";

// The counter example, exactly as captured in truth/page.js. Every scene
// that shows the example uses this string.
export const COUNTER_SRC = `import {html, render} from 'lit';

const counter = (count) => html\`
  <span class="\${count % 2 ? 'odd' : ''}">\${count}</span>
  <button @click=\${() => render(counter(count + 1), document.body)}>
    Increment
  </button>\`;

render(counter(0), document.body);`;

// The list and greeting examples (also captured in truth/page.js).
export const LIST_SRC = `const list = (items) => html\`
  <ul>\${items.map((item) => html\`<li>\${item}</li>\`)}</ul>\`;

render(list(['Apples', 'Bread', 'Cheese']), document.body);`;

export const GREETING_SRC = `const greeting = (user) => user
  ? html\`<p>Welcome back, \${user}!</p>\`
  : html\`<button>Sign in</button>\`;

const page = (user) => html\`<header>\${greeting(user)}</header>\`;`;

// Object colours: one per kind of object.
export const OBJ = {
  result: "#8fb5ff",     // TemplateResult
  template: "#c3a6ff",   // Template (prepared, cached)
  instance: "#7ad6ff",   // TemplateInstance
  root: "#dfe6ff",       // the root ChildPart made by render()
  cache: "#ffd166",      // the template cache
  dom: "#9db4ff",        // DOM containers (document.body, <template>)
};

// The marker this page load uses, e.g. "lit$480592716$".
export const marker = () => truth().marker;

// A template string shown as a JS literal: '\n  <span class="'. Returns
// pieces [{text, dim}] so "\n" can be drawn dimmer than the HTML.
export function literalPieces(s) {
  const out = [{ text: "'", dim: true }];
  for (const part of s.split(/(\n)/)) {
    if (part === "\n") out.push({ text: "\\n", dim: true });
    else if (part) out.push({ text: part, dim: false });
  }
  out.push({ text: "'", dim: true });
  return out;
}
export const literalText = (s) => literalPieces(s).map((p) => p.text).join("");

// Draws pieces [{text, dim, color}] in a row starting at x (monospace). Returns the width.
export function drawPieces(ctx, pieces, x, y, { size = 24, color = C.text, dimColor = C.text3, baseline = "middle", alpha = 1, weight = 500 } = {}) {
  let w = 0;
  for (const p of pieces) w += text(ctx, p.text, x + w, y, { font: mono(size, weight), color: p.color ?? (p.dim ? dimColor : color), baseline, alpha });
  return w;
}

// The strings array of the counter's TemplateResult, as a row of cells.
//   stringsArray(ctx, { x, y, size, alpha, hl: [u0..u3], cellAlpha: [..], strings })
// Returns cells() geometry: {x, y, w, h, cells}.
export function stringsArray(ctx, { x, y, size = 24, alpha = 1, hl = [], cellAlpha = [], strings = truth().counter.result0.strings, gap = 12 }) {
  const items = strings.map((s, i) => ({ text: literalText(s), color: C.text, alpha: cellAlpha[i] ?? 1, hl: hl[i] ?? 0 }));
  // draw the cells without text, then the text with dim escapes
  const g = cells(ctx, { x, y, items: items.map((it) => ({ ...it, text: it.text, color: "rgba(0,0,0,0)" })), size, alpha, gap });
  withAlpha(ctx, alpha, () => {
    strings.forEach((s, i) => {
      const c = g.cells[i];
      const pieces = literalPieces(s);
      const w = measure(ctx, literalText(s), mono(size, 500));
      withAlpha(ctx, cellAlpha[i] ?? 1, () => drawPieces(ctx, pieces, c.x + (c.w - w) / 2, c.y + c.h / 2 + 1, { size }));
    });
  });
  return g;
}

// The values array: one cell per binding, in the binding's colour.
//   valuesArray(ctx, { x, y, values: ["''", "0", "() => …"], size, alpha, hl, cellAlpha })
export function valuesArray(ctx, { x, y, values, size = 24, alpha = 1, hl = [], cellAlpha = [], gap = 12, colors = B }) {
  return cells(ctx, {
    x, y, size, alpha, gap,
    items: values.map((v, i) => ({ text: v, color: colors[i], alpha: cellAlpha[i] ?? 1, hl: hl[i] ?? 0, bg: rgba(colors[i], 0.1), border: rgba(colors[i], 0.55) })),
  });
}

// How the video writes each value of counter(n): '' / 'odd', the number, and the handler.
export function counterValues(n) {
  return [n % 2 ? "'odd'" : "''", String(n), "() => …"];
}

// A TemplateResult card: {_$litType$: 1, strings, values}. Ports on strings and values.
export function templateResultCard(ctx, { x, y, alpha = 1, glow = 0, size = 24, title = "TemplateResult", sub = null, values = null, w = null }) {
  return card(ctx, {
    x, y, title, sub, color: OBJ.result, alpha, glow, size, w,
    rows: [
      { k: "_$litType$", v: "1", vColor: C.text2 },
      { k: "strings", v: "[…4]", vColor: C.text, port: true },
      { k: "values", v: values ?? "[…3]", vColor: C.text, port: true },
    ],
  });
}

// The template cache: a WeakMap from strings arrays to Templates.
//   cacheTable(ctx, { x, y, w, entries: [{key: "counter strings", u: 1, hl: 0}], lookup: {u, hit}, alpha })
// Returns {x, y, w, h, rows: [{x, y, w, h, keyPort, valuePort}]}.
export function cacheTable(ctx, { x, y, w = 560, entries = [], alpha = 1, glow = 0, title = "templateCache", minRows = 1 }) {
  const head = 52, rh = 62;
  const n = Math.max(minRows, entries.length);
  const h = head + 16 + n * rh + 10;
  const out = { x, y, w, h, rows: [] };
  // row geometry first, so callers get it even when the table is invisible
  for (let i = 0; i < n; i++) {
    const ry = y + head + 34 + i * rh;
    out.rows.push({ x: x + 12, y: ry, w: w - 24, h: rh - 10, keyPort: { x: x + 40, y: ry + (rh - 10) / 2 }, valuePort: { x: x + w * 0.62 + 20, y: ry + (rh - 10) / 2 } });
  }
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, x, y, w, h, 14, C.panel);
    ctx.restore();
    if (glow > 0) withGlow(ctx, rgba(OBJ.cache, 0.8 * glow), 28 * glow, () => strokeRR(ctx, x, y, w, h, 14, rgba(OBJ.cache, glow), 2.5));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.clip();
    ctx.fillStyle = rgba(OBJ.cache, 0.13);
    ctx.fillRect(x, y, w, head);
    ctx.restore();
    text(ctx, title, x + 20, y + head / 2 + 1, { font: mono(24, 600), color: OBJ.cache, baseline: "middle" });
    text(ctx, "WeakMap", x + w - 20, y + head / 2 + 1, { font: sans(18, 500), color: C.text3, baseline: "middle", align: "right" });
    text(ctx, "strings array", x + 24, y + head + 20, { font: sans(16, 600), color: C.text3, baseline: "middle" });
    text(ctx, "Template", x + w * 0.62, y + head + 20, { font: sans(16, 600), color: C.text3, baseline: "middle" });
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14, rgba(OBJ.cache, 0.5), 1.5);
    for (let i = 0; i < n; i++) {
      const row = out.rows[i], ry = row.y;
      const e = entries[i];
      if (!e) {
        text(ctx, "(empty)", x + w / 2, ry + (rh - 10) / 2, { font: sans(20, 450, "italic"), color: C.text4, align: "center", baseline: "middle" });
        continue;
      }
      withAlpha(ctx, e.u ?? 1, () => {
        fillRR(ctx, row.x, row.y, row.w, row.h, 10, e.hl ? rgba(e.hlColor ?? OBJ.cache, 0.14 + 0.1 * e.hl) : C.panel2);
        if (e.hl) withAlpha(ctx, e.hl, () => strokeRR(ctx, row.x, row.y, row.w, row.h, 10, e.hlColor ?? OBJ.cache, 2));
        miniStrings(ctx, x + 26, ry + (rh - 10) / 2 - 12, e.keyColor ?? C.text2);
        text(ctx, e.key, x + 84, ry + (rh - 10) / 2 + 1, { font: mono(20, 500), color: C.text, baseline: "middle" });
        text(ctx, "→", x + w * 0.55, ry + (rh - 10) / 2, { font: sans(24, 500), color: C.text3, baseline: "middle", align: "center" });
        text(ctx, e.value ?? "Template", x + w * 0.62, ry + (rh - 10) / 2 + 1, { font: mono(21, 600), color: OBJ.template, baseline: "middle" });
      });
    }
  });
  return out;
}

// A tiny glyph of a strings array (four stacked slivers): the cache key.
export function miniStrings(ctx, x, y, color = C.text2, k = 1) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha *= 1;
    ctx.beginPath();
    ctx.roundRect(x + i * 11 * k, y, 8 * k, 24 * k, 2 * k);
    ctx.fill();
  }
  ctx.restore();
}

// Template parts as lit-html records them, from truth.
export const PART_TYPE = { 1: "ATTRIBUTE_PART", 2: "CHILD_PART", 6: "ELEMENT_PART", 7: "COMMENT_PART" };
export const templateParts = () => truth().counter.render0.events.find((e) => e.kind === "template prep").parts;

// One template part record: { type, index, name, ctor }.
export function templatePartCard(ctx, { x, y, part, color, alpha = 1, glow = 0, size = 22, w = null }) {
  const rows = [
    { k: "type", v: `${part.type}  // ${PART_TYPE[part.type]}`, vColor: C.text },
    { k: "index", v: String(part.index), vColor: color },
  ];
  if (part.name !== undefined) rows.push({ k: "name", v: `'${part.name}'`, vColor: C.text });
  if (part.ctor) rows.push({ k: "ctor", v: part.ctor, vColor: color });
  return card(ctx, { x, y, title: "template part", color, rows, alpha, glow, size, w, keyW: measure(ctx, "index:", mono(size, 450)) });
}

// A runtime Part: AttributePart / ChildPart / EventPart, with the node it
// holds and its last committed value.
export function partCard(ctx, { x, y, kind, node, name = null, committed = "nothing", color, alpha = 1, glow = 0, size = 22, w = null, hl = {} }) {
  const rows = [];
  if (kind === "ChildPart") rows.push({ k: "startNode", v: node, vColor: C.text, port: true, hl: hl.node ?? 0 });
  else rows.push({ k: "element", v: node, vColor: C.text, port: true, hl: hl.node ?? 0 });
  if (name) rows.push({ k: "name", v: `'${name}'`, vColor: C.text });
  rows.push({ k: "_$committedValue", v: committed, vColor: committed === "nothing" ? C.text3 : color, hl: hl.committed ?? 0 });
  return card(ctx, { x, y, title: kind, color, rows, alpha, glow, size, w });
}

// The marker string, drawn with its digits a shade dimmer.
export function markerPieces(prefix = "", suffix = "", color = C.text) {
  const m = marker();
  return [
    { text: prefix, color: C.text2 },
    { text: "lit$", color },
    { text: m.slice(4, -1), color: rgba(color, 0.7) },
    { text: "$", color },
    { text: suffix, color: C.text2 },
  ];
}
