// root: render() looks for a part on the container, finds none, makes the
// root ChildPart (its start marked by an empty comment: mystery comment #1),
// stores it on the container and hands it the TemplateResult.
// Drawn together with `lookup` as one continuous shot: see root-stage.js.

import { drawRootStage } from "./root-stage.js";

export const transition = "fade";

export function draw(F) {
  drawRootStage(F);
}
