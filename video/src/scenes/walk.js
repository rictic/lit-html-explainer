// walk: lit-html walks the template's content once with a TreeWalker that
// visits elements and comments, counting nodes, and records a template part
// for each marker (removing bound attributes, keeping the marker comment).
// Continues parse without a cut (see walk-prep.js).

import { drawPrep } from "./walk-prep.js";

export const transition = "cut";

export function draw(F) {
  drawPrep(F);
}
