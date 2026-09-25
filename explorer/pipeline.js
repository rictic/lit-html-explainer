// <lit-pipeline>: one render, stage by stage. TemplateResult → Prepare →
// Create → Update → the page. Everything shown comes from the record
// frame.js made while the real lit-html (development build) rendered.

import {LitElement, html, css, nothing} from 'lit';
import {shared, sectionStyles, bindingColor, OBJ, rgba} from './theme.js';
import {src} from './source.js';
import {strLit, valueT, resultChip, TYPE_NAME, PART_TYPE, withMarkers, markerT, partWhere, valueIndices, nlT} from './values.js';
import './tree.js';
import './scan-view.js';

export class LitPipeline extends LitElement {
  static properties = {
    rec: {attribute: false},
    ctx: {attribute: false},
    showAllResults: {state: true},
  };

  static styles = [shared, sectionStyles, css`
    :host { display: block; color: var(--text); font: 13.5px/1.5 var(--sans); container: pipe / inline-size; }
    section { margin: 0 0 26px; scroll-margin-top: 8px; }
    h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; font: 650 18px/1.25 var(--sans); letter-spacing: -.005em; flex-wrap: wrap; }
    h2 .num { font: 700 11px/1 var(--sans); color: #0b1020; background: var(--accent); border-radius: 999px; width: 20px; height: 20px; display: inline-grid; place-items: center; }
    h2 .num.skip { background: var(--text4); }
    h2 small { font: 450 13px/1.3 var(--sans); color: var(--text3); }
    p.desc { margin: -4px 0 12px 30px; font: 13px/1.5 var(--sans); color: var(--text3); }
    p.desc code { font-size: 12px; }
    h2 .grow { flex: 1; }
    .objref { font: 600 12.5px/1 var(--mono); color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent);
      padding: 2px 6px; border-radius: 6px; white-space: nowrap; text-decoration: none; display: inline-block; }
    a.objref:hover { text-decoration: none; border-color: var(--c); }
    .obj-title { font: 650 13px/1.2 var(--mono); color: var(--c); }
    .card { --c: var(--accent); }
    .card.result { --c: var(--obj-result); }
    .card.template { --c: var(--obj-template); }
    .card.instance { --c: var(--obj-instance); }
    .card > .card-head { border-left: 3px solid var(--c); }
    .arr { display: grid; grid-template-columns: max-content 1fr; gap: 2px 10px; font: 12.5px/1.6 var(--mono); font-variant-ligatures: none; }
    .arr .i { color: var(--text4); text-align: right; }
    .arr .v { white-space: pre-wrap; word-break: break-all; }
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
    @container pipe (max-width: 820px) { .cols { grid-template-columns: minmax(0, 1fr); } }
    .mono { font: 12.5px/1.6 var(--mono); }
    .code { font: 12.5px/1.7 var(--mono); font-variant-ligatures: none; white-space: pre-wrap; word-break: break-all; background: #0d1427; border: 1px solid #1c2645; border-radius: 10px; padding: 10px 12px; }
    .nl { color: var(--text4); }
    .mk .digits { opacity: .72; }
    .mkbox { border-radius: 3px; font-weight: 600; }
    .esc { color: var(--text3); }
    .added { color: var(--text3); font-style: italic; }
    .skipped-stage { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border: 1px dashed var(--border2); border-radius: 12px; color: var(--text2); font-size: 13.5px; }
    .lookups { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; font: 12.5px/1.5 var(--mono); }
    .lookup { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    table.parts { border-collapse: collapse; width: 100%; font: 12.5px/1.45 var(--mono); }
    table.parts th { text-align: left; font: 600 10.5px/1 var(--sans); letter-spacing: .07em; text-transform: uppercase; color: var(--text3); padding: 4px 8px 6px; border-bottom: 1px solid var(--border); }
    table.parts td { padding: 5px 8px; border-bottom: 1px solid #1c2645; vertical-align: top; }
    table.parts tr:last-child td { border-bottom: 0; }
    .sw { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 6px; vertical-align: 0; }
    .group-note { font: 12.5px/1.5 var(--sans); color: var(--text3); margin: 8px 0 0; }
    .results { display: flex; flex-direction: column; gap: 10px; }
    .rrow { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; align-items: baseline; }
    .lbl { font: 600 10.5px/1.6 var(--sans); letter-spacing: .07em; text-transform: uppercase; color: var(--text3); }
    .mini { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; font: 12.5px/1.5 var(--mono); }
    .warnbox { border: 1px solid rgba(255,209,102,.45); background: rgba(255,209,102,.07); color: #ffe3a3; border-radius: 10px; padding: 8px 12px; font-size: 13px; margin: 0 0 12px; }
    .errbox { border: 1px solid rgba(255,107,107,.5); background: rgba(255,107,107,.08); color: #ffc9c9; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin: 0 0 12px; }
    .errbox pre { margin: 6px 0 0; font: 12px/1.5 var(--mono); white-space: pre-wrap; color: #ffb4b4; }
    /* update log */
    .log { font: 12.5px/1.5 var(--mono); font-variant-ligatures: none; }
    .ev { position: relative; padding: 3px 0 3px 0; }
    .kids { margin-left: 9px; padding-left: 12px; border-left: 1px solid #26314f; }
    .line { display: flex; gap: 8px; align-items: baseline; }
    .line .main { min-width: 0; overflow-wrap: anywhere; }
    .why { margin: 1px 0 2px 2px; font: 12px/1.45 var(--sans); color: var(--text3); }
    .why code { font-size: 11.5px; color: var(--text2); }
    .kind { font: 600 10.5px/1 var(--sans); letter-spacing: .05em; text-transform: uppercase; padding: 3px 6px; border-radius: 5px; white-space: nowrap; }
    .k-render { color: var(--obj-root); background: rgba(223,230,255,.1); }
    .k-child, .k-set { color: var(--c, #c6d0ea); background: color-mix(in srgb, var(--c, #c6d0ea) 13%, transparent); }
    .k-instance { color: var(--obj-instance); background: rgba(122,214,255,.1); }
    .k-prep { color: var(--obj-template); background: rgba(195,166,255,.12); }
    .k-commit { color: var(--ok); background: rgba(94,227,139,.1); }
    .k-nowrite { color: var(--text3); background: rgba(108,120,150,.12); }
    .k-dom { color: #ffd166; background: rgba(255,209,102,.1); border: 1px dashed rgba(255,209,102,.5); }
    .k-skip { color: var(--text3); border: 1px solid var(--border2); }
    .writes { font: 600 11px/1 var(--sans); color: var(--ok); white-space: nowrap; }
    .writes.zero { color: var(--text4); }
    .muted { color: var(--text3); }
    .ev.skipped > .line { opacity: .6; }
    .summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .stat { display: inline-flex; gap: 6px; align-items: baseline; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; }
    .stat b { font: 700 17px/1 var(--sans); }
    .stat span { font: 12px/1 var(--sans); color: var(--text2); }
    .legend { display: flex; gap: 14px; flex-wrap: wrap; font: 12px/1.4 var(--sans); color: var(--text3); margin-top: 8px; }
    .legend i { font-style: normal; }
    .showcached { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    button.linkish { background: none; border: 1px solid var(--border); color: var(--text2); border-radius: 8px; padding: 6px 10px; font: 600 12.5px/1 var(--sans); cursor: pointer; }
    button.linkish:hover { border-color: var(--accent); color: var(--text); }
    .pagegrid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  `];

  render() {
    const rec = this.rec;
    if (!rec) return html`<div class="note">Nothing rendered yet.</div>`;
    return html`
      ${this.errorBox(rec)}
      ${this.consoleBox(rec)}
      <section id="stage-result">${this.resultsSection(rec)}</section>
      <section id="stage-prepare">${this.prepareSection(rec)}</section>
      <section id="stage-create">${this.createSection(rec)}</section>
      <section id="stage-update">${this.updateSection(rec)}</section>
      <section id="stage-page">${this.pageSection(rec)}</section>`;
  }

  errorBox(rec) {
    if (!rec.error) return nothing;
    return html`<div class="errbox"><b>${rec.error.name}:</b> ${rec.error.message}${rec.error.line ? html` <span class="dim">(line ${rec.error.line} of your code)</span>` : ''}
      <pre>${this.stackLines(rec.error.stack).map((l) => l.replace(/\(?(?:https?:|blob:)\S*?\/([^/\s)]+?)(:\d+:\d+)\)?$/, (m, f, pos) => `(${f.startsWith('http') || f.length > 30 ? 'your code' : f}${pos})`)).join('\n')}</pre></div>`;
  }

  // The error's stack down to where the explorer called in.
  stackLines(stack) {
    const lines = (stack ?? '').split('\n').slice(1);
    const cut = lines.findIndex((l) => /\/explorer\/(frame|app)[.-]/.test(l));
    return lines.slice(0, cut < 0 ? 6 : Math.min(cut, 6));
  }

  consoleBox(rec) {
    const warns = rec.console.filter((c) => c.level === 'warn' || c.level === 'error' || c.level === 'assert');
    if (!warns.length) return nothing;
    const fromLit = (w) => /lit\.dev\/msg|^Lit |unexpected parse state/.test(w.text);
    return html`<div class="warnbox">${warns.map((w) => html`<div><b>${fromLit(w) ? `lit-html's development build ${w.level === 'warn' ? 'warned' : `logged (${w.level})`}` : `console.${w.level}`}:</b> ${w.text}</div>`)}</div>`;
  }

  goResult(id) {
    const el = this.renderRoot.querySelector(`#result-${id}`);
    el?.scrollIntoView({behavior: 'smooth', block: 'center'});
    el?.animate([{boxShadow: `0 0 0 2px ${OBJ.result}`}, {boxShadow: '0 0 0 0 transparent'}], {duration: 1200});
  }

  // ------------------------------------------------------ TemplateResult

  resultsSection(rec) {
    const results = rec.results;
    const onResult = (id) => this.goResult(id);
    // Results with a strings array already shown are listed compactly.
    const shownStrings = new Map();
    const full = [];
    const compact = [];
    for (const r of results) {
      const key = r.strings ? r.strings.join('\u0000') + '\u0001' + r.template : `x${r.id}`;
      if (shownStrings.has(key)) compact.push({r, first: shownStrings.get(key)});
      else {
        shownStrings.set(key, r.id);
        full.push(r);
      }
    }
    return html`
      <h2><span class="num">1</span> TemplateResult<span class="grow"></span>${src('tag', 'tag()')}</h2>
      <p class="desc">what <code>html\`…\`</code> returns: <code>{_$litType$, strings, values}</code>. Nothing is parsed yet.</p>
      ${results.length === 0 ? html`<div class="skipped-stage"><span>No TemplateResult in this render.</span></div>` : ''}
      <div class="results">${full.map((r) => this.resultCard(r, rec, onResult, compact.filter((c) => c.first === r.id)))}</div>`;
  }

  resultCard(r, rec, onResult, same) {
    const tmpl = r.template;
    const roleT = this.roleT(r, onResult);
    const sameEarlier = r.firstWithStrings !== undefined && r.firstWithStrings !== null && r.firstWithStrings !== r.id;
    return html`<div class="card result" id="result-${r.id}">
      <div class="card-head">
        <span class="obj-title">TemplateResult #${r.id}</span>
        <span class="mono dim">_$litType$: <span style="color:var(--text)">${r.type}</span> <span class="dim">(${TYPE_NAME[r.type] ?? '?'})</span></span>
        <span class="note">${roleT}</span>
        <span class="grow"></span>
        ${tmpl !== null && tmpl !== undefined ? html`<span class="objref" style="--c:${OBJ.template}" title="templateCache: strings → Template">strings → Template #${tmpl}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="rrow">
          <span class="lbl">strings</span>
          <div>
            <div class="arr">${(r.strings ?? []).map((s, i) => html`<span class="i">[${i}]</span><span class="v">${strLit(s)}</span>`)}</div>
            ${sameEarlier ? html`<div class="group-note">The same strings array (<code>===</code>) as TemplateResult #${r.firstWithStrings}: one array per template literal, made once, so it's the cache key.</div>` : ''}
          </div>
          <span class="lbl">values</span>
          <div class="arr">${r.values.length === 0 ? html`<span class="i"></span><span class="v dim">[] (no bindings)</span>` : r.values.map((v, i) => html`<span class="i" style="color:${bindingColor(i)}">[${i}]</span><span class="v">${valueT(v, {color: bindingColor(i), onResult, max: 90})}</span>`)}</div>
        </div>
        ${same.length ? html`<div class="mini">
          <div class="lbl" style="margin-top:6px">${same.length} more with these strings</div>
          ${same.slice(0, this.showAllResults ? 999 : 6).map(({r: s}) => html`<div id="result-${s.id}"><span class="objref" style="--c:${OBJ.result}">#${s.id}</span> <span class="dim">values</span> <span class="dim">[</span>${s.values.map((v, i) => html`${i ? html`<span class="dim">, </span>` : ''}${valueT(v, {color: bindingColor(i), onResult, max: 40})}`)}<span class="dim">]</span> <span class="dim note">${this.roleT(s, onResult)}</span></div>`)}
          ${same.length > 6 && !this.showAllResults ? html`<a href="#" @click=${(e) => { e.preventDefault(); this.showAllResults = true; }}>show all ${same.length}</a>` : ''}
        </div>` : ''}
      </div>
    </div>`;
  }

  roleT(r, onResult) {
    const used = r.used?.length ? r.used.map((u) => html` → ${u.mode === 'create' ? 'new' : 'updates'} <span class="objref" style="--c:${OBJ.instance}">TemplateInstance #${u.instance}</span>`) : '';
    if (!r.role) {
      return r.used?.length ? html`made during the render${used}` : html`created, not rendered`;
    }
    if (r.role.root) return html`the value passed to <code>render()</code>${used}`;
    const path = r.role.path.map((p) => (typeof p === 'number' ? `[${p}]` : `.${p}`)).join('');
    return html`<code>values${path}</code> of ${resultChip(r.role.parent, onResult)}${used}`;
  }

  // ------------------------------------------------------------ Prepare

  lookups(rec) {
    const out = [];
    const walk = (n) => {
      if (n.t === 'instance') out.push(n);
      n.kids?.forEach(walk);
    };
    walk(rec.tree);
    return out;
  }

  prepareSection(rec) {
    const lookups = this.lookups(rec);
    const prepared = rec.templates;
    const skipped = prepared.length === 0;
    const failed = rec.failedPrep;
    const hits = [...new Set(lookups.filter((l) => l.cache === 'hit').map((l) => l.template))];
    return html`
      <h2><span class="num ${skipped && !failed ? 'skip' : ''}">2</span> Prepare<span class="grow"></span>${src('getTemplate', '_$getTemplate')}${src('Template', 'class Template')}</h2>
      <p class="desc">Once per template literal: the strings become HTML with markers, the browser parses it, and one walk finds the parts. Cached by strings array.</p>
      ${lookups.length ? html`<div class="lookups">${lookups.map((l) => html`<div class="lookup">
        <span class="dim">templateCache.get(</span>${l.result !== null && l.result !== undefined ? html`<span class="objref" style="--c:${OBJ.result}">#${l.result}.strings</span>` : 'strings'}<span class="dim">)</span>
        ${l.cache === 'miss' ? html`<span class="chip bad">miss</span> → prepared <span class="objref" style="--c:${OBJ.template}">Template #${l.template}</span>` : html`<span class="chip ok">hit</span> <span class="objref" style="--c:${OBJ.template}">Template #${l.template}</span> <span class="dim">prepared in render ${this.ctx.templates.get(l.template)?.seq ?? '?'}</span>`}
      </div>`)}</div>` : ''}
      ${failed ? this.failedCard(failed) : ''}
      ${skipped && !failed ? html`<div class="skipped-stage"><span class="chip ok">skipped</span><span>${lookups.length ? 'Every template in this render was already in the templateCache: no scanning, no parsing.' : 'No template was looked up in this render.'}</span></div>` : ''}
      ${prepared.map((t) => this.templateCard(t, rec))}
      ${hits.length ? html`<div class="showcached">${hits.map((id) => {
        const t = this.ctx.templates.get(id);
        if (!t) return '';
        const open = this.openTemplates?.has(id);
        return html`<div><button class="linkish" @click=${() => this.toggleTemplate(id)}>${open ? '▾ Hide' : '▸ Show'} cached Template #${id} <span class="dim">(prepared in render ${t.seq})</span></button>${open ? this.templateCard(t, rec) : ''}</div>`;
      })}</div>` : ''}`;
  }

  toggleTemplate(id) {
    this.openTemplates ??= new Set();
    if (this.openTemplates.has(id)) this.openTemplates.delete(id);
    else this.openTemplates.add(id);
    this.requestUpdate();
  }

  failedCard(f) {
    const t = {id: '?', replay: f.replay, strings: f.strings, type: f.type, replayMatches: false};
    return html`<div class="card template" style="margin-top:12px">
      <div class="card-head"><span class="obj-title">new Template(result)</span><span class="note">for ${resultChip(f.result, (id) => this.goResult(id))}: threw, so nothing was cached</span></div>
      <div class="card-body">
        <div class="sub">The scan, up to the error ${src('dynamicTagName')}</div>
        <scan-view .template=${t} marker=${this.ctx.info.marker}></scan-view>
        <div class="note" style="margin-top:6px">This is the explorer's replay of getTemplateHtml (lit-html threw before producing any HTML to compare it with).</div>
      </div>
    </div>`;
  }

  templateCard(t, rec) {
    const marker = this.ctx.info.marker;
    const vi = valueIndices(t.parts);
    // colours for the tree: markers and removed attributes by part
    const colors = {};
    const marks = {};
    const removedColors = {};
    const byWalk = new Map();
    const visit = (n) => {
      if (n.walk !== undefined) byWalk.set(n.walk, n);
      n.children?.forEach(visit);
    };
    visit(t.final);
    t.parts.forEach((p, k) => {
      const n = byWalk.get(p.index);
      if (!n) return;
      const col = bindingColor(vi[k]);
      if (p.type === 2 || p.type === 7) colors[n.id] = col;
      if (p.type === 1 || p.type === 6) (removedColors[n.id] ??= []).push(col);
      (marks[n.id] ??= []).push({text: `part ${k}: ${p.type === 1 ? p.ctor : PART_TYPE[p.type]}${p.name !== undefined ? ` ${p.name}` : ''}`, color: col});
    });
    const bindings = t.strings.length - 1;
    return html`<div class="card template" style="margin-top:12px">
      <div class="card-head">
        <span class="obj-title">Template #${t.id}</span>
        <span class="note">new <code>Template(result)</code> for ${bindings} binding${bindings === 1 ? '' : 's'}${t.type !== 1 ? html` · <code>${TYPE_NAME[t.type]}\`\`</code>` : ''}</span>
        <span class="grow"></span>
        ${t.replayMatches ? html`<span class="chip ok" title="The explorer's replay of the scan (scan.js) produced exactly lit-html's _$LH._getTemplateHtml(strings, type) output and attrNames">replay = lit-html ✓</span>` : html`<span class="chip bad" title="The explorer's replay of the scan differs from lit-html's own getTemplateHtml: trust the annotated HTML below, not the replay">replay ≠ lit-html’s getTemplateHtml</span>`}
      </div>
      <div class="card-body">
        <div class="sub">1 · The scan <span class="dim" style="text-transform:none;letter-spacing:0;font-weight:450">getTemplateHtml puts a marker in each hole; which one depends on a small lexer's state at the end of each string</span> ${src('getTemplateHtml')}</div>
        ${t.replayMatches ? '' : html`<div class="errbox">The replay of the scan doesn't match lit-html's <code>getTemplateHtml</code> for this template${t.replayError ? html`: ${t.replayError.message}` : ''}. The annotated HTML and everything after it come from lit-html itself.</div>`}
        <scan-view .template=${t} marker=${marker}></scan-view>
        <div class="sub">2 · The annotated HTML <span class="dim" style="text-transform:none;letter-spacing:0;font-weight:450">from lit-html's own <code>_$LH._getTemplateHtml(strings, ${t.type})</code></span></div>
        ${t.htmlError ? html`<div class="errbox">${t.htmlError.message}</div>` : html`<div class="code">${this.annotated(t, marker)}</div>
        <div class="mono" style="margin-top:6px"><span class="dim">attrNames:</span> [${t.attrNames.map((a, i) => html`${i ? ', ' : ''}${strLit(a)}`)}]<span class="dim note" style="font-family:var(--sans)"> the bound attributes' names as written, in order (the parser will lowercase them)</span></div>`}
        <div class="cols" style="margin-top:4px">
          <div>
            <div class="sub">3 · The parsed <code style="text-transform:none">&lt;template&gt;</code>, after the walk ${src('walk')}</div>
            <div class="note" style="margin-bottom:6px"><code>template.innerHTML = html</code>, then a TreeWalker over the content (elements and comments; numbers are node indices, text is skipped). Bound attributes are removed${t.type !== 1 ? html`; the <code>&lt;${t.type === 2 ? 'svg' : 'math'}&gt;</code> wrapper was removed first ${src('unwrapSvg')}` : ''}.${t.lastVisited < t.walkCount - 1 ? html` The walk stops ${t.lastVisited < 0 ? 'at once (no bindings)' : html`after node ${t.lastVisited}`}: it has one part per binding.` : ''}</div>
            <div class="code" style="padding:8px 6px"><dom-tree .root=${t.final} .options=${{walk: true, lastVisited: t.lastVisited, removed: t.removedAttrs, removedColors, colors, marks, marker, notes: this.templateNotes(t)}}></dom-tree></div>
          </div>
          <div>
            <div class="sub">4 · Template parts <code style="text-transform:none">template.parts</code> ${src('partTypes', 'types')}</div>
            ${this.partsTable(t, vi)}
            ${t.parts.some((p) => p.type === 1) ? html`<div class="note" style="margin-top:8px">The <code>ctor</code> comes from the attribute name's first character: <code>.</code> PropertyPart, <code>?</code> BooleanAttributePart, <code>@</code> EventPart, none AttributePart. ${src('boundAttrs')}</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }

  // The annotated HTML, coloured by hole. It's lit-html's own output; when the
  // replay matches it exactly, the replay's pieces say which part is which.
  annotated(t, marker) {
    if (!t.replayMatches) return withMarkers(t.html, marker);
    const r = t.replay;
    const out = [];
    if (r.prefix) out.push(html`<span class="added">${r.prefix}</span>`);
    for (const e of r.strings) {
      const col = bindingColor(e.i);
      const box = (inner) => html`<span class="mkbox" style="color:${col};background:${rgba(col, 0.13)}">${inner}</span>`;
      const suffix = html`<span style="color:${col};font-weight:700">$lit$</span>`;
      switch (e.kind) {
        case 'node':
          out.push(nlT(e.s), box(html`&lt;?${markerT(marker)}&gt;`));
          break;
        case 'attr':
          out.push(nlT(e.s.slice(0, e.attrNameEndIndex)), suffix, nlT(e.s.slice(e.attrNameEndIndex)), box(markerT(marker)), e.endSpace);
          break;
        case 'element':
          out.push(nlT(e.s), box(html`${markerT(marker)}${e.i}`));
          break;
        default:
          out.push(nlT(e.s), box(markerT(marker)), e.endSpace);
      }
    }
    out.push(nlT(r.last));
    if (r.suffix) out.push(html`<span class="added">${r.suffix}</span>`);
    return out;
  }

  templateNotes(t) {
    const notes = {};
    let attrIndex = 0;
    const visit = (n) => {
      if (n.type === 'comment' && n.data === '?' + this.ctx.info.marker) notes[n.id] = {kind: 'tmpl-marker'};
      else if (n.type === 'comment' && n.data === '' ) notes[n.id] = {kind: 'tmpl-raw-marker'};
      else if (n.type === 'comment' && n.data.includes(this.ctx.info.marker)) notes[n.id] = {kind: 'tmpl-comment-part'};
      else if (n.type === 'text') notes[n.id] = {kind: 'tmpl-text'};
      else if (n.type === 'element' && t.removedAttrs?.[n.id]) {
        // the parts on this element, in attribute order, pair with its removed attributes
        const parts = t.parts.filter((p) => p.index === n.walk && (p.type === 1 || p.type === 6));
        let k = 0;
        notes[n.id] = {kind: 'tmpl-attrs', attrs: t.removedAttrs[n.id].map((a) => {
          const p = parts[k++];
          // bound attributes take their real names from attrNames, in order
          const real = a.name.endsWith('$lit$') ? t.attrNames?.[attrIndex++] : undefined;
          return {name: a.name, real, ctor: p?.ctor};
        })};
      }
      n.children?.forEach(visit);
    };
    visit(t.final);
    return notes;
  }

  partsTable(t, vi) {
    if (!t.parts.length) return html`<div class="note">No parts: this template has no bindings.</div>`;
    return html`<table class="parts">
      <thead><tr><th>#</th><th>type</th><th>index</th><th>name</th><th>strings</th><th>ctor</th></tr></thead>
      <tbody>${t.parts.map((p, k) => {
        const n = p.type === 1 && p.strings ? p.strings.length - 1 : 1;
        const cols = Array.from({length: n}, (_, j) => bindingColor(vi[k] + j));
        return html`<tr>
          <td><span class="sw" style="background:${n > 1 ? `linear-gradient(90deg, ${cols.join(', ')})` : cols[0]}"></span>${k}</td>
          <td>${p.type} <span class="dim">${PART_TYPE[p.type]}</span></td>
          <td style="color:${cols[0]}">${p.index}</td>
          <td>${p.name !== undefined ? strLit(p.name) : html`<span class="dim">—</span>`}</td>
          <td>${p.strings ? html`[${p.strings.map((s, i) => html`${i ? ', ' : ''}${strLit(s)}`)}]` : html`<span class="dim">—</span>`}</td>
          <td>${p.ctor ? html`<span style="color:${cols[0]}">${p.ctor}</span>` : p.type === 7 ? html`<span class="dim" title="TemplateInstance._clone creates no Part for a COMMENT_PART">none: no Part</span>` : html`<span class="dim">—</span>`}</td>
        </tr>`;
      })}</tbody>
    </table>
    ${n2(t)}`;

    function n2(t) {
      const multi = t.parts.filter((p) => p.type === 1 && p.strings && (p.strings.length > 2 || p.strings[0] !== '' || p.strings[1] !== ''));
      if (!multi.length) return '';
      return html`<div class="note" style="margin-top:8px">An attribute part whose <code>strings</code> aren't <code>['', '']</code> is an interpolation: it takes <code>strings.length - 1</code> values and joins them with its strings. ${src('attrCtor', 'AttributePart')} ${src('update', '_update')}</div>`;
    }
  }

  // ------------------------------------------------------------- Create

  createSection(rec) {
    const created = rec.instances;
    const updated = this.lookups(rec).filter((l) => l.mode === 'update');
    const skipped = created.length === 0;
    return html`
      <h2><span class="num ${skipped ? 'skip' : ''}">3</span> Create<span class="grow"></span>${src('clone', '_clone')}</h2>
      <p class="desc">When a ChildPart gets a template it isn't already showing: clone the template, then find the parts by index.</p>
      ${skipped ? html`<div class="skipped-stage"><span class="chip ok">skipped</span><span>${updated.length ? html`Each ChildPart's <code>_$committedValue</code> was already a TemplateInstance of the same Template, so it's reused. ${src('sameTemplate')}` : 'No TemplateInstance was created or updated in this render.'}</span></div>` : ''}
      ${!skipped && updated.length ? html`<div class="note" style="margin-bottom:8px">Reused: ${updated.map((u, i) => html`${i ? ', ' : ''}<span class="objref" style="--c:${OBJ.instance}">TemplateInstance #${u.instance}</span>`)} (same Template as last time).</div>` : ''}
      ${this.instanceGroups(created)}`;
  }

  // One full card per Template; further instances of it in a compact list.
  instanceGroups(created) {
    const groups = new Map();
    for (const inst of created) {
      if (!groups.has(inst.template)) groups.set(inst.template, []);
      groups.get(inst.template).push(inst);
    }
    return [...groups.values()].map((list) => {
      const [first, ...rest] = list;
      const open = this.openInstances?.has(first.id);
      return html`${this.instanceCard(first)}
        ${rest.length ? html`<div class="note" style="margin:8px 0 0 4px">
          And ${rest.length} more of Template #${first.template}, each with its own clone and Parts:
          ${rest.map((inst, i) => html`${i ? ', ' : ''}<span class="objref" style="--c:${OBJ.instance}">#${inst.id}</span> <span class="dim">${partWhere(inst.parent)}</span>`)}
          <button class="linkish" style="margin-left:6px" @click=${() => {
            this.openInstances ??= new Set();
            open ? this.openInstances.delete(first.id) : this.openInstances.add(first.id);
            this.requestUpdate();
          }}>${open ? 'hide' : 'show them'}</button>
        </div>
        ${open ? rest.map((inst) => this.instanceCard(inst)) : ''}` : ''}`;
    });
  }

  instanceCard(inst) {
    const t = this.ctx.templates.get(inst.template);
    const vi = t ? valueIndices(t.parts) : [];
    const marks = {};
    const colors = {};
    inst.parts.forEach((p) => {
      if (p.none) return;
      const col = bindingColor(vi[p.k] ?? p.k);
      const id = p.element ?? p.startNode;
      (marks[id] ??= []).push({text: `_$parts[${p.k}] ${p.ctor}${p.name !== undefined ? ` ${p.name}` : ''}${p.startNode !== undefined ? ' (startNode)' : ''}`, color: col});
      if (p.startNode !== undefined) colors[p.startNode] = col;
      if (p.endNode) (marks[p.endNode] ??= []).push({text: `endNode of _$parts[${p.k}]`, color: col});
    });
    return html`<div class="card instance" style="margin-top:12px">
      <div class="card-head">
        <span class="obj-title">TemplateInstance #${inst.id}</span>
        <span class="note">of <span class="objref" style="--c:${OBJ.template}">Template #${inst.template}</span>, in ${partWhere(inst.parent)}</span>
        <span class="grow"></span>
        ${inst.result !== null ? html`<span class="note">for ${resultChip(inst.result, (id) => this.goResult(id))}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="cols">
          <div>
            <div class="sub">The clone <code style="text-transform:none">importNode(template.el.content, true)</code> ${src('importNode')}</div>
            <div class="note" style="margin-bottom:6px">A DocumentFragment, not yet in the page. The same walk as prepare, over the copy; no markers are searched for.</div>
            <div class="code" style="padding:8px 6px"><dom-tree .root=${inst.fragment} .options=${{walk: true, marks, colors, marker: this.ctx.info.marker}}></dom-tree></div>
          </div>
          <div>
            <div class="sub"><code style="text-transform:none">instance._$parts</code> ${src('cloneLoop')}</div>
            <table class="parts">
              <thead><tr><th>#</th><th>Part</th><th>node</th></tr></thead>
              <tbody>${inst.parts.map((p) => {
                const col = bindingColor(vi[p.k] ?? p.k);
                if (p.none) return html`<tr><td>${p.k}</td><td class="dim">undefined</td><td class="dim note" style="font-family:var(--sans)">a COMMENT_PART: no Part is created, its value is never used ${src('clonePart')}</td></tr>`;
                return html`<tr>
                  <td><span class="sw" style="background:${col}"></span>${p.k}</td>
                  <td><span style="color:${col}">${p.ctor}</span>${p.name !== undefined ? html` <span class="dim">name</span> ${strLit(p.name)}` : ''}${p.strings ? html`<div class="dim">strings [${p.strings.map((s, i) => html`${i ? ', ' : ''}${strLit(s)}`)}]</div>` : ''}</td>
                  <td>${p.startNode !== undefined
                    ? html`<div><span class="dim">_$startNode</span> ${withMarkers(p.startLabel, this.ctx.info.marker, {color: col})}</div><div><span class="dim">_$endNode</span> ${p.endLabel ? p.endLabel.replace(/\n/g, '⏎') : html`<span class="dim">null</span>`}</div>`
                    : html`<span class="dim">element</span> ${p.elementLabel}`}</td>
                </tr>`;
              })}</tbody>
            </table>
            <div class="note" style="margin-top:8px">Each Part keeps a direct reference to its node: updates never search the DOM.</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ------------------------------------------------------------- Update

  updateSection(rec) {
    const c = rec.counts;
    return html`
      <h2><span class="num">4</span> Update<span class="grow"></span>${src('update', '_update')}${src('debugLogEvent', 'lit-debug events')}</h2>
      <p class="desc">Every render: each Part compares its value with the one it last committed. Unchanged strings and numbers write nothing.</p>
      <div class="summary">
        <span class="stat"><b>${c.sets}</b><span>parts set</span></span>
        <span class="stat"><b style="color:var(--text3)">${c.skipped}</b><span>unchanged (skipped)</span></span>
        <span class="stat"><b style="color:var(--ok)">${c.writes}</b><span>DOM writes</span></span>
        ${c.silent ? html`<span class="stat"><b style="color:#ffd166">${c.silent}</b><span>of them with no debug event</span></span>` : ''}
      </div>
      <div class="log">${rec.tree.kids.map((n) => this.ev(n))}</div>
      <div class="legend">
        <i><span class="kind k-commit">commit</span> a lit-debug commit event, and the DOM operations it performed</i>
        <i><span class="kind k-dom">dom</span> a DOM change lit-html makes without a debug event (seen by a MutationObserver)</i>
        <i><span class="kind k-skip">skipped</span> the part's value was unchanged</i>
      </div>`;
  }

  ev(n, ctx = {}) {
    const go = (id) => this.goResult(id);
    switch (n.t) {
      case 'render':
        return this.row('k-render', 'render', html`<code>render(</code>${valueT(n.value, {onResult: go})}<code>, ${n.container})</code>`, null,
          n.found ? html`Found the root ChildPart on <code>container._$litPart$</code>.` : html`No <code>_$litPart$</code> on the container yet: render() makes the root ChildPart, with a new empty comment as its startNode. ${src('rootPart')}`, n.kids, '', '', '', this.kidCtx(n, ctx));
      case 'child': {
        const root = n.part?.root;
        return this.row('k-child', root ? 'root ChildPart' : 'ChildPart', html`${root ? '' : html`<span class="muted">${partWhere(n.part)}</span> `}<span class="dim">_$setValue(</span>${valueT(n.value, {onResult: go})}<span class="dim">)</span>`, null,
          null, n.kids, `--c:${root ? OBJ.root : '#c6d0ea'}`, '', '', this.kidCtx(n, ctx));
      }
      case 'prep':
        return this.row('k-prep', 'prepare', html`<span class="objref" style="--c:${OBJ.template}">new Template #${n.template}</span>`, null,
          html`templateCache miss: the 'template prep' event. See Prepare.`);
      case 'instance': {
        const create = n.mode === 'create';
        return this.row('k-instance', create ? 'create' : 'update', html`<span class="objref" style="--c:${OBJ.instance}">TemplateInstance #${n.instance}</span> <span class="muted">of Template #${n.template}${n.result !== null && n.result !== undefined ? html`, values of ${resultChip(n.result, go)}` : ''}</span>`, null,
          create ? html`'template instantiated': cloned from the template, then <code>_update(values)</code> while the fragment is still detached.` : html`'template updating': the ChildPart already shows an instance of this Template, so only <code>_update(values)</code>. ${src('sameTemplate')}`, n.kids, '', '', '', {});
      }
      case 'set':
        return this.setEv(n, ctx);
      case 'commit':
        return this.commitEv(n);
      case 'dom':
        return this.domEv(n, ctx);
      default:
        return html`<div class="ev muted">${n.t}</div>`;
    }
  }

  // What the kids of a node run under: a directive, if the node's value is one.
  kidCtx(n, ctx) {
    const v = n.t === 'set' ? n.values?.[0] : n.t === 'child' ? n.value : null;
    return v?.k === 'directive' ? {...ctx, directive: v.name} : n.t === 'instance' ? {} : ctx;
  }

  row(cls, label, main, writes, why, kids, style = '', extraCls = '', title = '', ctx = {}) {
    return html`<div class="ev ${extraCls}"><div class="line"><span class="kind ${cls}" style=${style} title=${title}>${label}</span><span class="main">${main}</span>${writes ?? ''}</div>
      ${why ? html`<div class="why">${why}</div>` : ''}
      ${kids?.length ? html`<div class="kids">${this.someKids(kids, ctx)}</div>` : ''}</div>`;
  }

  // Long lists (big arrays) show their first rows; the rest on request.
  someKids(kids, ctx) {
    this.expanded ??= new WeakSet();
    if (kids.length <= 40 || this.expanded.has(kids)) return kids.map((k) => this.ev(k, ctx));
    return html`${kids.slice(0, 30).map((k) => this.ev(k, ctx))}
      <button class="linkish" style="margin:4px 0" @click=${() => { this.expanded.add(kids); this.requestUpdate(); }}>show ${kids.length - 30} more</button>`;
  }

  writesT(w) {
    return html`<span class="writes ${w ? '' : 'zero'}">${w ? `+${w} DOM write${w > 1 ? 's' : ''}` : 'no DOM write'}</span>`;
  }

  setEv(n, ctx = {}) {
    const col = bindingColor(n.valueIndex);
    const p = n.part;
    const vals = n.values;
    const main = html`<span style="color:${col}">${p.ctor}</span>${p.name !== undefined ? html`<span class="dim">${this.namePrefix(p.ctor)}</span>${p.name}` : ''} <span class="muted">_$parts[${p.index}]</span>
      <span class="dim">←</span> ${vals.length > 1 ? html`<span class="dim">values[${n.valueIndex}..${n.valueIndex + vals.length - 1}]</span> ` : html`<span class="dim">values[${n.valueIndex}]</span> `}${vals.map((v, i) => html`${i ? html`<span class="dim">, </span>` : ''}${valueT(v, {color: bindingColor(n.valueIndex + i), onResult: (id) => this.goResult(id)})}`)}
      ${n.skipped ? html` <span class="kind k-skip">skipped</span>` : ''}`;
    const why = n.skipped ? (vals.some((v) => v.k === 'noChange') ? html`<code>noChange</code>: the part leaves its DOM as it is.` : vals.some((v) => v.k === 'directive') ? html`The directive's value needed no DOM write.` : html`Same as the part's <code>_$committedValue</code>: nothing to write.`) : vals.length > 1 ? html`One part, ${vals.length} values: an interpolation joins them with the part's strings and sets the attribute once.` : null;
    return this.row('k-set', 'set part', main, null, why, n.kids, `--c:${col}`, n.skipped ? 'skipped' : '', '', this.kidCtx(n, ctx));
  }

  namePrefix(ctor) {
    return {PropertyPart: ' .', BooleanAttributePart: ' ?', EventPart: ' @', AttributePart: ' '}[ctor] ?? ' ';
  }

  commitEv(n) {
    const w = n.writes;
    let main;
    let why = null;
    const noMut = (n.kind === 'commit attribute' || n.kind === 'commit boolean attribute') && n.dom?.length === 0;
    switch (n.kind) {
      case 'commit attribute': {
        main = html`<code>${n.el}.setAttribute(${strLit(n.name)}, ${valueT(n.value)})</code>`;
        const r = n.dom?.[0];
        why = html`${r && r.old !== null ? (r.old === r.value ? 'Same value as before (a non-primitive value always commits). ' : html`Was ${strLit(r.old)}. `) : ''}${src('attrCommit')}`;
        break;
      }
      case 'commit property':
        main = html`<code>${n.el}.${n.name} = ${valueT(n.value)}</code>`;
        why = html`A PropertyPart sets the element's property. ${src('PropertyPart')}`;
        break;
      case 'commit boolean attribute':
        main = html`<code>${n.el}.toggleAttribute(${strLit(n.name)}, ${valueT(n.value)})</code>`;
        why = html`${noMut ? 'No change to the DOM (the attribute was already that way). ' : ''}${src('BooleanAttributePart')}`;
        break;
      case 'commit event listener':
        if (n.add || n.remove) {
          main = html`<code>${n.el}.${n.remove ? html`removeEventListener(${strLit(n.name)}, part)` : ''}${n.add && n.remove ? '; ' : ''}${n.add ? html`addEventListener(${strLit(n.name)}, part)` : ''}</code>`;
          why = html`The EventPart itself is the listener; its <code>handleEvent</code> calls the latest function. ${src('handleEvent')}`;
        } else {
          main = html`<span class="muted">stores the function in <code>_$committedValue</code></span>`;
          why = html`No add or remove: the part is already the listener. ${src('eventSetValue')}`;
        }
        break;
      case 'commit text':
        main = html`<code>text.data = ${valueT(n.value)}</code>`;
        why = n.old !== undefined && n.old !== '' ? html`Same Text node, was ${strLit(n.old)}. ${src('commitText')}` : html`The data of the Text node just inserted. ${src('commitText')}`;
        break;
      case 'commit node':
        if (n.fragment) {
          main = html`<code>insertBefore(fragment)</code> <span class="muted">${n.fragment.length} node${n.fragment.length === 1 ? '' : 's'}, after ${withMarkers(n.startLabel ?? '', this.ctx.info.marker, {color: '#c6d0ea'})}</span>`;
          why = html`The instance's nodes move out of its fragment into the ChildPart in one <code>insertBefore</code>, already updated. ${src('newInstance')}`;
        } else if (n.value?.k === 'node' && n.value.v === '""') {
          main = html`<code>insertBefore(document.createTextNode(''))</code>`;
          why = html`First text for this part: an empty Text node goes in, then its data is set. ${src('commitTextNew')}`;
        } else {
          main = html`<code>insertBefore(${valueT(n.value)})</code>`;
          why = src('commitNode');
        }
        break;
      case 'commit nothing to child':
        main = html`<code>_$clear()</code>`;
        why = html`The value is nothing, null, undefined or '': the part's nodes are removed. ${src('commitNothing')}`;
        break;
      case 'commit to element binding':
        main = html`<span class="muted">${n.el} ← ${valueT(n.value)}</span>`;
        why = html`An ElementPart writes nothing itself: the value goes to <code>resolveDirective</code>. ${src('elementSetValue')}`;
        break;
      default:
        main = html`<span class="muted">${n.kind}</span>`;
    }
    return this.row(w ? 'k-commit' : 'k-nowrite', n.kind, main, this.writesT(w), why, null, '', '', `lit-debug event: ${n.kind}`);
  }

  domEv(n, ctx = {}) {
    const marker = this.ctx.info.marker;
    const nodes = (list) => list.slice(0, 6).map((s, i) => html`${i ? html`<span class="dim">, </span>` : ''}${withMarkers(s.replace(/\n/g, '⏎'), marker, {color: '#c6d0ea'})}`);
    let main;
    let why = null;
    switch (n.op) {
      case 'insert': {
        main = html`<code>${n.parent}.insertBefore(</code>${nodes(n.nodes)}${n.nodes.length > 6 ? '…' : ''}<code>)</code>`;
        const allMarkers = n.nodes.every((s) => s === '<!---->');
        if (allMarkers && n.parent === '<body>' && n.nodes.length === 1) why = html`render() inserts the root ChildPart's startNode: <code>createMarker()</code>, an empty comment. ${src('rootPart')}`;
        else if (allMarkers && ctx.directive) why = html`The ${ctx.directive}'s start and end markers for new items: two empty comments per item (<code>insertPart</code> in directive-helpers).`;
        else if (allMarkers) why = html`Start and end markers for list items: two empty comments per item (<code>createMarker()</code>). ${src('itemParts')}`;
        break;
      }
      case 'remove':
        main = html`removed ${nodes(n.nodes)}${n.nodes.length > 6 ? '…' : ''} <span class="muted">from ${n.parent}</span>`;
        why = ctx.directive ? html`The ${ctx.directive} removes nodes itself (<code>removePart</code> in directive-helpers: the part's <code>_$clear()</code>, then its startNode).` : html`Nodes removed one by one by <code>ChildPart._$clear()</code>. ${src('clear')}`;
        break;
      case 'move':
        main = html`moved ${nodes(n.nodes)} <span class="muted">within ${n.parent}</span>`;
        why = html`<code>insertBefore</code> of nodes already in the page.`;
        break;
      case 'removeAttribute':
        main = html`<code>${n.el}.removeAttribute(${strLit(n.name)})</code>`;
        why = html`An attribute part committing <code>nothing</code> removes the attribute; lit-html emits no debug event for it. ${src('removeAttribute')}`;
        break;
      case 'setAttribute':
        main = html`<code>${n.el}.setAttribute(${strLit(n.name)}, ${strLit(n.value ?? '')})</code>`;
        break;
      case 'data':
        main = html`<code>text.data = ${strLit(n.value)}</code>`;
        break;
      default:
        main = n.op;
    }
    return this.row('k-dom', 'dom', main, this.writesT(n.writes), why, null, '', '', 'A DOM change with no lit-debug event, seen by a MutationObserver in the frame');
  }

  // --------------------------------------------------------------- Page

  pageSection(rec) {
    const notes = {};
    const marker = this.ctx.info.marker;
    const marks = {};
    const colors = {};
    const byId = new Map();
    const index = (n) => {
      byId.set(n.id, n);
      n.children?.forEach(index);
    };
    index(rec.page);
    for (const [id, list] of Object.entries(rec.notes ?? {})) {
      notes[id] = {kind: 'page', list, data: byId.get(+id)?.data};
      for (const nt of list) {
        const p = nt.part;
        let col = '#c6d0ea';
        if (p?.instance !== undefined && p.instance !== null) {
          const inst = this.ctx.instances.get(p.instance);
          const t = inst ? this.ctx.templates.get(inst.template) : null;
          if (t) col = bindingColor(valueIndices(t.parts)[p.index] ?? 0);
        } else if (p?.root) col = OBJ.root;
        const label = nt.role === 'start' ? (p.root ? 'root ChildPart startNode' : p.item !== undefined ? `item ${p.item >= 0 ? p.item : ''} start` : `#${p.instance}[${p.index}] ChildPart start`)
          : nt.role === 'end' ? (p.item !== undefined ? `item ${p.item >= 0 ? p.item : ''} end` : `#${p.instance}[${p.index}] end`)
          : nt.role === 'element' ? `#${p.instance}[${p.index}] ${p.ctor}${p.name !== undefined ? ` ${p.name}` : ''}`
          : nt.role === 'text' ? 'text of a ChildPart' : nt.role;
        if (nt.role === 'orphan') {
          (marks[id] ??= []).push({text: 'no Part: left behind', color: '#ffd166'});
          continue;
        }
        (marks[id] ??= []).push({text: label, color: col});
        if (nt.role === 'start') colors[id] = col;
      }
    }
    if (rec.rootPart) (marks[rec.page.id] ??= []).push({text: '_$litPart$: the root ChildPart', color: OBJ.root});
    // comments nobody refers to
    const visit = (n) => {
      if (n.type === 'comment' && !notes[n.id]) notes[n.id] = {kind: 'page-comment', data: n.data};
      n.children?.forEach(visit);
    };
    visit(rec.page);
    return html`
      <h2><span class="num">5</span> The page</h2>
      <p class="desc"><code>document.body</code> after this render, including lit-html's comments. Hover a node.</p>
      <div class="code" style="padding:8px 6px"><dom-tree .root=${rec.page} .options=${{notes, marks, colors, marker, touched: new Set(rec.touched)}}></dom-tree></div>
      <div class="legend"><i><span style="color:var(--ok)">▎</span> written or inserted by this render</i><i>The live page is on the left${this.ctx.latest ? '' : html` <b style="color:var(--warn)">(it shows a later render)</b>`}.</i></div>`;
  }
}
customElements.define('lit-pipeline', LitPipeline);
