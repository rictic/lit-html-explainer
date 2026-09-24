// Syntax-highlighted code on a monospace grid, with every template-literal
// binding (${...}) known by position, so scenes can colour, lift, split and
// move the pieces of a template.
//
//   const code = new Code(src, { size: 30, lineHeight: 1.55 });
//   code.draw(ctx, x, y, { style: (tok) => ({ color, alpha, dx, dy }) });
//   code.rect(x, y, line, col, len)      a character range, in px
//   code.find("render(")                 {line, col, len} of a substring
//   code.bindings                        [{template, index, start, end}] (start/end: {line, col})
//   code.bindingRects(x, y, k)           rects covering binding k of template 0 (incl. "${" and "}")
//   code.statics(0)                      the static pieces of template 0 as character ranges
//
// Token kinds: keyword fn ident prop string number punct comment backtick
// tag attr attrValue text htmlPunct bindOpen bindClose ws.

import { SYN } from "./theme.js";
import { mono, monoAdvance, setFont } from "./draw.js";

const KEYWORDS = new Set(["const", "let", "var", "function", "return", "import", "from", "export", "new", "if",
  "else", "for", "of", "in", "true", "false", "null", "undefined", "this", "typeof", "await", "async", "class", "extends"]);

export const KIND_COLOR = {
  keyword: SYN.keyword, fn: SYN.fn, ident: SYN.ident, prop: SYN.prop, string: SYN.string, number: SYN.number,
  punct: SYN.punct, comment: SYN.comment, backtick: SYN.punct, tag: SYN.tag, attr: SYN.attr,
  attrValue: SYN.attrValue, text: SYN.text, htmlPunct: SYN.htmlPunct, bindOpen: SYN.punct, bindClose: SYN.punct, ws: SYN.text,
};

// Tokenize JS with HTML template literals. Each token: {text, kind, line, col,
// tpl, bind}: tpl is the index of the innermost template literal the token
// is in (or -1), bind is {template, index} of the innermost binding it's in (or null).
export function tokenize(src) {
  const toks = [];
  let line = 0, col = 0;
  let i = 0;
  let templateCount = 0;
  // stack of contexts: {type: "js", braces, bind} | {type: "tpl", id, bindings, html}
  const stack = [{ type: "js", braces: 0, bind: null }];
  const top = () => stack[stack.length - 1];
  const bindOf = () => {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].bind) return stack[k].bind;
    return null;
  };
  const tplOf = () => {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].type === "tpl") return stack[k].id;
    return -1;
  };
  const push = (text, kind) => {
    // split on newlines so every token sits on one line
    const parts = text.split("\n");
    parts.forEach((p, j) => {
      if (j > 0) { line++; col = 0; }
      if (p.length) {
        toks.push({ text: p, kind, line, col, tpl: tplOf(), bind: bindOf() });
        col += p.length;
      }
    });
  };
  const prevSignificant = () => {
    for (let k = toks.length - 1; k >= 0; k--) if (toks[k].kind !== "ws") return toks[k];
    return null;
  };

  while (i < src.length) {
    const ctx = top();
    const c = src[i];
    if (ctx.type === "tpl") {
      const h = ctx.html;
      if (c === "`") {
        push("`", "backtick");
        stack.pop();
        i++;
        continue;
      }
      if (c === "$" && src[i + 1] === "{") {
        const bind = { template: ctx.id, index: ctx.bindings++ };
        stack.push({ type: "js", braces: 0, bind });
        push("${", "bindOpen");
        i += 2;
        continue;
      }
      if (c === "\n") { push("\n", "ws"); i++; continue; }
      // HTML states
      if (h.state === "dq" || h.state === "sq") {
        const q = h.state === "dq" ? '"' : "'";
        if (c === q) { push(q, "attrValue"); h.state = "tag"; i++; continue; }
        let j = i;
        while (j < src.length && src[j] !== q && src[j] !== "`" && !(src[j] === "$" && src[j + 1] === "{") && src[j] !== "\n") j++;
        push(src.slice(i, j), "attrValue");
        i = j;
        continue;
      }
      if (h.state === "text") {
        if (c === "<") {
          const m = /^<(\/?)([a-zA-Z][\w-]*|!--|\?)?/.exec(src.slice(i));
          push("<" + m[1], "htmlPunct");
          i += 1 + m[1].length;
          if (m[2]) { push(m[2], "tag"); i += m[2].length; }
          h.state = "tag";
          continue;
        }
        let j = i;
        while (j < src.length && src[j] !== "<" && src[j] !== "`" && !(src[j] === "$" && src[j + 1] === "{") && src[j] !== "\n") j++;
        const s = src.slice(i, j);
        push(s, /^\s+$/.test(s) ? "ws" : "text");
        i = j;
        continue;
      }
      // inside a tag
      if (c === ">") { push(">", "htmlPunct"); h.state = "text"; i++; continue; }
      if (c === "/" && src[i + 1] === ">") { push("/>", "htmlPunct"); h.state = "text"; i += 2; continue; }
      if (c === " " || c === "\t") {
        let j = i;
        while (src[j] === " " || src[j] === "\t") j++;
        push(src.slice(i, j), "ws");
        i = j;
        continue;
      }
      if (c === "=") { push("=", "htmlPunct"); i++; continue; }
      if (c === '"') { push('"', "attrValue"); h.state = "dq"; i++; continue; }
      if (c === "'") { push("'", "attrValue"); h.state = "sq"; i++; continue; }
      let j = i;
      while (j < src.length && !/[\s=>`"']/.test(src[j]) && !(src[j] === "$" && src[j + 1] === "{") && !(src[j] === "/" && src[j + 1] === ">")) j++;
      if (j === i) j = i + 1;
      push(src.slice(i, j), "attr");
      i = j;
      continue;
    }

    // JavaScript
    if (c === "\n") { push("\n", "ws"); i++; continue; }
    if (c === " " || c === "\t") {
      let j = i;
      while (src[j] === " " || src[j] === "\t") j++;
      push(src.slice(i, j), "ws");
      i = j;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      let j = i;
      while (j < src.length && src[j] !== "\n") j++;
      push(src.slice(i, j), "comment");
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      push(src.slice(i, j + 1), "string");
      i = j + 1;
      continue;
    }
    if (c === "`") {
      const prev = prevSignificant();
      if (prev && prev.kind === "ident") prev.kind = "fn"; // a tag function
      push("`", "backtick");
      stack.push({ type: "tpl", id: templateCount++, bindings: 0, html: { state: "text" } });
      i++;
      continue;
    }
    if (c === "{") { ctx.braces++; push("{", "punct"); i++; continue; }
    if (c === "}") {
      if (ctx.braces === 0 && ctx.bind) {
        push("}", "bindClose");
        stack.pop();
        i++;
        continue;
      }
      ctx.braces--;
      push("}", "punct");
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9][0-9_.]*/.exec(src.slice(i));
      push(m[0], "number");
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
      const w = m[0];
      const prev = prevSignificant();
      let kind = KEYWORDS.has(w) ? "keyword" : "ident";
      if (kind === "ident" && prev && prev.text === ".") kind = "prop";
      if (kind !== "keyword" && /^\s*\(/.test(src.slice(i + w.length))) kind = "fn";
      push(w, kind);
      i += w.length;
      continue;
    }
    // punctuation, greedy for common operators
    const m = /^(=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\.\.\.|[-+*/%<>=!?:;,.()[\]&|^~@#])/.exec(src.slice(i));
    const p = m ? m[0] : c;
    push(p, "punct");
    i += p.length;
  }
  return toks;
}

export class Code {
  constructor(src, { size = 30, lineHeight = 1.55, weight = 450 } = {}) {
    this.src = src;
    this.size = size;
    this.weight = weight;
    this.lh = size * lineHeight;
    this.tokens = tokenize(src);
    this.lines = src.split("\n");
    this.cols = Math.max(...this.lines.map((l) => l.length));
    // bindings: first and last character positions
    const byKey = new Map();
    for (const t of this.tokens) {
      if (!t.bind) continue;
      const key = `${t.bind.template}:${t.bind.index}`;
      if (!byKey.has(key)) byKey.set(key, { template: t.bind.template, index: t.bind.index, start: { line: t.line, col: t.col }, end: null });
      // extend to the end of this token only for tokens of this exact binding
      const b = byKey.get(key);
      if (!b.end || t.line > b.end.line || (t.line === b.end.line && t.col + t.text.length > b.end.col)) b.end = { line: t.line, col: t.col + t.text.length };
    }
    // nested bindings are inside their parent binding: extend parents to cover them
    this.bindings = [...byKey.values()];
  }

  adv(ctx) { return monoAdvance(ctx, this.size, this.weight); }
  width(ctx) { return this.cols * this.adv(ctx); }
  get height() { return this.lines.length * this.lh; }

  // The baseline of `line`, given the code's top at y.
  baseline(y, line) { return y + line * this.lh + (this.lh - this.size) / 2 + this.size * 0.78; }

  rect(ctx, x, y, line, col, len) {
    const a = this.adv(ctx);
    return { x: x + col * a, y: y + line * this.lh + (this.lh - this.size * 1.3) / 2, w: len * a, h: this.size * 1.3 };
  }

  // Centre of a character range.
  center(ctx, x, y, line, col, len = 1) {
    const r = this.rect(ctx, x, y, line, col, len);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  find(sub, nth = 0) {
    let n = 0;
    for (let line = 0; line < this.lines.length; line++) {
      let from = 0;
      for (;;) {
        const col = this.lines[line].indexOf(sub, from);
        if (col < 0) break;
        if (n++ === nth) return { line, col, len: sub.length };
        from = col + 1;
      }
    }
    throw new Error(`code: no "${sub}" #${nth}`);
  }

  binding(k, template = 0) {
    const b = this.bindings.find((b) => b.template === template && b.index === k);
    if (!b) throw new Error(`code: no binding ${template}:${k}`);
    return b;
  }

  // Character ranges (one per line) from {line, col} a to b (exclusive).
  ranges(a, b) {
    const out = [];
    for (let line = a.line; line <= b.line; line++) {
      const c0 = line === a.line ? a.col : 0;
      const c1 = line === b.line ? b.col : this.lines[line].length;
      if (c1 > c0) out.push({ line, col: c0, len: c1 - c0 });
    }
    return out;
  }

  bindingRects(ctx, x, y, k, template = 0) {
    const b = this.binding(k, template);
    return this.ranges(b.start, b.end).map((r) => this.rect(ctx, x, y, r.line, r.col, r.len));
  }

  // The static pieces of a template literal (between its backticks and
  // bindings), as lists of character ranges: statics(t)[i] is strings[i].
  statics(template = 0) {
    // The opening backtick is the token just before the template's first
    // token; the closing one is the template's last backtick.
    const first = this.tokens.findIndex((t) => t.tpl === template);
    const open = this.tokens[first - 1];
    const close = this.tokens.findLast((t) => t.kind === "backtick" && t.tpl === template);
    let pos = { line: open.line, col: open.col + 1 };
    const out = [];
    const bs = this.bindings.filter((b) => b.template === template).sort((a, b) => a.index - b.index);
    for (const b of bs) {
      out.push(this.ranges(pos, b.start));
      pos = b.end;
    }
    out.push(this.ranges(pos, { line: close.line, col: close.col }));
    return out;
  }

  // Draw. style(tok) may return {color, alpha, dx, dy, weight, hide}.
  draw(ctx, x, y, { alpha = 1, style = null, clip = null } = {}) {
    if (alpha <= 0) return;
    const a = this.adv(ctx);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.textBaseline = "alphabetic";
    let lastFont = "";
    for (const t of this.tokens) {
      if (t.kind === "ws") continue;
      const st = style ? style(t) ?? {} : {};
      if (st.hide) continue;
      if (clip && !clip(t)) continue;
      const f = mono(this.size, st.weight ?? this.weight, t.kind === "comment" ? "italic" : undefined);
      if (f !== lastFont) { setFont(ctx, f); lastFont = f; }
      ctx.fillStyle = st.color ?? KIND_COLOR[t.kind];
      const ga = ctx.globalAlpha;
      if (st.alpha !== undefined) ctx.globalAlpha = ga * st.alpha;
      ctx.fillText(t.text, x + t.col * a + (st.dx ?? 0), this.baseline(y, t.line) + (st.dy ?? 0));
      ctx.globalAlpha = ga;
    }
    ctx.restore();
  }
}
