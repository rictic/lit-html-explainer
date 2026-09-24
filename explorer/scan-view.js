// <scan-view>: getTemplateHtml's scan, replayed (scan.js). The strings are
// laid out as one run of HTML; each hole shows the scanner's state at the end
// of the string before it and what lit-html inserted. ▶ steps a caret through
// every regex match, like the video's markers scene.

import {LitElement, html, css, svg} from 'lit';
import {shared, bindingColor, rgba} from './theme.js';
import {src} from './source.js';

const STATES = [
  {id: 'text', label: 'text', regexes: ['textEndRegex']},
  {id: 'tag', label: 'inside a tag', regexes: ['tagEndRegex']},
  {id: 'value', label: 'attribute value', regexes: ['doubleQuoteAttrEndRegex', 'singleQuoteAttrEndRegex']},
  {id: 'comment', label: 'comment', regexes: ['commentEndRegex', 'comment2EndRegex']},
  {id: 'raw', label: 'raw text', regexes: ['rawTextEndRegex']},
];
const stateOfRegex = (name) => STATES.find((s) => s.regexes.includes(name))?.id ?? 'raw';
const svgIcon = (d) => html`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">${d}</svg>`;
const ICON = {
  play: svgIcon(svg`<path d="M2.5 1.5v9l8-4.5z"/>`),
  pause: svgIcon(svg`<rect x="2" y="1.5" width="3" height="9" rx=".5"/><rect x="7" y="1.5" width="3" height="9" rx=".5"/>`),
  prev: svgIcon(svg`<path d="M9.5 1.5v9l-7-4.5z"/>`),
  next: svgIcon(svg`<path d="M2.5 1.5v9l7-4.5z"/>`),
  first: svgIcon(svg`<rect x="1.5" y="1.5" width="2" height="9" rx=".5"/><path d="M10.5 1.5v9l-6.5-4.5z"/>`),
  last: svgIcon(svg`<rect x="8.5" y="1.5" width="2" height="9" rx=".5"/><path d="M1.5 1.5v9l6.5-4.5z"/>`),
};
const SHORT = {text: 'text', value: 'attr value', tag: 'in tag', comment: 'comment', raw: 'raw text'};
const STATE_COLOR = {text: '#9db4ff', tag: '#c6d0ea', value: '#f0c9a0', comment: '#7fcf9a', raw: '#d8b4fe', error: '#ff6b6b'};

export class ScanView extends LitElement {
  static properties = {
    template: {attribute: false},
    marker: {},
    pos: {state: true},
    playing: {state: true},
  };

  static styles = [shared, css`
    :host { display: block; }
    .bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .bar button { background: var(--panel2); color: var(--text); border: 1px solid var(--border2); border-radius: 7px; height: 28px; min-width: 30px;
      padding: 0 9px; font: 600 12px/1 var(--sans); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .bar button:hover { border-color: var(--accent); }
    .bar button.play { background: rgba(122,162,255,.15); border-color: rgba(122,162,255,.5); color: #cfdcff; }
    .bar .count { font: 12px/1 var(--mono); color: var(--text3); margin-left: 4px; }
    .states { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
    .st { font: 600 11px/1 var(--sans); padding: 4px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--text3); white-space: nowrap; }
    .st.on { color: var(--c); border-color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
    .text {
      font: 13px/40px var(--mono); font-variant-ligatures: none; white-space: pre-wrap; word-break: break-all;
      background: #0d1427; border: 1px solid #1c2645; border-radius: 10px; padding: 16px 14px 8px; color: var(--text);
    }
    .todo { color: var(--text4); }
    .nl { color: var(--text4); }
    .m { border-bottom: 1.5px solid rgba(122,162,255,.4); }
    .cur { background: rgba(122,162,255,.28); border-radius: 3px; box-shadow: 0 0 0 1.5px rgba(122,162,255,.8); }
    .hole { position: relative; display: inline; border-radius: 4px; padding: 2px 1px; font-weight: 600; }
    .hole .lab { position: absolute; left: 0; top: -17px; font: 600 10px/1 var(--sans); letter-spacing: .02em; white-space: nowrap;
      padding: 2px 5px; border-radius: 4px; pointer-events: none; }
    .hole.pending { opacity: .55; font-weight: 500; }
    .hole.next { opacity: 1; animation: pulse 1s ease-in-out infinite alternate; }
    @keyframes pulse { from { box-shadow: 0 0 0 0 transparent; } to { box-shadow: 0 0 0 2px var(--hc); } }
    .suffix { font-weight: 700; border-radius: 3px; }
    .caret { display: inline-block; width: 2px; height: 18px; vertical-align: -4px; background: var(--accent); margin: 0 -1px; box-shadow: 0 0 6px var(--accent); }
    .added { color: var(--text3); font-style: italic; }
    .say { margin-top: 8px; font: 13px/1.5 var(--sans); color: var(--text2); min-height: 20px; }
    .say code { color: var(--text); }
    .say b { color: var(--text); font-weight: 600; }
    .digits { opacity: .72; }
    table.holes { border-collapse: collapse; width: 100%; margin-top: 10px; font: 12.5px/1.45 var(--mono); }
    table.holes th { text-align: left; font: 600 10.5px/1 var(--sans); letter-spacing: .07em; text-transform: uppercase; color: var(--text3); padding: 4px 8px 6px; border-bottom: 1px solid var(--border); }
    table.holes td { padding: 4px 8px; border-bottom: 1px solid #1c2645; vertical-align: top; }
    table.holes tr:last-child td { border-bottom: 0; }
    table.holes td.rx { color: var(--text3); }
    .sw { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 6px; }
  `];

  constructor() {
    super();
    this.pos = null;
    this.playing = false;
    this.timer = null;
  }

  willUpdate(changed) {
    if (changed.has('template')) {
      this.steps = this.buildSteps();
      this.pos = this.steps.length;
      this.stop();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
  }

  buildSteps() {
    const r = this.template?.replay;
    if (!r) return [];
    const steps = [];
    r.strings.forEach((e) => {
      e.steps.forEach((m, j) => steps.push({t: 'match', i: e.i, j, m}));
      if (e.kind !== 'error') steps.push({t: 'hole', i: e.i, e});
    });
    if (!r.error) steps.push({t: 'end'});
    return steps;
  }

  play() {
    if (this.pos >= this.steps.length) this.pos = 0;
    this.playing = true;
    this.tick();
  }
  tick() {
    clearTimeout(this.timer);
    if (!this.playing) return;
    if (this.pos >= this.steps.length) {
      this.playing = false;
      return;
    }
    this.pos++;
    const s = this.steps[this.pos - 1];
    this.timer = setTimeout(() => this.tick(), s?.t === 'hole' ? 1300 : 480);
  }
  stop() {
    this.playing = false;
    clearTimeout(this.timer);
  }
  step(d) {
    this.stop();
    this.pos = Math.max(0, Math.min(this.steps.length, this.pos + d));
  }

  render() {
    const t = this.template;
    const r = t?.replay;
    if (!r) return html`<div class="note">No replay.</div>`;
    const p = this.pos;
    const last = this.steps[p - 1];
    const curState = p === 0 ? 'text' : last.t === 'match' ? stateOfRegex(last.m.after) : last.t === 'hole' ? last.e.hole.state : 'text';
    return html`
      <div class="bar">
        <button title="Back to the start" @click=${() => { this.stop(); this.pos = 0; }}>${ICON.first}</button>
        <button title="Previous step" @click=${() => this.step(-1)}>${ICON.prev}</button>
        <button class="play" @click=${() => (this.playing ? this.stop() : this.play())}>${this.playing ? html`${ICON.pause} Pause` : html`${ICON.play} Play the scan`}</button>
        <button title="Next step" @click=${() => this.step(1)}>${ICON.next}</button>
        <button title="Skip to the end" @click=${() => { this.stop(); this.pos = this.steps.length; }}>${ICON.last}</button>
        <span class="count">${p} / ${this.steps.length}</span>
        <span class="states">${STATES.map((s) => html`<span class="st ${s.id === curState && p < this.steps.length ? 'on' : ''}" style="--c:${STATE_COLOR[s.id]}" title=${s.regexes.join(', ')}>${s.label}</span>`)}</span>
      </div>
      <div class="text">${this.body(t, r, p)}</div>
      <div class="say">${this.say(t, r, p, last)}</div>
      ${this.holes(r)}`;
  }

  body(t, r, p) {
    const out = [];
    const holeIndex = (i) => this.steps.findIndex((s) => s.t === 'hole' && s.i === i);
    const lastStep = this.steps[p - 1];
    if (r.prefix) out.push(html`<span class="added" title="svg\`\` and mathml\`\` templates are wrapped for parsing (getTemplateHtml, L813-814)">${r.prefix}</span>`);
    let caretDone = p === 0;
    if (p === 0) out.push(html`<span class="caret"></span>`);
    for (const e of r.strings) {
      const i = e.i;
      const hi = holeIndex(i);
      const holeDone = hi >= 0 && hi < p;
      const matches = this.steps.map((s, k) => ({s, k})).filter(({s}) => s.t === 'match' && s.i === i);
      const done = matches.filter(({k}) => k < p);
      const reached = i === 0 || holeIndex(i - 1) < p; // the scan has started on this string
      const scannedTo = holeDone ? e.s.length : done.length ? done.at(-1).s.m.end : 0;
      const current = lastStep?.t === 'match' && lastStep.i === i ? lastStep.m : null;
      const suffixAt = holeDone && e.kind === 'attr' ? e.attrNameEndIndex : -1;
      const color = bindingColor(i);
      // cut points
      const cuts = new Set([0, e.s.length, scannedTo]);
      done.forEach(({s}) => {
        cuts.add(s.m.index);
        cuts.add(s.m.end);
      });
      if (suffixAt >= 0) cuts.add(suffixAt);
      const pts = [...cuts].filter((x) => x >= 0 && x <= e.s.length).sort((a, b) => a - b);
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1];
        if (a === suffixAt) out.push(html`<span class="suffix" style="color:${color};background:${rgba(color, 0.16)}">$lit$</span>`);
        const seg = e.s.slice(a, b);
        const inMatch = done.find(({s}) => s.m.index <= a && b <= s.m.end);
        const isCur = current && current.index <= a && b <= current.end;
        const cls = !reached || a >= scannedTo ? 'todo' : isCur ? 'cur' : inMatch ? 'm' : '';
        out.push(html`<span class=${cls}>${this.nl(seg)}</span>`);
        if (current && b === current.end && isCur && !caretDone) {
          out.push(html`<span class="caret"></span>`);
          caretDone = true;
        }
      }
      if (suffixAt === e.s.length) out.push(html`<span class="suffix" style="color:${color};background:${rgba(color, 0.16)}">$lit$</span>`);
      if (e.kind === 'error') {
        out.push(html`<span class="hole" style="--hc:${'#ff6b6b'};color:#ff6b6b;background:rgba(255,107,107,.15)"><span class="lab" style="background:#ff6b6b;color:#1b0b0b">throws</span>\${…}</span>`);
        break;
      }
      // the hole
      const next = !holeDone && reached && done.length === matches.length && p === hi;
      if (holeDone) {
        out.push(html`<span class="hole" style="--hc:${color};color:${color};background:${rgba(color, 0.14)}"><span class="lab" style="background:${rgba(color, 0.9)};color:#0b1020">${SHORT[e.hole.state] ?? e.hole.label}</span>${this.insertion(e, color)}</span>`);
        if (lastStep?.t === 'hole' && lastStep.i === i && !caretDone) {
          out.push(html`<span class="caret"></span>`);
          caretDone = true;
        }
      } else {
        out.push(html`<span class="hole pending ${next ? 'next' : ''}" style="--hc:${color};color:${color};background:${rgba(color, 0.1)}">\${…}</span>`);
      }
    }
    if (!r.error) {
      const endDone = p >= this.steps.length;
      out.push(html`<span class=${endDone ? '' : 'todo'}>${this.nl(r.lastEmpty ? '' : r.last)}</span>`);
      if (r.lastEmpty) out.push(html`<span class=${endDone ? 'added' : 'todo'} title="the last string is empty, so lit-html appends '<?>' (L948)">&lt;?&gt;</span>`);
      if (r.suffix) out.push(html`<span class="added">${r.suffix}</span>`);
      if (endDone && p > 0 && this.playing === false && lastStep?.t === 'end') out.push('');
    }
    return out;
  }

  holes(r) {
    const rows = r.strings.filter((e) => e.kind !== 'error');
    if (!rows.length) return '';
    return html`<table class="holes">
      <thead><tr><th>after</th><th>the scanner is in</th><th>regex</th><th>so getTemplateHtml writes</th></tr></thead>
      <tbody>${rows.map((e) => {
        const col = bindingColor(e.i);
        return html`<tr>
          <td style="white-space:nowrap"><span class="sw" style="background:${col}"></span>strings[${e.i}]</td>
          <td style="color:${col}">${e.hole.label}</td>
          <td class="rx">${e.end}${e.end === 'rawTextEndRegex' && e.rawTag ? html` <span class="dim">/&lt;\/${e.rawTag}/g</span>` : ''}</td>
          <td>${this.writes(e, col)}</td>
        </tr>`;
      })}</tbody>
    </table>`;
  }

  writes(e, col) {
    const m = this.marker;
    const mk = html`<span style="color:${col}">lit$<span class="digits">${m.slice(4, -1)}</span>$</span>`;
    switch (e.kind) {
      case 'node': return html`<code><span style="color:${col}">&lt;?</span>${mk}<span style="color:${col}">&gt;</span></code> <span class="dim">comment marker</span>`;
      case 'attr': return html`<code>${e.attrName}<span style="color:${col}">$lit$</span>=…${mk}</code>${e.endSpace ? html` <span class="dim">+ space before /&gt;</span>` : ''}`;
      case 'element': return html`<code>${mk}<span style="color:${col}">${e.i}</span></code> <span class="dim">as an attribute name</span>`;
      default: return html`<code>${mk}</code>${e.endSpace ? html` <span class="dim">+ space before /&gt;</span>` : ''}`;
    }
  }

  insertion(e, color) {
    const m = this.marker;
    const mk = html`lit$<span class="digits">${m.slice(4, -1)}</span>$`;
    switch (e.kind) {
      case 'node': return html`&lt;?${mk}&gt;`;
      case 'attr': return html`${mk}${e.endSpace}`;
      case 'element': return html`${mk}${e.i}`;
      default: return html`${mk}${e.endSpace}`;
    }
  }

  nl(s) {
    if (!s.includes('\n')) return s;
    const parts = s.split('\n');
    return parts.map((x, k) => (k < parts.length - 1 ? html`${x}<span class="nl">↵</span>\n` : x));
  }

  say(t, r, p, last) {
    if (r.error && p >= this.steps.length) {
      return html`<b style="color:var(--bad)">The development build throws here:</b> <code>&lt;</code> followed by a binding is a tag name (<code>DYNAMIC_TAG_NAME</code>). ${src('dynamicTagName')}`;
    }
    if (p === 0) return html`The scan starts in <b>text</b>, with <code>regex = textEndRegex</code>. ${src('getTemplateHtml')}`;
    if (!last) return '';
    if (last.t === 'match') {
      const m = last.m;
      const to = stateOfRegex(m.after);
      const label = STATES.find((s) => s.id === to)?.label;
      const same = m.before === m.after;
      let extra = '';
      if (m.after === 'tagEndRegex' && m.before === 'tagEndRegex' && m.attrNameEndIndex >= 0 && m.attrName) extra = html` Attribute <code>${m.attrName}</code>, unquoted value.`;
      else if (m.attrName && m.after.includes('Quote')) extra = html` Attribute <code>${m.attrName}</code>.`;
      else if (m.attrNameEndIndex === -2) extra = ' A space at the end of the string: attribute-name position.';
      return html`strings[${last.i}]: <code>${m.before}</code> matched <code>${JSON.stringify(m.text)}</code>${same ? html`, staying ${label}.` : html` → <b>${label}</b> (<code>${m.after}</code>).`}${extra}`;
    }
    if (last.t === 'hole') {
      const e = last.e;
      const col = bindingColor(e.i);
      const what = {
        node: html`inserts <code style="color:${col}">&lt;?${this.marker}&gt;</code>, which the HTML parser turns into a comment <code>&lt;!--?${this.marker}--&gt;</code>`,
        attr: html`adds the <code style="color:${col}">$lit$</code> suffix to <code>${e.attrName}</code> (saved in <code>attrNames</code>, since the parser lowercases names) and inserts the marker as the value`,
        element: html`inserts <code style="color:${col}">${this.marker}${e.i}</code> as an attribute name: an element part`,
        plain: e.hole.state === 'value' ? html`inserts only the marker: the attribute's name was already rewritten for its first binding` :
          e.hole.state === 'comment' ? html`inserts the marker into the comment's text` :
          e.hole.state === 'raw' ? html`inserts the marker into the raw text; the walk will split the text on it` :
          html`inserts the marker`,
      }[e.kind];
      return html`End of strings[${e.i}] in <b>${e.hole.label}</b>: getTemplateHtml ${what}. ${src('fourCases', 'four cases')}`;
    }
    if (last.t === 'end') {
      return html`The last string goes on unscanned${r.suffix ? html`, then <code>${r.suffix}</code>` : ''}. That's the annotated HTML. ${t.replayMatches ? html`<span class="chip ok" title="scan.js output compared with _$LH._getTemplateHtml(strings, type)">same as lit-html's getTemplateHtml ✓</span>` : html`<span class="chip bad">differs from lit-html's getTemplateHtml</span>`}`;
    }
    return '';
  }
}
customElements.define('scan-view', ScanView);
