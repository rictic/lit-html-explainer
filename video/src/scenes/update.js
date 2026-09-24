// update: the instance gives each Part its value; each Part writes to its
// node; the fragment goes into the page; devtools explains the marker
// comment. Continues create's composition exactly (see create-comp.js).

import { drawCreateUpdate } from "./create-comp.js";

export const transition = "cut";

export function draw(F) {
  drawCreateUpdate(F);
}
