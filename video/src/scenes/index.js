// Scene modules by scene id (the ids in script/narration.md). Each module
// exports draw(F, S); one that doesn't (yet) is drawn as a placeholder.

import * as open from "./open.js";
import * as code from "./code.js";
import * as literal from "./literal.js";
import * as root from "./root.js";
import * as lookup from "./lookup.js";
import * as markers from "./markers.js";
import * as parse from "./parse.js";
import * as walk from "./walk.js";
import * as cache from "./cache.js";
import * as create from "./create.js";
import * as update from "./update.js";
import * as rerender from "./rerender.js";
import * as nesting from "./nesting.js";
import * as lists from "./lists.js";
import * as recap from "./recap.js";
import * as outro from "./outro.js";

export const SCENES = { open, code, literal, root, lookup, markers, parse, walk, cache, create, update, rerender, nesting, lists, recap, outro };
