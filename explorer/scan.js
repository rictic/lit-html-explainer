// A replay of lit-html's getTemplateHtml (lit-html.ts L798-953, lit-html
// 3.3.3) that records what the scanner does: every regex match (where it
// starts and ends, the state before and after), the state at the end of each
// string, and which of the four cases produced each piece of the HTML.
//
// This is the explorer's only reimplementation of lit-html. The regexes and
// the state machine are copied from lit-html.ts; only the recording is added.
// frame.js runs it for every prepared template and compares its output with
// lit-html's own `_$LH._getTemplateHtml(strings, type)`; the UI shows a
// warning if they ever differ. (Ported from video/src/scenes/markers-scan.js,
// plus result types, the dev-mode dynamic tag name error and hole states.)

const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;

const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;

const commentEndRegex = /-->/g;
const comment2EndRegex = />/g;

const tagEndRegex = new RegExp(
  `>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`,
  'g'
);
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;

const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;
const rawTextElement = /^(?:script|style|textarea|title)$/i;

const HTML_RESULT = 1;
const SVG_RESULT = 2;
const MATHML_RESULT = 3;

// The regexes' variable names in lit-html.ts, and the line each is defined on
// (at lit-html@3.3.3).
const NAMES = new Map([
  [textEndRegex, 'textEndRegex'],
  [commentEndRegex, 'commentEndRegex'],
  [comment2EndRegex, 'comment2EndRegex'],
  [tagEndRegex, 'tagEndRegex'],
  [singleQuoteAttrEndRegex, 'singleQuoteAttrEndRegex'],
  [doubleQuoteAttrEndRegex, 'doubleQuoteAttrEndRegex'],
]);
export const REGEX_LINES = {
  textEndRegex: 398,
  commentEndRegex: 403,
  comment2EndRegex: 407,
  tagEndRegex: 431,
  singleQuoteAttrEndRegex: 440,
  doubleQuoteAttrEndRegex: 441,
  rawTextEndRegex: 857,
};
export const REGEX_SOURCE = {
  textEndRegex: String(textEndRegex),
  commentEndRegex: String(commentEndRegex),
  comment2EndRegex: String(comment2EndRegex),
  tagEndRegex: String(tagEndRegex),
  singleQuoteAttrEndRegex: String(singleQuoteAttrEndRegex),
  doubleQuoteAttrEndRegex: String(doubleQuoteAttrEndRegex),
};
const nameOf = (re) => NAMES.get(re) ?? 'rawTextEndRegex';

// The scanner's state in words, from the current regex (and, for tagEndRegex,
// whether the string ended right after `name=`).
export function stateOf(regexName, attrNameEndIndex = -1) {
  switch (regexName) {
    case 'textEndRegex':
      return 'text';
    case 'tagEndRegex':
      return attrNameEndIndex >= 0 ? 'value' : 'tag';
    case 'doubleQuoteAttrEndRegex':
    case 'singleQuoteAttrEndRegex':
      return 'value';
    case 'commentEndRegex':
    case 'comment2EndRegex':
      return 'comment';
    default:
      return 'raw';
  }
}

// Returns {
//   html, attrNames, prefix, suffix, nodeMarker, error,
//   strings: [{ i, s, start, steps: [{from, index, end, text, before, after,
//     attrNameEndIndex, attrName}], end, rawTag, attrNameEndIndex, attrName,
//     kind, piece, endSpace, hole }]
//   last: the last string (appended unscanned, or '<?>' if it's empty)
// }
// kind is lit-html's case: 'node' (text position: a comment marker), 'attr'
// (the attribute name is rewritten with the $lit$ suffix), 'element' (attribute
// name position: marker + index), 'plain' (anything else: the bare marker).
// hole describes the state at the end of the string in words.
export function scanTemplate(strings, marker, type = HTML_RESULT, boundAttributeSuffix = '$lit$') {
  const markerMatch = '?' + marker;
  const nodeMarker = `<${markerMatch}>`;
  const l = strings.length - 1;
  const attrNames = [];
  const prefix = type === SVG_RESULT ? '<svg>' : type === MATHML_RESULT ? '<math>' : '';
  const suffix = type === SVG_RESULT ? '</svg>' : type === MATHML_RESULT ? '</math>' : '';
  let html = prefix;
  let rawTextEndRegex;
  let regex = textEndRegex;
  let rawTag;
  const out = [];
  let error = null;

  for (let i = 0; i < l; i++) {
    const s = strings[i];
    let attrNameEndIndex = -1;
    let attrName;
    let lastIndex = 0;
    let match;
    const start = nameOf(regex);
    const steps = [];

    while (lastIndex < s.length) {
      regex.lastIndex = lastIndex;
      match = regex.exec(s);
      if (match === null) break;
      const from = lastIndex;
      const before = regex;
      lastIndex = regex.lastIndex;
      if (regex === textEndRegex) {
        if (match[COMMENT_START] === '!--') {
          regex = commentEndRegex;
        } else if (match[COMMENT_START] !== undefined) {
          regex = comment2EndRegex;
        } else if (match[TAG_NAME] !== undefined) {
          if (rawTextElement.test(match[TAG_NAME])) {
            rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, 'g');
            rawTag = match[TAG_NAME];
          }
          regex = tagEndRegex;
        } else if (match[DYNAMIC_TAG_NAME] !== undefined) {
          // lit-html's development build throws here (lit-html.ts L860-866).
          error = {
            i,
            index: match.index,
            message:
              'Bindings in tag names are not supported. Please use static templates instead. ' +
              'See https://lit.dev/docs/templates/expressions/#static-expressions',
          };
          steps.push({from, index: match.index, end: lastIndex, text: match[0], before: nameOf(before), after: nameOf(before), attrNameEndIndex, attrName, error: true});
          out.push({i, s, start, steps, end: nameOf(regex), attrNameEndIndex, attrName, kind: 'error', piece: s, hole: {state: 'error', label: 'tag name'}});
          return {html: null, attrNames, prefix, suffix, nodeMarker, markerMatch, strings: out, last: null, error};
        }
      } else if (regex === tagEndRegex) {
        if (match[ENTIRE_MATCH] === '>') {
          regex = rawTextEndRegex ?? textEndRegex;
          attrNameEndIndex = -1;
        } else if (match[ATTRIBUTE_NAME] === undefined) {
          attrNameEndIndex = -2;
        } else {
          attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS].length;
          attrName = match[ATTRIBUTE_NAME];
          regex =
            match[QUOTE_CHAR] === undefined
              ? tagEndRegex
              : match[QUOTE_CHAR] === '"'
                ? doubleQuoteAttrEndRegex
                : singleQuoteAttrEndRegex;
        }
      } else if (regex === doubleQuoteAttrEndRegex || regex === singleQuoteAttrEndRegex) {
        regex = tagEndRegex;
      } else if (regex === commentEndRegex || regex === comment2EndRegex) {
        regex = textEndRegex;
      } else {
        regex = tagEndRegex;
        rawTextEndRegex = undefined;
        rawTag = undefined;
      }
      steps.push({
        from, index: match.index, end: lastIndex, text: match[0],
        before: nameOf(before), after: nameOf(regex), attrNameEndIndex, attrName,
        rawTag: nameOf(regex) === 'rawTextEndRegex' ? rawTag : undefined,
      });
    }

    const endSpace = regex === tagEndRegex && strings[i + 1].startsWith('/>') ? ' ' : '';
    let kind, piece;
    if (regex === textEndRegex) {
      kind = 'node';
      piece = s + nodeMarker;
    } else if (attrNameEndIndex >= 0) {
      kind = 'attr';
      attrNames.push(attrName);
      piece = s.slice(0, attrNameEndIndex) + boundAttributeSuffix + s.slice(attrNameEndIndex) + marker + endSpace;
    } else if (attrNameEndIndex === -2) {
      kind = 'element';
      piece = s + marker + i;
    } else {
      kind = 'plain';
      piece = s + marker + endSpace;
    }
    const end = nameOf(regex);
    html += piece;
    out.push({i, s, start, steps, end, rawTag: end === 'rawTextEndRegex' ? rawTag : undefined, attrNameEndIndex, attrName, kind, piece,
      endSpace: kind === 'element' ? '' : endSpace,
      hole: describeHole(end, kind, attrName, rawTag, steps.length === 0 && out.at(-1)?.hole.state === 'value')});
  }
  const last = strings[l] || '<?>';
  html += last + suffix;
  return {html, attrNames, prefix, suffix, nodeMarker, markerMatch, strings: out, last, lastEmpty: !strings[l], error};
}

// The state at a hole, in words, and a short note on what lit-html inserts.
function describeHole(regexName, kind, attrName, rawTag, continuesValue) {
  if (kind === 'node') return {state: 'text', label: 'text'};
  if (kind === 'attr') {
    const quoted = regexName !== 'tagEndRegex';
    return {state: 'value', label: quoted ? 'attribute value' : 'attribute value (unquoted)', attrName};
  }
  if (kind === 'element') return {state: 'tag', label: 'inside a tag'};
  // plain marker
  switch (regexName) {
    case 'doubleQuoteAttrEndRegex':
    case 'singleQuoteAttrEndRegex':
    case 'tagEndRegex':
      // A second (or later) binding in one attribute value: the name was
      // already rewritten, so only the marker goes in.
      return regexName !== 'tagEndRegex' || continuesValue
        ? {state: 'value', label: 'attribute value (continued)'}
        : {state: 'tag', label: 'inside a tag'};
    case 'commentEndRegex':
    case 'comment2EndRegex':
      return {state: 'comment', label: 'comment'};
    default:
      return {state: 'raw', label: `raw text <${rawTag ?? '?'}>`, rawTag};
  }
}
