"""Lays the narration takes out in time: the voice track and its timeline.

    python pipeline/timeline.py

Reads cache/paragraphs.json (from tts.mjs), the takes in cache/tts and their
word timings in cache/align. Trims each take's leading and trailing silence,
places the paragraphs one after another with fixed gaps (plus the script's
{pause} lines), and writes:

    timing/timeline.json   scenes, paragraphs, word timings and marks, in
                           seconds from the start of the video (committed;
                           the video draws from it)
    out/narration.wav      the voice track
    timing/captions.vtt    captions, one cue per sentence (committed; the demo page uses them)
"""

import json
import os
import re
from pathlib import Path

import numpy as np
import soundfile as sf

from episode import paths

REPO = Path(__file__).resolve().parent.parent
SR = 24000
GAP = 0.5         # between paragraphs of a scene
LEAD = 0.5        # from the start of a scene to its first word
TAIL = 0.6        # from a scene's last word to the end of the scene
PAD = 0.04        # silence kept around each take when trimming


def trim(audio):
    """The take's speech span, in samples: first/last 10 ms window above -45 dBFS."""
    win = SR // 100
    n = len(audio) // win
    rms = np.sqrt(np.mean(audio[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    loud = np.nonzero(20 * np.log10(rms) > -45)[0]
    if len(loud) == 0:
        return 0, len(audio)
    a = max(0, loud[0] * win - int(PAD * SR))
    b = min(len(audio), (loud[-1] + 1) * win + int(PAD * SR))
    return a, b


# The script spells names the way they're said; captions show them the way
# they're written.
CAPTION_TEXT = [
    ("lit HTML dot T S", "lit-html.ts"),
    ("lit HTML", "lit-html"),
    ("inner HTML", "innerHTML"),
    ("import node", "importNode"),
    ("Import node", "importNode"),
    ("set attribute", "setAttribute"),
    ("dollar, lit, dollar,", "$lit$"),
    ("at-click", "@click"),
    ("template result", "TemplateResult"),
    ("template instance", "TemplateInstance"),
    # episode 2
    ("tree walker", "TreeWalker"),
    ("add event listener", "addEventListener"),
    ("handle event", "handleEvent"),
    ("request update", "requestUpdate"),
    ("update complete", "updateComplete"),
    ("adopted style sheets", "adoptedStyleSheets"),
    ("CSS style sheet", "CSSStyleSheet"),
    ("unsafe HTML", "unsafeHTML"),
    ("insert before", "insertBefore"),
]


def caption(text):
    for said, written in CAPTION_TEXT:
        text = text.replace(said, written)
    return text


def write(path, data):
    """Writes atomically: the video may be reading these files while they change."""
    tmp = path.with_name(path.name + ".tmp")
    if isinstance(data, str):
        tmp.write_text(data)
    else:
        sf.write(tmp, data, SR, subtype="PCM_16", format="WAV")
    os.replace(tmp, path)


def vtt_time(t):
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def main():
    P = paths()
    scenes = json.loads(P["paragraphs"].read_text())
    t = 0.0
    track = []
    out_scenes = []
    cues = []
    for scene in scenes:
        start = t
        t += LEAD + scene["lead"]
        paragraphs = []
        marks = {}
        for i, p in enumerate(scene["paragraphs"]):
            audio, sr = sf.read(REPO / "cache/tts" / f"{p['key']}.wav", dtype="float32")
            assert sr == SR, f"{p['key']}: {sr} Hz"
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            a, b = trim(audio)
            clip = audio[a:b]
            offset = t - a / SR
            align = json.loads((REPO / "cache/align" / f"{p['key']}.json").read_text())
            words = [{"w": w["text"], "s": round(w["start"] + offset, 3), "e": round(w["end"] + offset, 3)}
                     for w in align["words"]]
            end = t + len(clip) / SR
            for m in p["marks"]:
                marks[m["name"]] = words[m["word"]]["s"] if m["word"] < len(words) else round(words[-1]["e"], 3)
            paragraphs.append({"start": round(t, 3), "end": round(end, 3), "text": p["text"], "words": words})
            track.append((t, clip))
            # captions: one cue per sentence
            sentence = []
            for w in words:
                sentence.append(w)
                if re.search(r"[.?!]$", w["w"]) or w is words[-1]:
                    cues.append((sentence[0]["s"], sentence[-1]["e"], " ".join(x["w"] for x in sentence)))
                    sentence = []
            t = end + p["pauseAfter"] + (GAP if i < len(scene["paragraphs"]) - 1 else 0)
        t += TAIL
        out_scenes.append({"id": scene["scene"], "start": round(start, 3), "end": round(t, 3),
                           "paragraphs": paragraphs, "marks": marks})
    duration = round(t, 3)

    P["timeline"].parent.mkdir(parents=True, exist_ok=True)
    write(P["timeline"], json.dumps({"duration": duration, "scenes": out_scenes}, indent=1) + "\n")

    voice = np.zeros(int(np.ceil(duration * SR)) + 1, dtype=np.float32)
    for start, clip in track:
        i = int(round(start * SR))
        voice[i:i + len(clip)] += clip
    P["narration"].parent.mkdir(parents=True, exist_ok=True)
    write(P["narration"], voice)

    vtt = ["WEBVTT", ""]
    for i, (s, e, text) in enumerate(cues):
        # hold each caption until the next begins (or a little past its last word)
        nxt = cues[i + 1][0] if i + 1 < len(cues) else e + 1.0
        vtt += [f"{vtt_time(s)} --> {vtt_time(min(nxt, e + 1.2))}", caption(text), ""]
    write(P["captions"], "\n".join(vtt) + "\n")

    for s in out_scenes:
        print(f"{s['id']:10s} {s['start']:7.2f} - {s['end']:7.2f}  ({s['end'] - s['start']:5.1f}s)")
    print(f"duration {duration:.2f}s")


if __name__ == "__main__":
    main()
