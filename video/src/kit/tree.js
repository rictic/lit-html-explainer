// DOM trees drawn like a devtools Elements panel: one row per open tag,
// close tag, text or comment, indented by depth. Nodes come from
// truth/truth.json ({type, name, attrs, children, data}).
//
//   const tree = new Tree(node, { size: 26, whitespace: "show" | "hide", inline: true });
//   tree.draw(ctx, x, y, { style: (seg, row) => ({color, alpha, hide, dx}) , rowStyle: (row) => ({alpha, dx, dy}) });
//   tree.rows                     [{path, node, depth, kind, segs: [{text, role, attr}] }]
//   tree.rowOf(path, kind)        a row by node path ([1, 0] = second child's first child)
//   tree.rowRect(ctx, x, y, row)  the row's text extent, in px
//   tree.walk                     rows lit-html's TreeWalker visits (elements and comments), in order
//
// Segment roles: punct tag attrName attrEq attrValue comment text ws.

import { DOMC } from "./theme.js";
import { mono, monoAdvance, setFont } from "./draw.js";

const ROLE_COLOR = {
  punct: DOMC.punct, tag: DOMC.tag, attrName: DOMC.attr, attrEq: DOMC.punct, attrValue: DOMC.value,
  comment: DOMC.comment, text: DOMC.text, ws: DOMC.whitespace,
};

// How whitespace-only text looks when shown: newlines as ⏎, spaces as ·.
export const showWs = (s) => s.replace(/\n/g, "⏎").replace(/ /g, "·");

export class Tree {
  constructor(root, { size = 26, lineHeight = 1.5, indent = 2, whitespace = "hide", inline = true, weight = 450 } = {}) {
    this.size = size;
    this.lh = size * lineHeight;
    this.indent = indent; // in characters
    this.weight = weight;
    this.rows = [];
    const visit = (n, path, depth) => {
      if (n.type === "text") {
        const ws = /^\s*$/.test(n.data);
        if (ws && whitespace === "hide") return;
        const t = ws ? showWs(n.data) : `"${n.data.replace(/\s+/g, " ").trim()}"`;
        this.rows.push({ path, node: n, depth, kind: "text", segs: [{ text: t, role: ws ? "ws" : "text" }] });
        return;
      }
      if (n.type === "comment") {
        this.rows.push({ path, node: n, depth, kind: "comment", segs: [{ text: `<!--${n.data}-->`, role: "comment" }] });
        return;
      }
      if (n.type === "fragment") {
        n.children.forEach((c, i) => visit(c, [...path, i], depth));
        return;
      }
      const open = [{ text: "<", role: "punct" }, { text: n.name, role: "tag" }];
      n.attrs.forEach(([k, v], a) => {
        open.push({ text: " ", role: "punct", attr: a });
        open.push({ text: k, role: "attrName", attr: a });
        open.push({ text: '="', role: "attrEq", attr: a });
        open.push({ text: v, role: "attrValue", attr: a });
        open.push({ text: '"', role: "attrEq", attr: a });
      });
      open.push({ text: ">", role: "punct" });
      const close = [{ text: "</", role: "punct" }, { text: n.name, role: "tag" }, { text: ">", role: "punct" }];
      const kids = n.children.filter((c) => !(whitespace === "hide" && c.type === "text" && /^\s*$/.test(c.data)));
      if (kids.length === 0) {
        this.rows.push({ path, node: n, depth, kind: "leaf", segs: [...open, ...close] });
        return;
      }
      if (inline && kids.length === 1 && kids[0].type === "text") {
        const t = kids[0].data.replace(/\s+/g, " ").trim();
        this.rows.push({ path, node: n, depth, kind: "leaf", segs: [...open, { text: t, role: "text", child: n.children.indexOf(kids[0]) }, ...close] });
        return;
      }
      this.rows.push({ path, node: n, depth, kind: "open", segs: open });
      n.children.forEach((c, i) => visit(c, [...path, i], depth + 1));
      this.rows.push({ path, node: n, depth, kind: "close", segs: close });
    };
    visit(root, [], 0);
    this.rows.forEach((r, i) => (r.index = i));
    // the rows lit-html's walker visits: elements (their first row) and comments
    this.walk = this.rows.filter((r) => r.kind === "open" || r.kind === "leaf" || r.kind === "comment");
    this.cols = Math.max(...this.rows.map((r) => r.depth * this.indent + r.segs.reduce((n, s) => n + s.text.length, 0)));
  }

  adv(ctx) { return monoAdvance(ctx, this.size, this.weight); }
  get height() { return this.rows.length * this.lh; }
  width(ctx) { return this.cols * this.adv(ctx); }

  rowOf(path, kind = null) {
    const key = path.join(",");
    const r = this.rows.find((r) => r.path.join(",") === key && (!kind || r.kind === kind || (kind === "open" && r.kind === "leaf")));
    if (!r) throw new Error(`tree: no row for [${key}] ${kind ?? ""}`);
    return r;
  }

  // Column where segment j of a row starts.
  segCol(row, j) {
    let c = row.depth * this.indent;
    for (let k = 0; k < j; k++) c += row.segs[k].text.length;
    return c;
  }

  rowY(y, row) { return y + row.index * this.lh; }

  rowRect(ctx, x, y, row, { from = 0, to = row.segs.length } = {}) {
    const a = this.adv(ctx);
    const c0 = this.segCol(row, from), c1 = this.segCol(row, to);
    return { x: x + c0 * a, y: this.rowY(y, row) + (this.lh - this.size * 1.3) / 2, w: (c1 - c0) * a, h: this.size * 1.3 };
  }

  // The rect of one attribute (name through closing quote) of a row.
  attrRect(ctx, x, y, row, a) {
    const js = row.segs.map((s, j) => (s.attr === a && s.text !== " " ? j : -1)).filter((j) => j >= 0);
    return this.rowRect(ctx, x, y, row, { from: js[0], to: js.at(-1) + 1 });
  }

  draw(ctx, x, y, { alpha = 1, style = null, rowStyle = null } = {}) {
    if (alpha <= 0) return;
    const a = this.adv(ctx);
    ctx.save();
    ctx.globalAlpha *= alpha;
    setFont(ctx, mono(this.size, this.weight));
    ctx.textBaseline = "alphabetic";
    for (const row of this.rows) {
      const rs = rowStyle ? rowStyle(row) ?? {} : {};
      if (rs.hide || rs.alpha === 0) continue;
      const by = this.rowY(y, row) + (this.lh - this.size) / 2 + this.size * 0.78 + (rs.dy ?? 0);
      let col = row.depth * this.indent;
      let shift = rs.dx ?? 0; // hidden segments pull the rest left by their width times (1 - alpha)
      for (const seg of row.segs) {
        const st = style ? style(seg, row) ?? {} : {};
        const w = seg.text.length * a;
        const collapse = st.collapse ?? 0; // 0..1: shrink this segment's width away
        if (!st.hide && (st.alpha ?? 1) > 0) {
          const ga = ctx.globalAlpha;
          ctx.globalAlpha = ga * (rs.alpha ?? 1) * (st.alpha ?? 1);
          ctx.fillStyle = st.color ?? ROLE_COLOR[seg.role];
          ctx.fillText(seg.text, x + col * a + shift + (st.dx ?? 0), by + (st.dy ?? 0));
          if (st.strike) {
            ctx.fillRect(x + col * a + shift, by - this.size * 0.3, w * st.strike, 2);
          }
          ctx.globalAlpha = ga;
        }
        shift -= w * collapse;
        col += seg.text.length;
      }
    }
    ctx.restore();
  }
}
