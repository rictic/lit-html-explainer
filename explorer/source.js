// Links into lit-html.ts at the tag lit-html@3.3.3 (the version the explorer
// runs). Each entry: [first line, last line, text the first line contains].
// The text is there so the line numbers can be checked against the tag:
//   git -C <lit checkout> show lit-html@3.3.3:packages/lit-html/src/lit-html.ts

import {html} from 'lit';

export const TAG = 'lit-html@3.3.3';
const BASE = 'https://github.com/lit/lit/blob/lit-html%403.3.3/packages/lit-html/src/lit-html.ts';

export const LINES = {
  debugLogEvent: [196, 209, 'const debugLogEvent = DEV_MODE'],
  marker: [349, 349, 'const marker = `lit$${Math.random().toFixed(9).slice(2)}$`;'],
  markerMatch: [352, 352, "const markerMatch = '?' + marker;"],
  nodeMarker: [356, 356, 'const nodeMarker = `<${markerMatch}>`;'],
  createMarker: [368, 368, "const createMarker = () => d.createComment('');"],
  regexes: [394, 448, '/**'],
  textEndRegex: [398, 398, 'const textEndRegex ='],
  commentEndRegex: [403, 403, 'const commentEndRegex = /-->/g;'],
  comment2EndRegex: [407, 407, 'const comment2EndRegex = />/g;'],
  tagEndRegex: [431, 434, 'const tagEndRegex = new RegExp('],
  singleQuoteAttrEndRegex: [440, 440, "const singleQuoteAttrEndRegex = /'/g;"],
  doubleQuoteAttrEndRegex: [441, 441, 'const doubleQuoteAttrEndRegex = /"/g;'],
  rawTextElement: [448, 448, 'const rawTextElement = /^(?:script|style|textarea|title)$/i;'],
  rawTextEndRegex: [857, 857, 'rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`'],
  partTypes: [459, 465, 'const ATTRIBUTE_PART = 1;'],
  tag: [553, 585, 'const tag ='],
  html: [600, 600, 'export const html = tag(HTML_RESULT);'],
  svg: [626, 626, 'export const svg = tag(SVG_RESULT);'],
  noChange: [658, 658, "export const noChange = Symbol.for('lit-noChange');"],
  nothing: [679, 679, "export const nothing = Symbol.for('lit-nothing');"],
  templateCache: [688, 688, 'const templateCache = new WeakMap<TemplateStringsArray, Template>();'],
  walker: [730, 733, 'const walker = d.createTreeWalker('],
  getTemplateHtml: [798, 953, 'const getTemplateHtml = ('],
  dynamicTagName: [860, 866, '} else if (match[DYNAMIC_TAG_NAME] !== undefined) {'],
  fourCases: [918, 943, '// We have four cases:'],
  Template: [957, 1126, 'class Template {'],
  templateCtor: [963, 1117, 'constructor('],
  unwrapSvg: [979, 983, '// Re-parent SVG or MathML nodes into template root'],
  walk: [985, 1083, '// Walk the template to find binding markers and create TemplateParts'],
  expressionInTextarea: [994, 1005, 'if ('],
  boundAttrs: [1010, 1040, 'if ((node as Element).hasAttributes()) {'],
  elementPart: [1032, 1038, '} else if (name.startsWith(marker)) {'],
  rawText: [1043, 1066, 'if (rawTextElement.test((node as Element).tagName)) {'],
  commentNode: [1067, 1081, '} else if (node.nodeType === 8) {'],
  commentPart: [1071, 1080, '} else {'],
  templatePrep: [1109, 1116, 'debugLogEvent &&'],
  createElement: [1121, 1125, 'static createElement(html: TrustedHTML, _options?: RenderOptions) {'],
  TemplateInstance: [1192, 1293, 'class TemplateInstance implements Disconnectable {'],
  clone: [1218, 1265, '_clone(options: RenderOptions | undefined) {'],
  importNode: [1223, 1223, 'const fragment = (options?.creationScope ?? d).importNode(content, true);'],
  cloneLoop: [1231, 1259, 'while (templatePart !== undefined) {'],
  clonePart: [1233, 1251, 'let part: Part | undefined;'],
  update: [1267, 1292, '_update(values: Array<unknown>) {'],
  setPartEvent: [1271, 1279, 'debugLogEvent &&'],
  ChildPart: [1338, 1780, 'class ChildPart implements Disconnectable {'],
  childSetValue: [1451, 1504, '_$setValue(value: unknown, directiveParent: DirectiveParent = this): void {'],
  commitNothing: [1462, 1474, "if (value === nothing || value == null || value === '') {"],
  insert: [1506, 1511, 'private _insert<T extends Node>(node: T) {'],
  commitNode: [1513, 1553, 'private _commitNode(value: Node): void {'],
  commitText: [1555, 1610, 'private _commitText(value: unknown): void {'],
  commitTextNew: [1579, 1597, 'if (ENABLE_EXTRA_SECURITY_HOOKS) {'],
  commitTemplateResult: [1612, 1669, 'private _commitTemplateResult('],
  sameTemplate: [1631, 1641, 'if ((this._$committedValue as TemplateInstance)?._$template === template) {'],
  newInstance: [1642, 1668, '} else {'],
  getTemplate: [1673, 1679, '_$getTemplate(result: UncompiledTemplateResult) {'],
  commitIterable: [1681, 1734, 'private _commitIterable(value: Iterable<unknown>): void {'],
  itemParts: [1704, 1716, 'if (partIndex === itemParts.length) {'],
  truncate: [1725, 1733, 'if (partIndex < itemParts.length) {'],
  clear: [1747, 1760, '_$clear('],
  AttributePart: [1806, 1965, 'class AttributePart implements Disconnectable {'],
  attrCtor: [1842, 1862, 'constructor('],
  attrSetValue: [1886, 1934, '_$setValue('],
  attrCommit: [1937, 1964, '_commitValue(value: unknown) {'],
  removeAttribute: [1938, 1939, 'if (value === nothing) {'],
  PropertyPart: [1968, 1994, 'class PropertyPart extends AttributePart {'],
  BooleanAttributePart: [1997, 2015, 'class BooleanAttributePart extends AttributePart {'],
  EventPart: [2032, 2119, 'class EventPart extends AttributePart {'],
  eventSetValue: [2056, 2110, 'override _$setValue('],
  handleEvent: [2112, 2118, 'handleEvent(event: Event) {'],
  ElementPart: [2122, 2163, 'class ElementPart implements Disconnectable {'],
  elementSetValue: [2153, 2162, '_$setValue(value: unknown): void {'],
  LH: [2183, 2200, 'export const _$LH = {'],
  render: [2246, 2294, 'export const render = ('],
  rootPart: [2272, 2282, 'if (part === undefined) {'],
};

export function srcUrl(name) {
  const l = LINES[name];
  if (!l) throw new Error(`no source line for ${name}`);
  return l[0] === l[1] ? `${BASE}#L${l[0]}` : `${BASE}#L${l[0]}-L${l[1]}`;
}

// A small "L1234" link to lit-html.ts.
export function src(name, label) {
  const l = LINES[name];
  const text = label ?? (l[0] === l[1] ? `L${l[0]}` : `L${l[0]}–${l[1]}`);
  return html`<a class="src" href=${srcUrl(name)} target="_blank" rel="noopener" title="lit-html.ts at ${TAG}">${text} ↗</a>`;
}
