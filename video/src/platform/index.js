// Episode 2, "What the browser does for Lit": scene modules by scene id
// (the ids in script/platform.md). A module without a draw() is drawn as a
// placeholder.

import * as intro from "./intro.js";
import * as tagged from "./tagged.js";
import * as parser from "./parser.js";
import * as clone from "./clone.js";
import * as events from "./events.js";
import * as components from "./components.js";
import * as batching from "./batching.js";
import * as recap from "./recap.js";
import * as outro from "./outro.js";

export const SCENES = { intro, tagged, parser, clone, events, components, batching, recap, outro };
