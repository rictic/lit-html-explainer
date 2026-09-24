# How lit-html renders — an explainer video

A narrated, animated explainer that follows one lit-html template through
`render()`: the tagged template literal, the **prepare** phase (markers, the
`<template>` element, template parts, the template cache), the **create** phase
(cloning and parts), and the **update** phase (dirty-checked commits), then
nesting, lists, and the layers of caching that make re-renders cheap.

It's based on lit's design doc,
[Life of a lit-html render](https://github.com/lit/lit/blob/main/dev-docs/design/how-lit-html-works.md),
and on the source, [`lit-html.ts`](https://github.com/lit/lit/blob/main/packages/lit-html/src/lit-html.ts).

## How it's made

```
script/narration.md ──tts.mjs──▶ cache/tts/*.wav ──align.py──▶ cache/align/*.json
        │                          (Gemini 3.8 Flash TTS,        (MMS_FA forced
        │                           one call per paragraph)       alignment)
        └──────────────────────────────timeline.py──────────────▶ timing/timeline.json
                                                                  timing/captions.vtt
                                                                  out/narration.wav
truth/page.js ──tools/truth.mjs──▶ truth/truth.json   (the examples, run through the
                                                        real lit-html 3.3.3)
video/ (canvas, one frame = f(t)) ──tools/render.mjs──▶ out/lit-html-renders.mp4
```

- **Narration**: `script/narration.md` is the source of truth. Paragraphs are
  synthesized one per call (voice settings in `pipeline/voice.json`, takes
  cached by content hash), checked by a Gemini model listening for misread
  words (`pipeline/critique.mjs`), and word-aligned, so scenes can schedule
  animation on `{marks}` in the script instead of on hand-typed times.
- **Ground truth**: `tools/truth.mjs` renders the video's examples with the
  development build of lit-html in headless Chromium, with its debug log
  events on, and records the strings, the marker, the annotated HTML, the
  parsed `<template>`, the template parts, every part update and DOM commit,
  and the DOM after each render. The scenes draw lit-html's data from that
  file rather than from retyped copies.
- **Video**: `video/` draws each frame on a canvas as a pure function of time
  (see [docs/STYLE.md](docs/STYLE.md) and [docs/STORYBOARD.md](docs/STORYBOARD.md)).
  `tools/render.mjs` runs N headless Chromium workers, each piping raw frames
  for a contiguous chunk into its own ffmpeg, then joins the chunks and muxes
  the narration.

## Commands

All inside `nix develop` (Python with torch/torchaudio, Node, Chromium,
ffmpeg; `$LIT_FONTS` and `$LIT_HTML` point at the fonts and lit-html from
the flake):

```sh
source /keys/gemini_api_keys.env         # GEMINI_API_KEY, for tts.mjs and critique.mjs
node pipeline/tts.mjs                    # synthesize new/changed paragraphs
node pipeline/tts.mjs --redo markers:2   # a fresh take of one paragraph
node pipeline/critique.mjs               # listen for misread words and glitches
python pipeline/align.py                 # word timings for new takes
python pipeline/timeline.py              # timeline.json, captions, narration.wav

node tools/truth.mjs                     # re-capture truth/truth.json

node tools/render.mjs serve              # live preview on :8123 (?t=seconds)
node tools/render.mjs sheet --scene walk --step 1   # contact sheet of one scene
node tools/render.mjs video --fps 60     # the whole video, out/lit-html-renders.mp4
```
