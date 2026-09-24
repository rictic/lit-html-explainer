# Music

One 62-second instrumental, generated once with Lyria 3.5 (Gemini API,
`POST /v1beta/interactions`, model `lyria-3.5`) from this prompt:

> Instrumental only, no vocals. A 40-second piece of calm, bright, modern
> music for the title card and end card of a programming explainer video.
> Warm electric piano and a soft plucked synth arpeggio over a gentle pad,
> light brushed percussion entering after 8 seconds, 90 bpm, major key,
> curious and optimistic but understated, clean mix, no build-ups or drops.
> It should end on a resolved chord with a natural decay.

It came back as 62 s of lo-fi electric piano, bass, a soft flute-like lead
and light drums, ending on a sustained chord. `pipeline/mix.py` uses its
first ~11 s under the title card and its last 15 s under the outro, ducked
under the narration. The file is pinned as a flake input (see flake.nix).
