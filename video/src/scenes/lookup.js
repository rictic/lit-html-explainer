// lookup: the part looks its template up in the template cache (a WeakMap
// keyed by the strings array), misses, and has to prepare it: the first time
// lit-html looks at this template's HTML. Continues `root` without a cut
// (see root-stage.js) and ends with the strings array centre stage.

import { drawRootStage } from "./root-stage.js";

export const transition = "cut";

export function draw(F) {
  drawRootStage(F);
}
