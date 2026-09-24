// Boot: load fonts, the timeline and the lit-html capture, then run in one of
// three modes.
//   live     plays the soundtrack and draws in sync with it (the default)
//   still    ?mode=still&times=12.5,40&job=..  draws each time, POSTs PNGs
//   capture  ?mode=capture&from=F&to=T&job=..  draws frames F..T-1, POSTs raw RGBA
//   check    ?mode=check&from=F&to=T&job=..    draws frames F..T-1, POSTs the errors

import { loadFonts } from "./fonts.js";
import { EPISODE, FPS, loadTiming, timeline } from "./timing.js";
import { Renderer } from "./render.js";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "live";
const job = params.get("job");

await Promise.all([loadFonts(), loadTiming()]);

const scale = +(params.get("scale") ?? 1);
const canvas = document.getElementById("c");
const renderer = new Renderer(canvas, scale, { readback: mode === "capture" });

if (mode === "capture") {
  const from = +params.get("from"), to = +params.get("to");
  const fps = +(params.get("fps") ?? FPS);
  for (let i = from; i < to; i++) {
    // Draw each frame as of the end of its display interval, so an event on
    // a word lands on the frame where the word is heard, not one frame late.
    renderer.draw((i + 1) / fps);
    const px = renderer.pixels();
    const r = await fetch(`frame?job=${job}&i=${i}`, { method: "POST", body: px });
    if (!r.ok) throw new Error(`frame ${i}: ${r.status}`);
  }
  await fetch(`done?job=${job}`, { method: "POST" });
} else if (mode === "check") {
  // Every frame, nothing read back: each distinct exception once, with the
  // first frame that threw it and how many did.
  const from = +params.get("from"), to = +params.get("to");
  const fps = +(params.get("fps") ?? FPS);
  const seen = new Map();
  for (let i = from; i < to; i++) {
    try {
      renderer.draw((i + 1) / fps);
    } catch (e) {
      const error = String(e?.stack ?? e).split("\n").slice(0, 2).map((l) => l.trim()).join(" ");
      if (!seen.has(error)) seen.set(error, { error, frame: i, count: 0 });
      seen.get(error).count++;
    }
  }
  await fetch(`report?job=${job}`, { method: "POST", body: JSON.stringify([...seen.values()]) });
  await fetch(`done?job=${job}`, { method: "POST" });
} else if (mode === "still") {
  for (const ts of params.get("times").split(",")) {
    renderer.draw(+ts);
    if (params.has("stamp")) renderer.stamp(+ts);
    const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
    await fetch(`still?job=${job}&name=t${(+ts).toFixed(2).padStart(7, "0")}`, { method: "POST", body: blob });
  }
  await fetch(`done?job=${job}`, { method: "POST" });
} else {
  live();
}

function live() {
  const T = timeline();
  document.body.classList.add("live", "idle");
  const audio = new Audio(params.get("audio") ?? (EPISODE === "renders" ? "soundtrack.m4a" : `soundtrack-${EPISODE}.m4a`));
  audio.preload = "auto";
  const play = document.getElementById("play");
  const seek = document.getElementById("seek");
  const time = document.getElementById("time");
  const fpsEl = document.getElementById("fps");
  const sceneSel = document.getElementById("scene");
  seek.max = T.duration;
  for (const s of T.scenes) sceneSel.add(new Option(s.id, s.start));
  sceneSel.onchange = () => { audio.currentTime = +sceneSel.value; };
  audio.currentTime = +(params.get("t") ?? 0);
  const toggle = () => (audio.paused ? audio.play() : audio.pause());
  document.getElementById("play0").onclick = () => { document.body.classList.remove("idle"); audio.play(); };
  play.onclick = toggle;
  addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); document.body.classList.remove("idle"); toggle(); }
    if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
    if (e.key === "ArrowRight") audio.currentTime = Math.min(T.duration, audio.currentTime + 5);
  });
  seek.oninput = () => { audio.currentTime = +seek.value; };
  audio.onplay = () => (play.textContent = "Pause");
  audio.onpause = () => { play.textContent = "Play"; document.body.classList.remove("quiet"); };
  let idle = 0;
  addEventListener("mousemove", () => {
    document.body.classList.remove("quiet");
    clearTimeout(idle);
    idle = setTimeout(() => { if (!audio.paused) document.body.classList.add("quiet"); }, 2500);
  });
  let last = performance.now(), frames = 0;
  const tick = () => {
    const t = audio.currentTime;
    renderer.draw(t);
    seek.value = t;
    time.textContent = `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
    const cur = T.sceneAt(t);
    if (cur && sceneSel.value !== String(cur.start)) sceneSel.value = cur.start;
    frames++;
    const now = performance.now();
    if (now - last > 1000) { fpsEl.textContent = `${frames} fps`; frames = 0; last = now; }
    requestAnimationFrame(tick);
  };
  tick();
}
