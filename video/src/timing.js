// The narration timeline (timing/timeline.json, from pipeline/timeline.py)
// and what the real lit-html did with the video's examples
// (truth/truth.json, from tools/truth.mjs).

export const FPS = 30;

let TL = null, TRUTH = null;

export async function loadTiming() {
  const [tl, truth] = await Promise.all([
    fetch("timing/timeline.json").then((r) => r.json()),
    fetch("truth/truth.json").then((r) => r.json()),
  ]);
  TL = tl;
  TRUTH = truth;
  const byId = new Map();
  TL.scenes.forEach((s, i) => {
    s.index = i;
    s.prev = TL.scenes[i - 1] ?? null;
    s.next = TL.scenes[i + 1] ?? null;
    byId.set(s.id, s);
  });
  TL.byId = byId;
  TL.sceneAt = (t) => {
    for (const s of TL.scenes) if (t < s.end) return s;
    return TL.scenes.at(-1);
  };
}

export const timeline = () => TL;
export const truth = () => TRUTH;
export const duration = () => TL.duration;

// Timing helpers for one scene. Scenes get one of these as `S`:
//   S.start, S.end, S.dur        the scene's span, in seconds from the video start
//   S.m("click")                  when the narration reaches the mark {click}
//   S.p(1)                        paragraph 1: {start, end, text, words: [{w, s, e}]}
//   S.word(1, "button")           when word "button" (first match) starts in paragraph 1
//   S.after(mark, dt)             S.m(mark) + dt
// Unknown marks throw, so a typo fails the render instead of drifting silently.
export function scene(id) {
  const s = TL.byId.get(id);
  if (!s) throw new Error(`no scene "${id}"`);
  return {
    id,
    start: s.start,
    end: s.end,
    dur: s.end - s.start,
    prev: s.prev?.id ?? null,
    next: s.next?.id ?? null,
    marks: s.marks,
    m(name) {
      const t = s.marks[name];
      if (t === undefined) throw new Error(`no mark {${name}} in scene ${id}`);
      return t;
    },
    after(name, dt) { return this.m(name) + dt; },
    p(i) {
      const p = s.paragraphs[i];
      if (!p) throw new Error(`no paragraph ${i} in scene ${id}`);
      return p;
    },
    word(i, text, nth = 0) {
      const norm = (w) => w.toLowerCase().replace(/[^a-z0-9$']/g, "");
      const ws = this.p(i).words.filter((w) => norm(w.w) === norm(text));
      if (!ws[nth]) throw new Error(`no word "${text}" #${nth} in ${id} paragraph ${i}`);
      return ws[nth].s;
    },
  };
}

// Absolute time of "scene.mark".
export function mark(ref) {
  const [id, name] = ref.split(".");
  return scene(id).m(name);
}
