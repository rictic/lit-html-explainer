"""Where each episode's files live (mirrors pipeline/episode.mjs)."""

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def episode_arg(argv=sys.argv):
    return argv[argv.index("--episode") + 1] if "--episode" in argv else "renders"


def paths(ep=None):
    ep = ep or episode_arg()
    legacy = ep == "renders"
    return {
        "ep": ep,
        "script": REPO / ("script/narration.md" if legacy else f"script/{ep}.md"),
        "paragraphs": REPO / ("cache/paragraphs.json" if legacy else f"cache/{ep}/paragraphs.json"),
        "timeline": REPO / ("timing/timeline.json" if legacy else f"timing/{ep}/timeline.json"),
        "captions": REPO / ("timing/captions.vtt" if legacy else f"timing/{ep}/captions.vtt"),
        "narration": REPO / ("out/narration.wav" if legacy else f"out/{ep}/narration.wav"),
        "soundtrack": REPO / ("out/soundtrack.wav" if legacy else f"out/{ep}/soundtrack.wav"),
    }
