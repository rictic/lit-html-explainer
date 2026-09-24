"""The soundtrack: the narration, plus a little music under the title card
and the end card.

    python pipeline/mix.py [--music path/to/music.mp3]

Reads out/narration.wav (from timeline.py) and timing/timeline.json, writes
out/soundtrack.wav (48 kHz stereo). The music (generated with Lyria 3.5, see
pipeline/music.md) is placed twice: its opening under the title card at the
end of `open`, and its ending under `outro`, so the video ends on the track's
last chord. Under speech the music is ducked well below the voice.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf
import subprocess

REPO = Path(__file__).resolve().parent.parent
SR = 48000


def load(path, sr=SR):
    """Any audio file -> float32 stereo at sr, via ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


def envelope(n, points):
    """Piecewise-linear gain over n samples from [(t_seconds, gain_db), ...]."""
    ts = np.array([p[0] for p in points]) * SR
    gs = np.array([db(p[1]) for p in points])
    return np.interp(np.arange(n), ts, gs).astype(np.float32)


def speech_mask(voice, win=0.05, hold=0.35):
    """1 where the narration is speaking (with a little hold), smoothed; for ducking."""
    w = int(win * SR)
    n = len(voice) // w
    rms = np.sqrt(np.mean(voice[: n * w].mean(axis=1).reshape(n, w) ** 2, axis=1) + 1e-12)
    on = (20 * np.log10(rms) > -40).astype(np.float32)
    k = int(hold / win)
    held = np.array([on[max(0, i - k): i + k + 1].max() for i in range(n)], dtype=np.float32)
    smooth = np.convolve(held, np.ones(5) / 5, mode="same")
    return np.repeat(smooth, w)[: len(voice)].tolist() + [0.0] * (len(voice) - n * w)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--music", default=str(REPO / "out/music/theme.mp3"))
    args = ap.parse_args()
    tl = json.loads((REPO / "timing/timeline.json").read_text())
    scenes = {s["id"]: s for s in tl["scenes"]}
    voice = load(REPO / "out/narration.wav")
    music = load(args.music)
    n = max(len(voice), int(tl["duration"] * SR))
    out = np.zeros((n, 2), dtype=np.float32)
    out[: len(voice)] += voice

    duck = np.array(speech_mask(voice), dtype=np.float32)[:n]
    duck = np.pad(duck, (0, n - len(duck)))

    # 1) the opening of the track under the title card: from the title's
    #    appearance (open.follow) to a little into `code`
    title = scenes["open"]["marks"]["follow"] + 0.6
    fade_end = scenes["code"]["start"] + 1.2
    seg = music[: int((fade_end - title) * SR)]
    env = envelope(len(seg), [(0, -30), (1.5, -12), (fade_end - title - 2.2, -9), (fade_end - title, -60)])
    a = int(title * SR)
    out[a:a + len(seg)] += seg * env[:, None] * (1 - 0.65 * duck[a:a + len(seg)])[:, None]

    # 2) the track's last 15 s (its trailing silence trimmed) under the
    #    outro, so its final chord ends the video
    loud = np.nonzero(np.abs(music).max(axis=1) > db(-50))[0]
    end = loud[-1] + int(0.3 * SR)
    tail = 15.0
    seg = music[end - int(tail * SR):end]
    b = n - len(seg)
    # quiet under the last words, then up for the final chord once they end
    voice_end = scenes["outro"]["paragraphs"][-1]["end"] - b / SR
    env = envelope(len(seg), [(0, -60), (2.0, -18), (voice_end + 0.1, -18), (voice_end + 0.8, -8),
                              (tail - 2.6, -8), (tail - 0.5, -24), (tail, -60)])
    out[b:] += seg * env[:, None] * (1 - 0.75 * duck[b:])[:, None]

    peak = np.abs(out).max()
    if peak > 0.98:
        out *= 0.98 / peak
    sf.write(REPO / "out/soundtrack.wav", out, SR, subtype="PCM_16")
    print(f"out/soundtrack.wav  {n / SR:.2f}s  peak {20 * np.log10(peak):.1f} dBFS")


if __name__ == "__main__":
    main()
