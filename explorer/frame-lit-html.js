// What the explored code gets when it imports "lit-html" (or "lit"): lit-html's
// development build, unchanged, except that html, svg, mathml and render are
// wrapped so the explorer can record every TemplateResult (the real object the
// real tag returns, with the call site's own strings array) and every render()
// call. The wrappers call straight through to lit-html.

export * from './vendor/lit-html/development/lit-html.js';
import * as lit from './vendor/lit-html/development/lit-html.js';

const hooks = globalThis.__litExplorer;

export const html = (strings, ...values) => hooks.result(lit.html(strings, ...values));
export const svg = (strings, ...values) => hooks.result(lit.svg(strings, ...values));
export const mathml = (strings, ...values) => hooks.result(lit.mathml(strings, ...values));
export const render = (value, container, options) => hooks.render(value, container, options);
