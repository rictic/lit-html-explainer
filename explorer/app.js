// <lit-explorer>: the explorer's UI (production Lit). The explored code runs
// in an iframe (frame.html) with lit-html's development build; a fresh iframe
// per run gives a fresh template cache. See README.md.

import {LitElement, html, css, nothing} from 'lit';
import {shared, OBJ} from './theme.js';
import {src} from './source.js';
import {PRESETS, presetById} from './presets.js';
import {markerT} from './values.js';
import './editor.js';
import './pipeline.js';

const STAGES = [
  {id: 'result', label: 'TemplateResult'},
  {id: 'prepare', label: 'Prepare'},
  {id: 'create', label: 'Create'},
  {id: 'update', label: 'Update'},
  {id: 'page', label: 'The page'},
];

export class LitExplorer extends LitElement {
  static properties = {
    presetId: {state: true},
    code: {state: true},
    ranCode: {state: true},
    records: {state: true},
    selected: {state: true},
    loadError: {state: true},
    info: {state: true},
    states: {state: true},
    hasView: {state: true},
    nextIndex: {state: true},
    lastIndex: {state: true},
    tip: {state: true},
    busy: {state: true},
    stage: {state: true},
  };

  static styles = [shared, css`
    :host { display: grid; grid-template-rows: auto 1fr; height: 100vh; color: var(--text); font: 14px/1.45 var(--sans); overflow: hidden; }
    header.top { display: flex; align-items: center; gap: 14px; padding: 0 18px; height: 54px; border-bottom: 1px solid var(--border); background: rgba(12,18,34,.85); }
    .logo { display: flex; align-items: center; gap: 10px; font: 650 16px/1 var(--sans); white-space: nowrap; color: var(--text); text-decoration: none; }
    .logo:hover { text-decoration: none; }
    .logo small { font: 500 12px/1 var(--sans); color: var(--text3); }
    .bars { display: flex; gap: 4px; }
    .bars span { width: 16px; height: 5px; border-radius: 3px; }
    select { background: var(--panel2); color: var(--text); border: 1px solid var(--border2); border-radius: 8px; height: 32px; padding: 0 10px; font: 500 13px var(--sans); max-width: 320px; }
    .grow { flex: 1; }
    .toplinks { display: flex; gap: 14px; align-items: center; font-size: 13px; white-space: nowrap; }
    .marker { font: 12px/1 var(--mono); color: var(--text3); white-space: nowrap; }
    .marker .mk { color: #ffd166; }
    .marker .digits { opacity: .72; }
    button.btn { height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border2); background: var(--panel2); color: var(--text); font: 600 13px/1 var(--sans);
      cursor: pointer; display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
    button.btn:hover:not(:disabled) { border-color: var(--accent); }
    button.btn:disabled { opacity: .45; cursor: default; }
    button.btn.primary { background: #2a4fae; border-color: #4a73d8; }
    button.btn.primary:hover { background: #3059c0; }
    button.btn.dirty { box-shadow: 0 0 0 2px rgba(255,209,102,.6); }
    kbd { font: 500 11px/1 var(--mono); color: #c9d6ff; opacity: .8; }
    main { display: grid; grid-template-columns: clamp(480px, 41vw, 720px) minmax(0, 1fr); min-height: 0; }
    .left { display: grid; grid-template-rows: auto minmax(160px, 1fr) auto auto; min-height: 0; border-right: 1px solid var(--border); }
    .about { padding: 10px 16px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text2); background: rgba(18,26,48,.6); }
    .about b { color: var(--text); font-weight: 600; }
    code-editor { min-height: 0; }
    .controls { border-top: 1px solid var(--border); padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; background: var(--panel); }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .states { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
    .states .lbl { font: 600 10.5px/1 var(--sans); letter-spacing: .07em; text-transform: uppercase; color: var(--text3); margin-right: 3px; }
    .state { font: 12px/1 var(--mono); padding: 5px 7px; border-radius: 6px; border: 1px solid var(--border); color: var(--text2); background: none; cursor: pointer; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .state:hover { border-color: var(--accent); color: var(--text); }
    .state.next { border-color: rgba(122,162,255,.7); color: #cfdcff; background: rgba(122,162,255,.1); }
    .state.last { box-shadow: inset 0 -2px 0 var(--ok); }
    .pageerr { font-size: 12.5px; color: #ffc9c9; background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.45); border-radius: 8px; padding: 6px 10px; }
    .pageerr .x { background: none; border: 0; color: inherit; cursor: pointer; font-size: 15px; float: right; line-height: 1; }
    .pagepanel { border-top: 1px solid var(--border); padding: 10px 14px 14px; background: var(--bg); }
    .browser { border-radius: 10px; overflow: hidden; border: 1px solid #3a4466; background: #232a3f; box-shadow: 0 10px 30px rgba(0,0,0,.45); }
    .chrome { height: 30px; display: flex; align-items: center; gap: 6px; padding: 0 10px; }
    .chrome i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .url { margin-left: 8px; flex: 1; height: 19px; border-radius: 6px; background: #161c2e; color: var(--text2); font: 11.5px/19px var(--sans); padding: 0 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .framehost { position: relative; height: var(--page-h, 190px); background: #f6f7fb; }
    .framehost iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; }
    .hl { position: absolute; pointer-events: none; border: 2px solid #3d7bff; background: rgba(61,123,255,.14); border-radius: 3px; z-index: 3; }
    .hl.thin { background: none; border-width: 0 0 0 3px; border-radius: 0; }
    .right { display: grid; grid-template-rows: auto auto 1fr; min-height: 0; }
    .history { display: flex; gap: 8px; padding: 10px 14px; overflow-x: auto; border-bottom: 1px solid var(--border); background: rgba(12,18,34,.6); scrollbar-width: thin; }
    .hcard { flex: none; min-width: 150px; max-width: 220px; text-align: left; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 7px 10px; cursor: pointer; color: var(--text); font: inherit; }
    .hcard:hover { border-color: var(--border2); }
    .hcard.sel { border-color: var(--accent); background: #16224a; box-shadow: 0 0 0 1px var(--accent); }
    .hcard.err { border-color: rgba(255,107,107,.6); }
    .hcard .t { display: flex; gap: 6px; align-items: baseline; font: 600 12.5px/1.3 var(--sans); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hcard .t .n { color: var(--text3); font-weight: 700; }
    .hcard .s { font: 11.5px/1.3 var(--mono); color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .hcard .c { display: flex; gap: 9px; margin-top: 5px; font: 600 11px/1 var(--sans); white-space: nowrap; }
    .hempty { color: var(--text3); font-size: 13px; padding: 8px 2px; }
    nav.stages { display: flex; gap: 4px; padding: 8px 14px; border-bottom: 1px solid var(--border); background: var(--bg); align-items: center; flex-wrap: wrap; }
    nav.stages button { background: none; border: 1px solid transparent; color: var(--text2); border-radius: 8px; padding: 6px 10px; font: 600 13px/1 var(--sans); cursor: pointer; display: inline-flex; gap: 7px; align-items: center; }
    nav.stages button:hover { background: var(--panel); }
    nav.stages button.on { border-color: rgba(122,162,255,.55); color: var(--text); background: rgba(122,162,255,.08); }
    nav.stages .arrow { color: var(--text4); }
    nav.stages .st { font: 600 11px/1 var(--sans); padding: 3px 6px; border-radius: 999px; }
    nav.stages .st.run { color: var(--accent); background: rgba(122,162,255,.14); }
    nav.stages .st.skip { color: var(--ok); background: rgba(94,227,139,.1); }
    nav.stages .st.none { color: var(--text4); background: rgba(70,81,112,.2); }
    nav.stages .st.err { color: var(--bad); background: rgba(255,107,107,.12); }
    .scroll { overflow: auto; min-height: 0; padding: 16px 18px 40px; scroll-behavior: smooth; }
    .welcome { color: var(--text2); max-width: 720px; }
    .errbox { border: 1px solid rgba(255,107,107,.5); background: rgba(255,107,107,.08); color: #ffc9c9; border-radius: 10px; padding: 12px 14px; font-size: 13.5px; margin-bottom: 14px; }
    .errbox pre { margin: 8px 0 0; font: 12.5px/1.5 var(--mono); white-space: pre-wrap; color: #ffb4b4; }
    .tip { position: fixed; z-index: 50; max-width: 440px; background: #1a2442; border: 1px solid var(--border2); border-radius: 10px; padding: 10px 12px; box-shadow: 0 12px 34px rgba(0,0,0,.55);
      font: 13px/1.5 var(--sans); color: var(--text2); pointer-events: none; }
    .tip b { color: var(--text); }
    .tip code { color: var(--text); }
    .tip .src { pointer-events: auto; }
    .tip .mk { color: #ffd166; }
    .tip .digits { opacity: .72; }
    @media (max-width: 1000px) {
      :host { height: auto; overflow: visible; }
      header.top { height: auto; flex-wrap: wrap; padding: 8px 12px; row-gap: 8px; }
      .logo small { display: none; }
      select { max-width: 60vw; }
      main { grid-template-columns: minmax(0, 1fr); }
      .left { grid-template-rows: auto 420px auto auto; border-right: 0; }
      .right { grid-template-rows: auto auto auto; }
      .scroll { overflow: visible; }
      .toplinks .hide-narrow, .marker { display: none; }
    }
    @media (min-height: 1000px) { .framehost { --page-h: 250px; } }
  `];

  constructor() {
    super();
    const q = new URLSearchParams(location.search);
    const preset = presetById(q.get('preset') ?? 'counter') ?? PRESETS[0];
    this.presetId = preset.id;
    this.code = preset.code;
    this.ranCode = null;
    this.records = [];
    this.selected = null;
    this.loadError = null;
    this.info = null;
    this.states = [];
    this.hasView = false;
    this.nextIndex = 0;
    this.lastIndex = null;
    this.tip = null;
    this.stage = 'result';
    this.initialSteps = q.has('step') ? Math.max(0, parseInt(q.get('step'), 10) || 0) : 1;
    this.templates = new Map();
    this.instances = new Map();
    this.run = 0;
  }

  firstUpdated() {
    this.start(this.initialSteps);
    addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.start(0);
      }
    });
  }

  get frameHost() {
    return this.renderRoot.querySelector('.framehost');
  }

  // A fresh iframe, loaded with the code; then `steps` renders of the states.
  async start(steps = 0) {
    const run = ++this.run;
    this.busy = true;
    this.records = [];
    this.selected = null;
    this.loadError = null;
    this.pageError = null;
    this.states = [];
    this.hasView = false;
    this.templates = new Map();
    this.instances = new Map();
    this.nextIndex = 0;
    this.lastIndex = null;
    this.ranCode = this.code;
    const editor = this.renderRoot.querySelector('code-editor');
    if (editor) editor.errorLine = 0;
    this.tip = null;
    const host = this.frameHost;
    host.querySelector('iframe')?.remove();
    const iframe = document.createElement('iframe');
    iframe.title = 'The page: lit-html renders into its document.body';
    const q = new URLSearchParams(location.search);
    iframe.src = `frame.html${q.get('marker') === 'random' ? '?marker=random' : ''}`;
    const ready = new Promise((resolve, reject) => {
      const onMsg = (e) => {
        if (e.source === iframe.contentWindow && e.data?.explorer === 'ready') {
          removeEventListener('message', onMsg);
          resolve(iframe.contentWindow.explorerFrame);
        }
      };
      addEventListener('message', onMsg);
      setTimeout(() => reject(new Error('The page frame (frame.html) did not load lit-html.')), 15000);
    });
    host.prepend(iframe);
    this.iframe = iframe;
    let frame;
    try {
      frame = await ready;
    } catch (e) {
      this.loadError = {name: 'Error', message: e.message};
      this.busy = false;
      return;
    }
    if (run !== this.run) return;
    this.frame = frame;
    this.info = frame.info;
    frame.onRecord = (rec) => {
      if (run === this.run) this.addRecord(structuredClone(rec));
    };
    frame.onPageChange = () => {
      if (run === this.run) this.pageChanged = true;
    };
    frame.onUncaught = (err) => {
      if (run !== this.run) return;
      this.pageError = err;
      this.requestUpdate();
    };
    const res = await frame.load(this.code);
    if (run !== this.run) return;
    this.busy = false;
    if (!res.ok) {
      this.loadError = res.error;
      this.renderRoot.querySelector('code-editor').errorLine = res.error.line ?? 0;
      return;
    }
    this.hasView = res.hasView;
    this.states = res.states;
    for (let i = 0; i < steps && this.hasView; i++) this.renderNext();
    this.syncUrl();
  }

  addRecord(rec) {
    for (const t of rec.templates) this.templates.set(t.id, t);
    for (const i of rec.instances) this.instances.set(i.id, i);
    this.records = [...this.records, rec];
    this.selected = rec.seq;
    if (rec.error?.line) this.renderRoot.querySelector('code-editor').errorLine = rec.error.line;
    this.updateComplete.then(() => {
      const h = this.renderRoot.querySelector('.history');
      if (h) h.scrollLeft = h.scrollWidth;
    });
  }

  renderNext() {
    if (!this.frame || !this.hasView || !this.states.length) return;
    const i = this.nextIndex % this.states.length;
    this.renderState(i);
  }

  renderState(i, again = false) {
    this.frame.renderState(i, again ? {again: true, label: `view(states[${i}]) again`} : {});
    this.lastIndex = i;
    this.nextIndex = (i + 1) % this.states.length;
    this.syncUrl();
  }

  syncUrl() {
    const q = new URLSearchParams(location.search);
    q.set('preset', this.presetId);
    q.set('step', String(this.records.filter((r) => r.kind === 'state').length));
    history.replaceState(null, '', `?${q}`);
  }

  choosePreset(id) {
    const p = presetById(id);
    if (!p) return;
    this.presetId = id;
    this.code = p.code;
    this.renderRoot.querySelector('code-editor').errorLine = 0;
    this.start(1);
  }

  get rec() {
    return this.records.find((r) => r.seq === this.selected) ?? null;
  }

  render() {
    const preset = presetById(this.presetId);
    const dirty = this.ranCode !== null && this.code !== this.ranCode;
    return html`
      <header class="top">
        <a class="logo" href="../" title="lit-html, inside out">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#121a30"/><path d="M9 10 L3 16 L9 22 M23 10 L29 16 L23 22" stroke="#7aa2ff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="3.5" fill="#38d9c9"/></svg>
          lit-html explorer <small>lit-html ${this.info?.version ?? '3.3.3'} · development build</small>
        </a>
        <select aria-label="Example" @change=${(e) => this.choosePreset(e.target.value)}>
          ${PRESETS.map((p) => html`<option value=${p.id} ?selected=${p.id === this.presetId}>${p.title}</option>`)}
        </select>
        <button class="btn primary ${dirty ? 'dirty' : ''}" @click=${() => this.start(0)} title="Run the code in a fresh page (a fresh template cache)">▶ Run <kbd>Ctrl ⏎</kbd></button>
        <span class="grow"></span>
        ${this.info ? html`<span class="marker" title="lit-html makes its marker from Math.random() when it loads (lit-html.ts L349). The explorer fixes Math.random while lit-html loads, so the marker matches the video. Add ?marker=random to the URL for a random one.">marker ${markerT(this.info.marker)}</span>` : ''}
        <span class="toplinks"><a href="../renders/" class="hide-narrow">▶ The video</a><a href="https://github.com/lit/lit/blob/lit-html%403.3.3/packages/lit-html/src/lit-html.ts" target="_blank" rel="noopener">lit-html.ts ↗</a></span>
      </header>
      <main>
        <section class="left">
          <div class="about">${preset && this.code === preset.code
            ? html`<b>${preset.title}.</b> ${preset.teaches}`
            : html`<b>Your code</b> (edited from “${preset?.title}”). Export <code>view(state)</code> and <code>states</code>, or call <code>render()</code> yourself. Imports: <code>lit-html</code> (or <code>lit</code>) and <code>lit-html/directives/*</code>, all lit-html's development build. Press <b>Run</b> or Ctrl+Enter.`}</div>
          <code-editor .value=${this.code} @code-change=${(e) => (this.code = e.detail)} @run=${() => this.start(0)}></code-editor>
          <div class="controls">${this.controls()}</div>
          <div class="pagepanel">
            <div class="browser">
              <div class="chrome"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span class="url">the page · <b style="color:var(--text)">document.body</b> is the render container · live, clickable</span></div>
              <div class="framehost">${this.highlight()}</div>
            </div>
          </div>
        </section>
        <section class="right">
          <div class="history" role="list" aria-label="Renders">${this.historyCards()}</div>
          <nav class="stages">${this.stageNav()}</nav>
          <div class="scroll" @node-hover=${this.onNodeHover} @scroll=${this.onScroll}>${this.pipeline()}</div>
        </section>
      </main>
      ${this.tip ? html`<div class="tip" style="left:${this.tip.x}px;top:${this.tip.y}px">${this.tip.content}</div>` : ''}`;
  }

  controls() {
    if (!this.hasView) {
      return html`<div class="row note" style="color:var(--text3);font-size:13px">${this.loadError ? 'Fix the error and run again.' : this.busy ? 'Loading…' : html`No <code>view</code> export: renders come from the code's own <code>render()</code> calls.`}</div>`;
    }
    const next = this.states.length ? this.nextIndex % this.states.length : 0;
    return html`
      <div class="row">
        <button class="btn primary" @click=${() => this.renderNext()} ?disabled=${!this.states.length}>Render next state <span class="mono" style="font-weight:500;opacity:.85">view(states[${next}])</span></button>
        <button class="btn" @click=${() => this.renderState(this.lastIndex, true)} ?disabled=${this.lastIndex === null} title="Render view(state) again with the same state: a new TemplateResult, same strings">↻ Same state again</button>
      </div>
      <div class="states"><span class="lbl">states</span>${this.states.map((s, i) => html`<button class="state ${i === next ? 'next' : ''} ${i === this.lastIndex ? 'last' : ''}" title="render view(states[${i}])" @click=${() => this.renderState(i)}>${s}</button>`)}</div>
      ${this.pageError ? html`<div class="pageerr">Uncaught in the page: <b>${this.pageError.name ? `${this.pageError.name}: ` : ''}${this.pageError.message}</b>${this.pageError.line ? ` (line ${this.pageError.line})` : ''} <button class="x" @click=${() => { this.pageError = null; this.requestUpdate(); }}>×</button></div>` : ''}`;
  }

  historyCards() {
    if (!this.records.length) {
      return html`<div class="hempty">${this.busy ? 'Loading lit-html…' : this.loadError ? 'The code did not load.' : 'No renders yet. Render a state, or click in the page.'}</div>`;
    }
    return this.records.map((r) => {
      const c = r.counts;
      return html`<button class="hcard ${r.seq === this.selected ? 'sel' : ''} ${r.error ? 'err' : ''}" role="listitem" @click=${() => (this.selected = r.seq)}>
        <div class="t"><span class="n">#${r.seq}</span> <span class="mono" style="font-weight:600">${r.kind === 'state' ? r.label : r.kind === 'async' ? 'async commit' : 'render()'}</span></div>
        <div class="s">${r.kind === 'state' ? r.state : r.kind === 'page' ? (r.event ? `${r.event}` : 'from page code') : r.kind === 'module' ? 'in module code' : r.label}</div>
        <div class="c">
          <span style="color:${c.prepared ? OBJ.template : 'var(--text4)'}" title="Templates prepared (templateCache misses)">prep ${c.prepared}</span>
          <span style="color:${c.created ? OBJ.instance : 'var(--text4)'}" title="TemplateInstances created">new ${c.created}</span>
          <span style="color:${c.writes ? 'var(--ok)' : 'var(--text4)'}" title="DOM writes">${c.writes} write${c.writes === 1 ? '' : 's'}</span>
        </div>
      </button>`;
    });
  }

  stageNav() {
    const rec = this.rec;
    const c = rec?.counts;
    const status = {
      result: rec ? html`<span class="st run">${rec.results.length}</span>` : '',
      prepare: rec ? (rec.failedPrep ? html`<span class="st err">threw</span>` : c.prepared ? html`<span class="st run">${c.prepared} new</span>` : c.created + c.updated ? html`<span class="st skip">cache hit</span>` : html`<span class="st none">none</span>`) : '',
      create: rec ? (c.created ? html`<span class="st run">${c.created} new</span>` : c.updated ? html`<span class="st skip">reused</span>` : html`<span class="st none">none</span>`) : '',
      update: rec ? html`<span class="st ${c.writes ? 'run' : 'skip'}">${c.writes} write${c.writes === 1 ? '' : 's'}</span>` : '',
      page: '',
    };
    return STAGES.map((s, i) => html`${i ? html`<span class="arrow">→</span>` : ''}<button class=${this.stage === s.id ? 'on' : ''} @click=${() => this.goStage(s.id)}>${s.label} ${status[s.id]}</button>`);
  }

  goStage(id) {
    this.stage = id;
    const p = this.renderRoot.querySelector('lit-pipeline');
    const el = p?.renderRoot.querySelector(`#stage-${id}`);
    const scroller = this.renderRoot.querySelector('.scroll');
    if (el && scroller) scroller.scrollTo({top: el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 8, behavior: 'smooth'});
  }

  onScroll(e) {
    const p = this.renderRoot.querySelector('lit-pipeline');
    if (!p) return;
    const top = e.target.getBoundingClientRect().top;
    let cur = 'result';
    for (const s of STAGES) {
      const el = p.renderRoot.querySelector(`#stage-${s.id}`);
      if (el && el.getBoundingClientRect().top - top < 80) cur = s.id;
    }
    if (cur !== this.stage) this.stage = cur;
  }

  pipeline() {
    if (this.loadError) {
      const e = this.loadError;
      return html`<div class="errbox"><b>${e.name ?? 'Error'}:</b> ${e.message}${e.line ? html` <span style="opacity:.8">(line ${e.line}${e.col ? `, column ${e.col}` : ''})</span>` : ''}
        ${/does not provide an export named/.test(e.message) ? html`<div style="margin-top:6px;color:var(--text2)">In the explorer, <code>lit</code> and <code>lit-html</code> both resolve to lit-html's development build (html, svg, mathml, render, nothing, noChange, …); directives are under <code>lit-html/directives/</code>. LitElement isn't available.</div>` : ''}
        ${e.stack && !e.line ? html`<pre>${e.stack}</pre>` : ''}</div>`;
    }
    const rec = this.rec;
    if (!rec) {
      return html`<div class="welcome">${this.busy ? 'Loading…' : html`Nothing rendered yet. ${this.hasView ? html`Press <b>Render next state</b>.` : 'Interact with the page.'}`}</div>`;
    }
    const latest = rec.seq === this.records.at(-1)?.seq;
    return html`<lit-pipeline .rec=${rec} .ctx=${{info: this.info, templates: this.templates, instances: this.instances, latest}}></lit-pipeline>`;
  }

  // --------------------------------------------------------- explanations

  onNodeHover(e) {
    const {id, note, rect} = e.detail;
    if (id === null || id === undefined) {
      this.tip = null;
      this.hl = null;
      this.requestUpdate();
      return;
    }
    // highlight the node in the live page, if it's there
    const r = this.frame?.rectOf?.(id);
    this.hl = r ? r : null;
    const content = note ? this.explain(note, id) : null;
    if (content) {
      const x = Math.min(rect.left + 40, innerWidth - 460);
      const below = rect.bottom + 8;
      const y = below + 160 > innerHeight ? Math.max(8, rect.top - 150) : below;
      this.tip = {x, y, content};
    } else this.tip = null;
    this.requestUpdate();
  }

  highlight() {
    const r = this.hl;
    if (!r) return nothing;
    const thin = r.w < 2 || r.h < 2;
    return html`<div class="hl ${thin ? 'thin' : ''}" style="left:${r.x - 2}px;top:${r.y - 2}px;width:${Math.max(r.w + 4, 4)}px;height:${Math.max(r.h + 4, 16)}px"></div>`;
  }

  explain(note, id) {
    const m = this.info?.marker ?? '';
    const mk = markerT(m);
    switch (note.kind) {
      case 'tmpl-marker':
        return html`<code>&lt;!--?${mk}--&gt;</code>: the HTML parser's comment for <code>&lt;?${mk}&gt;</code> (<code>&lt;?</code> can't start an element, and a <code>$</code> can't be in a processing instruction's name, so it becomes a comment). The walk sees <code>data === markerMatch</code> and records a CHILD_PART at this node's index. It stays in the template, so every clone has it. ${src('commentNode')}`;
      case 'tmpl-raw-marker':
        return html`<b>An empty comment</b> the walk appended inside a raw-text element, after splitting the element's text on the marker (the parser read the marker as plain text). A CHILD_PART points at it. ${src('rawText')}`;
      case 'tmpl-comment-part':
        return html`<b>A comment with the marker in its text</b>: a binding inside an HTML comment. The walk records a COMMENT_PART for each marker in it; cloning makes no Part for it, so the value is never written. ${src('commentPart')}`;
      case 'tmpl-text':
        return html`<b>Text</b> isn't visited: lit-html's TreeWalker shows only elements and comments (<code>129</code>), so text nodes don't get an index. ${src('walker')}`;
      case 'tmpl-attrs':
        return html`${note.attrs.map((a) => html`<div style="margin:2px 0">${a.name.endsWith('$lit$')
          ? html`<code>${a.name}</code> ends with <code>$lit$</code>: a bound attribute. Its real name comes from <code>attrNames</code> (<code>${a.real ?? '?'}</code>), and its value split on the marker gives the part's <code>strings</code>. The prefix picks the ctor: <b>${a.ctor ?? '?'}</b>.`
          : html`<code>${a.name}</code> starts with the marker: an <b>ELEMENT_PART</b>.`}</div>`)}
          <div style="margin-top:4px">The walk removes these attributes from the template, so clones never have them. ${src('boundAttrs')}</div>`;
      case 'page-comment': {
        if (note.data.includes(m) && note.data !== '?' + m) return html`<b>A binding inside an HTML comment</b> (a COMMENT_PART). No Part was created for it (<code>_$parts</code> has <code>undefined</code> there), so lit-html never writes its value: the marker stays in the comment. ${src('commentPart')}`;
        return html`<b>A comment</b> no Part refers to: from the template.`;
      }
      case 'page':
        return html`${note.list.map((n) => html`<div style="margin:2px 0">${this.explainPageNote(n, mk, m, note.data)}</div>`)}`;
    }
    return null;
  }

  explainPageNote(n, mk, m, data) {
    const p = n.part ?? {};
    switch (n.role) {
      case 'start':
        if (p.root) return html`<code>&lt;!----&gt;</code>, made by <code>render()</code>: the first time it renders into a container, render() creates the root ChildPart with this empty comment (<code>createMarker()</code>) as its startNode, and keeps the part on <code>container._$litPart$</code>. The part's content is everything after it. ${src('rootPart')}`;
        if (p.item !== undefined) return html`<code>&lt;!----&gt;</code>: the startNode of the ChildPart for ${p.item >= 0 ? html`item ${p.item}` : 'an item'} of ${p.of?.root ? 'the root ChildPart' : html`<code>#${p.of?.instance}[${p.of?.index}]</code>`}. ${p.directive === 'RepeatDirective' ? html`<code>repeat</code> makes two empty comments per item (<code>insertPart</code> in directive-helpers).` : html`For an iterable, <code>_commitIterable</code> inserts two empty comments per item and puts a ChildPart between them. ${src('itemParts')}`}`;
        if (p.instance !== undefined && data === '') return html`<code>&lt;!----&gt;</code>: an empty comment lit-html added to the template while preparing it, inside a raw-text element (the parser had read the marker as text; the walk split the text and appended comments). Cloned with the rest, it's the startNode of ChildPart <code>_$parts[${p.index}]</code> of TemplateInstance #${p.instance}. ${src('rawText')}`;
        if (p.instance !== undefined) return html`<b>The template's marker, cloned</b>: in the template's HTML this was <code>&lt;?${mk}&gt;</code>, which the parser turned into this comment. It's the startNode of ChildPart <code>_$parts[${p.index}]</code> of TemplateInstance #${p.instance}; the part's content comes right after it. ${src('commentNode')}`;
        return html`startNode of a ChildPart.`;
      case 'end':
        if (p.item !== undefined) return html`<code>&lt;!----&gt;</code>: the endNode of the ChildPart for ${p.item >= 0 ? html`item ${p.item}` : 'an item'}; the item's nodes are between its two comments.`;
        return html`The endNode of ChildPart <code>_$parts[${p.index}]</code> of TemplateInstance #${p.instance}: its content ends just before this node (in the template, the endNode is the marker comment's next sibling).`;
      case 'element':
        return html`<code>_$parts[${p.index}]</code> of TemplateInstance #${p.instance} (${/^[AEIOU]/.test(p.ctor) ? 'an' : 'a'} <b>${p.ctor}</b>${p.name !== undefined ? html` for <code>${p.name}</code>` : ''}) holds a direct reference to this element: updates never look it up.`;
      case 'text':
        return html`<b>Text written by a ChildPart</b>: created the first time a primitive value was committed; later values only set its <code>data</code>. ${src('commitText')}`;
      case 'node':
        return html`A Node value committed by a ChildPart.`;
      case 'orphan':
        return html`<code>&lt;!----&gt;</code>, left behind: no Part refers to it any more. It was the ${n.was?.role === 'start' ? 'startNode' : 'endNode'} of ${n.was?.part?.item !== undefined ? html`the ChildPart for item ${n.was.part.item}` : 'a ChildPart'}${n.was?.part?.directive ? html` of a ${n.was.part.directive}` : ''} in an earlier render.${n.was?.part?.directive === 'RepeatDirective' && n.was?.role === 'end' ? html` <code>repeat</code> removed that item with <code>removePart()</code> (directive-helpers), which clears the part and removes its startNode but not its endNode.` : ''}`;
    }
    return '';
  }
}
customElements.define('lit-explorer', LitExplorer);
