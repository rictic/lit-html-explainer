// A replay of lit-html's getTemplateHtml (packages/lit-html/src/lit-html.ts,
// 3.3.3) that records what the scanner does, so the markers scene can
// animate the real algorithm: every regex match (where it starts and ends,
// the state before and after), the state at the end of each string, and
// which of the four cases produced each piece of the HTML.
//
// The regexes and the state machine are copied from lit-html.ts; only the
// recording is added. scanTemplate(...).html must equal truth's
// counter.prepare.html (the scene checks).

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

// The variable names, for display.
const NAMES = new Map([
  [textEndRegex, "textEndRegex"],
  [commentEndRegex, "commentEndRegex"],
  [comment2EndRegex, "comment2EndRegex"],
  [tagEndRegex, "tagEndRegex"],
  [singleQuoteAttrEndRegex, "singleQuoteAttrEndRegex"],
  [doubleQuoteAttrEndRegex, "doubleQuoteAttrEndRegex"],
]);
const nameOf = (re) => NAMES.get(re) ?? "rawTextEndRegex";

// The scanner's state in words: which regex is current, plus (for an
// unquoted value) whether the last match was `name=`.
//   "text" | "tag" | "value" | "comment" | "raw"
export function stateOf(regexName, attrNameEndIndex = -1) {
  switch (regexName) {
    case "textEndRegex": return "text";
    case "tagEndRegex": return attrNameEndIndex >= 0 ? "value" : "tag";
    case "doubleQuoteAttrEndRegex":
    case "singleQuoteAttrEndRegex": return "value";
    case "commentEndRegex":
    case "comment2EndRegex": return "comment";
    default: return "raw";
  }
}

// Returns {
//   html, attrNames,
//   strings: [{ i, s, start: regexName, steps: [{from, index, end, text,
//     before, after, attrNameEndIndex, attrName}], end: regexName,
//     attrNameEndIndex, attrName, kind: "node" | "attr" | "plain", piece }]
// } for strings[0 .. l-1]; the last string is appended unscanned, as in lit-html.
export function scanTemplate(strings, marker, boundAttributeSuffix = "$lit$") {
  const markerMatch = "?" + marker;
  const nodeMarker = `<${markerMatch}>`;
  const l = strings.length - 1;
  const attrNames = [];
  let html = "";
  let rawTextEndRegex;
  let regex = textEndRegex;
  const out = [];

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
        if (match[COMMENT_START] === "!--") {
          regex = commentEndRegex;
        } else if (match[COMMENT_START] !== undefined) {
          regex = comment2EndRegex;
        } else if (match[TAG_NAME] !== undefined) {
          if (rawTextElement.test(match[TAG_NAME])) {
            rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, "g");
          }
          regex = tagEndRegex;
        } else if (match[DYNAMIC_TAG_NAME] !== undefined) {
          regex = tagEndRegex;
        }
      } else if (regex === tagEndRegex) {
        if (match[ENTIRE_MATCH] === ">") {
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
      }
      steps.push({
        from, index: match.index, end: lastIndex, text: match[0],
        before: nameOf(before), after: nameOf(regex), attrNameEndIndex, attrName,
      });
    }

    const end = regex === tagEndRegex && strings[i + 1].startsWith("/>") ? " " : "";
    let kind, piece;
    if (regex === textEndRegex) {
      kind = "node";
      piece = s + nodeMarker;
    } else if (attrNameEndIndex >= 0) {
      kind = "attr";
      attrNames.push(attrName);
      piece = s.slice(0, attrNameEndIndex) + boundAttributeSuffix + s.slice(attrNameEndIndex) + marker + end;
    } else {
      kind = "plain";
      piece = s + marker + (attrNameEndIndex === -2 ? i : end);
    }
    html += piece;
    out.push({ i, s, start, steps, end: nameOf(regex), attrNameEndIndex, attrName, kind, piece });
  }
  html += strings[l] || "<?>";
  return { html, attrNames, nodeMarker, markerMatch, strings: out };
}
