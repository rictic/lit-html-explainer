// create: back in the root part, nothing to update, so a TemplateInstance
// clones the template's content and walks the copy, making one Part per
// template part. Drawn with update as one composition (see create-comp.js).

import { drawCreateUpdate } from "./create-comp.js";

export const transition = "fade";

export function draw(F) {
  drawCreateUpdate(F);
}
