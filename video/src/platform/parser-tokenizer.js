// A replay of the HTML Standard's tokenizer (§ Tokenization), for the
// states a `<?…>` goes through, recording every step so the parser scene
// can animate the real state machine: the state, the case that matched
// (the spec's <dt>), what the spec says to do (its <dd>, sentence by
// sentence), and the temporary buffer and token after the step.
//
// Rules are copied from the WHATWG source (whatwg/html `source`) after
// "Support processing instructions in HTML" (2026-06-25). `legacy: true`
// replays the tag open state as it was before that change: `?` is an
// unexpected-question-mark-instead-of-tag-name parse error, and the rest
// becomes a bogus comment (checked against the source at 56ec622,
// 2026-05-28). Only the cases our inputs reach are implemented; anything
// else throws, so the scene can't show a made-up transition.
//
// tokenize('<?lit$480592716$>') must end in a comment token with data
// '?lit$480592716$', and '<?marker name="profile">' in a processing
// instruction with target 'marker': truth/platform.json parser.results (the
// scene checks).

// The spec's state names (its <h5> headings).
export const STATE = {
  data: "Data state",
  tagOpen: "Tag open state",
  piOpen: "Processing instruction open state",
  piTarget: "Processing instruction target state",
  afterPiTarget: "After processing instruction target state",
  piData: "Processing instruction data state",
  bogus: "Bogus comment state",
};

const ALPHA = /^[A-Za-z]$/;
const ALNUM = /^[A-Za-z0-9]$/;
const WS = /^[\t\n\f ]$/;

// The <dt>s we show, as the spec writes them.
const DT = {
  lt: "U+003C LESS-THAN SIGN (<)",
  q: "U+003F QUESTION MARK (?)",
  gt: "U+003E GREATER-THAN SIGN (>)",
  alpha: "ASCII alpha",
  alnum: "ASCII alphanumeric",
  hyphen: "U+002D HYPHEN-MINUS (-)",
  low: "U+005F LOW LINE (_)",
  tab: "U+0009 CHARACTER TABULATION (tab)",
  lf: "U+000A LINE FEED (LF)",
  ff: "U+000C FORM FEED (FF)",
  space: "U+0020 SPACE",
  else: "Anything else",
};
const wsDt = (c) => (c === "\t" ? DT.tab : c === "\n" ? DT.lf : c === "\f" ? DT.ff : DT.space);

// Returns { steps, tokens }.
//   step: { i, ch, state, when, rule: [sentences], next, reconsume,
//           error, buffer, comment, pi, emit }
//   (buffer / comment / pi: after the step; emit: the token emitted, if any)
//   token: { type: "comment", data } | { type: "pi", target, data }
export function tokenize(input, { legacy = false } = {}) {
  const steps = [], tokens = [];
  let state = "data", i = 0;
  let buffer = "";          // the temporary buffer
  let comment = null;       // the current comment token
  let pi = null;            // the current processing instruction token
  const record = (o) => {
    steps.push({
      i, ch: input[i], state, reconsume: false, error: null, emit: null, ...o,
      buffer, comment: comment ? { ...comment } : null, pi: pi ? { ...pi } : null,
    });
  };
  // "Convert the temporary buffer to a comment": a comment token whose data
  // is "?" followed by the temporary buffer.
  const convert = () => { comment = { type: "comment", data: "?" + buffer }; };

  for (let guard = 0; guard < 10000; guard++) {
    const c = input[i];
    if (c === undefined) break;             // EOF: nothing we show
    const from = state;
    let next = state, adv = 1;
    let when, rule, error = null, emit = null;
    switch (state) {
      case "data":
        if (c === "<") { when = DT.lt; rule = ["Switch to the tag open state."]; next = "tagOpen"; }
        else throw new Error(`tokenizer replay: data state, ${JSON.stringify(c)} not implemented`);
        break;
      case "tagOpen":
        if (c === "?" && !legacy) {
          when = DT.q;
          buffer = "";
          rule = ["Set the temporary buffer to the empty string.", "Switch to the processing instruction open state."];
          next = "piOpen";
        } else if (c === "?" && legacy) {
          when = DT.q;
          error = "unexpected-question-mark-instead-of-tag-name";
          comment = { type: "comment", data: "" };
          rule = ["This is an unexpected-question-mark-instead-of-tag-name parse error.", "Create a comment token whose data is the empty string.", "Reconsume in the bogus comment state."];
          next = "bogus"; adv = 0;
        } else throw new Error(`tokenizer replay: tag open state, ${JSON.stringify(c)} not implemented`);
        break;
      case "piOpen":
        if (ALPHA.test(c) || c === "_") {
          when = ALPHA.test(c) ? DT.alpha : DT.low;
          rule = ["Reconsume in the processing instruction target state."];
          next = "piTarget"; adv = 0;
        } else {
          when = DT.else;
          error = "invalid-first-character-of-processing-instruction-target";
          convert();
          rule = ["This is an invalid-first-character-of-processing-instruction-target parse error.", "Convert the temporary buffer to a comment.", "Reconsume in the bogus comment state."];
          next = "bogus"; adv = 0;
        }
        break;
      case "piTarget":
        if (WS.test(c) || c === "?" || c === ">") {
          when = c === ">" ? DT.gt : c === "?" ? DT.q : wsDt(c);
          const target = buffer;
          if (/^(xml|xml-stylesheet)$/i.test(target)) {
            error = "disallowed-processing-instruction-target";
            convert();
            rule = ["This is a disallowed-processing-instruction-target parse error.", "Convert the temporary buffer to a comment.", "Reconsume in the bogus comment state."];
            next = "bogus";
          } else {
            pi = { type: "pi", target, data: "" };
            rule = ["Create a processing instruction token whose target is target and data is the empty string.", "Reconsume in the after processing instruction target state."];
            next = "afterPiTarget";
          }
          adv = 0;
        } else if (ALNUM.test(c) || c === "-" || c === "_") {
          when = ALNUM.test(c) ? DT.alnum : c === "-" ? DT.hyphen : DT.low;
          buffer += c;
          rule = ["Append the current input character to the temporary buffer."];
        } else {
          when = DT.else;
          error = "invalid-processing-instruction-target";
          convert();
          rule = ["This is an invalid-processing-instruction-target parse error.", "Convert the temporary buffer to a comment.", "Reconsume in the bogus comment state."];
          next = "bogus"; adv = 0;
        }
        break;
      case "afterPiTarget":
        if (WS.test(c)) { when = wsDt(c); rule = ["Ignore the character."]; }
        else { when = DT.else; rule = ["Reconsume in the processing instruction data state."]; next = "piData"; adv = 0; }
        break;
      case "piData":
        if (c === ">") {
          when = DT.gt; emit = pi; tokens.push(pi);
          rule = ["Switch to the data state.", "Emit the current processing instruction token."];
          next = "data";
        } else if (c === "?") throw new Error("tokenizer replay: processing instruction questionable state not implemented");
        else { when = DT.else; pi = { ...pi, data: pi.data + c }; rule = ["Append the current input character to the current processing instruction token's data."]; }
        break;
      case "bogus":
        if (c === ">") {
          when = DT.gt; emit = comment; tokens.push(comment);
          rule = ["Switch to the data state.", "Emit the current comment token."];
          next = "data";
        } else if (c === "\0") throw new Error("tokenizer replay: NULL not implemented");
        else { when = DT.else; comment = { ...comment, data: comment.data + c }; rule = ["Append the current input character to the comment token's data."]; }
        break;
      default:
        throw new Error(`tokenizer replay: no state ${state}`);
    }
    record({ state: from, when, rule, next, reconsume: adv === 0, error, emit });
    state = next;
    i += adv;
    if (emit) { comment = null; pi = null; }
  }
  return { steps, tokens };
}

// The node the tree builder makes from a token, as truth writes it.
export function nodeOf(token) {
  return token.type === "comment"
    ? { node: "Comment", data: token.data }
    : { node: "ProcessingInstruction", target: token.target, data: token.data };
}

// The target characters (processing instruction target state): ASCII
// alphanumeric, U+002D (-), U+005F (_). Returns which class c is in, or null.
export function targetClass(c) {
  if (/^[A-Za-z]$/.test(c)) return "letters";
  if (/^[0-9]$/.test(c)) return "digits";
  if (c === "-") return "hyphens";
  if (c === "_") return "underscores";
  return null;
}
