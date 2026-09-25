// Where each episode's files live. Episode 1 ("renders") keeps its original
// paths; later episodes get their own directories.

import { join } from "node:path";

export function episodePaths(repo, ep = "renders") {
  const legacy = ep === "renders";
  return {
    ep,
    script: join(repo, legacy ? "script/narration.md" : `script/${ep}.md`),
    paragraphs: join(repo, legacy ? "cache/paragraphs.json" : `cache/${ep}/paragraphs.json`),
    timeline: join(repo, legacy ? "timing/timeline.json" : `timing/${ep}/timeline.json`),
    captions: join(repo, legacy ? "timing/captions.vtt" : `timing/${ep}/captions.vtt`),
    narration: join(repo, legacy ? "out/narration.wav" : `out/${ep}/narration.wav`),
    soundtrack: join(repo, legacy ? "out/soundtrack.wav" : `out/${ep}/soundtrack.wav`),
  };
}

// --episode <name> from argv (default "renders").
export function episodeArg(argv = process.argv) {
  const i = argv.indexOf("--episode");
  return i >= 0 ? argv[i + 1] : "renders";
}
