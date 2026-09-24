// Parses script/narration.md into scenes and paragraphs (see the notes at
// the top of that file for the syntax).

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// A paragraph's words, as the aligner and the marks count them: split on
// whitespace, so punctuation stays attached ("backtick," is one word).
export const words = (text) => text.split(/\s+/).filter(Boolean);

export function parseScript(path) {
  const src = readFileSync(path, "utf8");
  const scenes = [];
  let scene = null;
  for (const block of src.split(/\n\s*\n/)) {
    const b = block.trim();
    const head = /^## (\w+)$/.exec(b);
    if (head) {
      scene = { id: head[1], lead: 0, paragraphs: [] };
      scenes.push(scene);
      continue;
    }
    if (!scene || !b) continue; // the notes before the first scene
    const pause = /^\{pause ([\d.]+)\}$/.exec(b);
    if (pause) {
      // before the first paragraph: silence at the start of the scene
      const last = scene.paragraphs.at(-1);
      if (last) last.pauseAfter += +pause[1];
      else scene.lead += +pause[1];
      continue;
    }
    // Marks: {name} before a word marks its start; at the end, the end.
    const marks = [];
    let text = "";
    for (const piece of b.replace(/\s+/g, " ").split(/(\{\w+\})/)) {
      const m = /^\{(\w+)\}$/.exec(piece);
      if (m) marks.push({ name: m[1], word: words(text).length });
      else text += piece;
    }
    text = text.replace(/\s+/g, " ").trim();
    const n = words(text).length;
    for (const m of marks) {
      if (m.word >= n) m.word = n; // end of paragraph
      if (scene.paragraphs.some((p) => p.marks.some((x) => x.name === m.name)) || marks.filter((x) => x.name === m.name).length > 1)
        throw new Error(`${scene.id}: duplicate mark {${m.name}}`);
    }
    scene.paragraphs.push({ scene: scene.id, index: scene.paragraphs.length, text, marks, pauseAfter: 0 });
  }
  const ids = new Set();
  for (const s of scenes) {
    if (ids.has(s.id)) throw new Error(`duplicate scene ${s.id}`);
    ids.add(s.id);
  }
  return scenes;
}

export const sha = (...xs) => createHash("sha256").update(xs.join("\u0000")).digest("hex").slice(0, 20);
