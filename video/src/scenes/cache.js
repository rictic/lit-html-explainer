// cache: the <template> and its parts list make a Template, which goes into
// the template cache under the strings array. Continues walk without a cut
// (see walk-prep.js); ends on the Template card and the cache for create.

import { drawPrep } from "./walk-prep.js";

export const transition = "cut";

export function draw(F) {
  drawPrep(F);
}
