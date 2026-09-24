"""Word timings for each narration take, by forced alignment.

    python pipeline/align.py            align every take listed in cache/paragraphs.json

The script text is known, so this aligns it to the audio with torchaudio's
MMS_FA model (CTC forced alignment over romanized characters) rather than
transcribing. Words that aren't said the way they're spelled ("lit-html",
"DOM") are respelled first, and their pieces are merged back, so there is
exactly one timing per script word (the unit marks count in).

Writes cache/align/<take>.json: {"duration": s, "words": [{"text", "start", "end", "score"}]}.
"""

import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import torchaudio

from episode import paths

REPO = Path(__file__).resolve().parent.parent

# How words are said, for the aligner's character model.
LETTERS = {"h": "aitch", "t": "tee", "m": "em", "l": "el", "s": "ess", "d": "dee", "o": "oh"}
RESPELL = {
    "lit-html": ["lit", "aitch", "tee", "em", "el"],
    "html": ["aitch", "tee", "em", "el"],
    "dom": ["dom"],
    "at-click": ["at", "click"],
    "t": ["tee"],
    "s": ["ess"],
}


def pieces(word):
    """The aligner tokens for one script word."""
    w = word.lower().strip()
    w = re.sub(r"^[^a-z0-9']+|[^a-z0-9']+$", "", w)  # outer punctuation
    w = w.replace("’", "'")
    if w in RESPELL:
        return RESPELL[w]
    out = []
    for part in re.split(r"[-/]", w):
        part = re.sub(r"[^a-z']", "", part)
        if part in RESPELL:
            out += RESPELL[part]
        elif part:
            out.append(part)
    return out


class Aligner:
    def __init__(self):
        self.bundle = torchaudio.pipelines.MMS_FA
        self.model = self.bundle.get_model(with_star=False).eval()
        self.dictionary = self.bundle.get_dict(star=None)
        self.sr = self.bundle.sample_rate

    def align(self, wav_path, text):
        audio, sr = sf.read(wav_path, dtype="float32", always_2d=True)
        audio = torch.from_numpy(audio.mean(axis=1)).unsqueeze(0)
        duration = audio.shape[1] / sr
        if sr != self.sr:
            audio = torchaudio.functional.resample(audio, sr, self.sr)
        words = text.split()
        units, owner = [], []
        for i, w in enumerate(words):
            for p in pieces(w):
                p = "".join(c for c in p if c in self.dictionary)
                if p:
                    units.append(p)
                    owner.append(i)
        with torch.inference_mode():
            emission, _ = self.model(audio)
            emission = torch.log_softmax(emission, dim=-1)
        tokens = [self.dictionary[c] for u in units for c in u]
        targets = torch.tensor([tokens], dtype=torch.int32)
        path, scores = torchaudio.functional.forced_align(emission, targets, blank=0)
        spans = torchaudio.functional.merge_tokens(path[0], scores[0].exp())
        sec = audio.shape[1] / emission.shape[1] / self.sr
        # regroup character spans into units, then units into script words
        out = [None] * len(words)
        k = 0
        for u, i in zip(units, owner):
            chars = spans[k:k + len(u)]
            k += len(u)
            s, e = chars[0].start * sec, chars[-1].end * sec
            score = float(np.mean([c.score for c in chars]))
            if out[i] is None:
                out[i] = {"text": words[i], "start": s, "end": e, "score": score, "n": 1}
            else:
                out[i]["end"] = e
                out[i]["score"] += score
                out[i]["n"] += 1
        for i, w in enumerate(out):
            if w is None:  # nothing pronounceable (e.g. a lone dash): borrow a neighbour's time
                prev = out[i - 1] if i else None
                t = prev["end"] if prev else 0.0
                out[i] = {"text": words[i], "start": t, "end": t, "score": 0.0, "n": 1}
            w = out[i]
            w["score"] = round(w["score"] / w.pop("n"), 3)
            w["start"] = round(w["start"], 3)
            w["end"] = round(w["end"], 3)
        return {"duration": round(duration, 3), "words": out}


def main():
    scenes = json.loads(paths()["paragraphs"].read_text())
    paragraphs = [p for s in scenes for p in s["paragraphs"]]
    outdir = REPO / "cache/align"
    outdir.mkdir(parents=True, exist_ok=True)
    todo = [p for p in paragraphs if not (outdir / f"{p['key']}.json").exists()
            and (REPO / "cache/tts" / f"{p['key']}.wav").exists()]
    if not todo:
        print("all takes aligned")
        return
    torch.set_num_threads(8)
    aligner = Aligner()
    for p in todo:
        result = aligner.align(REPO / "cache/tts" / f"{p['key']}.wav", p["text"])
        (outdir / f"{p['key']}.json").write_text(json.dumps(result, indent=1))
        low = [w["text"] for w in result["words"] if w["score"] < 0.3]
        print(f"{p['scene']}:{p['index']}  {result['duration']:.1f}s  {len(result['words'])} words"
              + (f"  low confidence: {' '.join(low)}" if low else ""), flush=True)


if __name__ == "__main__":
    sys.exit(main())
