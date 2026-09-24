// parse: the annotated HTML becomes the content of a <template> element:
// lit-html sets innerHTML, the browser parses it, and the result is inert.
// The composition continues without a cut through walk and cache; it's
// drawn by walk-prep.js from all three scenes' marks.

import { drawPrep } from "./walk-prep.js";

export const transition = "fade";

export function draw(F) {
  drawPrep(F);
}
