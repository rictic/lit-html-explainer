#!/usr/bin/env node
// Renders the video (or stills of it) with headless Chromium.
//
//   render.mjs still <t> [<t> ...] [--scale 0.5] [--out out/stills]
//   render.mjs sheet [--from s --to s --step 2 --cols 6] [--scene id]   contact sheet of stills
//   render.mjs video [--from 0] [--to <end>] [--scene id] [--fps 60] [--scale 1] [--workers 10]
//                    [--crf 18] [--preset slow] [--out out/lit-html-renders.mp4]
//   render.mjs serve [--port 8123]          live preview at http://127.0.0.1:<port>/
//
// --scene <id> limits sheet/video to one scene's span (see timing/timeline.json).
//
// The page (video/index.html) draws each frame on a canvas and POSTs the raw
// pixels back here; each worker renders a contiguous chunk of frames into its
// own ffmpeg process, and the chunks are concatenated and muxed with the
// narration. Nothing on the page depends on frame history, so any chunk can
// start anywhere and the output is the same.

import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(process.env.LIT_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const W = 1920, H = 1080;
const FONTS = process.env.LIT_FONTS;
// The voice track: a pinned copy (flake input) or the one pipeline/timeline.py wrote.
const NARRATION = process.env.LIT_NARRATION ?? join(REPO, "out/narration.wav");
if (!FONTS) {
  console.error("LIT_FONTS unset: run inside `nix develop`");
  process.exit(1);
}
const TIMELINE = JSON.parse(readFileSync(join(REPO, "timing/timeline.json"), "utf8"));
const DURATION = TIMELINE.duration;

// --scene id -> that scene's span; otherwise --from/--to (seconds).
function span(opt, whole = [0, DURATION]) {
  if (opt.scene) {
    const s = TIMELINE.scenes.find((x) => x.id === opt.scene);
    if (!s) throw new Error(`no scene ${opt.scene}`);
    return [s.start, s.end];
  }
  return [+(opt.from ?? whole[0]), +(opt.to ?? whole[1])];
}

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  return { pos, opt };
}

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".ttf": "font/ttf", ".wav": "audio/wav", ".m4a": "audio/mp4", ".png": "image/png", ".css": "text/css",
};

function serveFile(res, path) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream",
                       "cache-control": "no-store" });
  createReadStream(path).pipe(res);
}

function readBody(req) {
  return new Promise((ok, fail) => {
    const parts = [];
    req.on("data", (b) => parts.push(b));
    req.on("end", () => ok(Buffer.concat(parts)));
    req.on("error", fail);
  });
}

// jobs: id -> { onFrame(i, buf), onDone(), onStill(name, buf), onFail(msg) }
const jobs = new Map();

function startServer(port = 0) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    const p = decodeURIComponent(url.pathname);
    try {
      if (req.method === "GET") {
        if (p === "/" ) return serveFile(res, join(REPO, "video/index.html"));
        if (p === "/narration.wav" || p === "/narration.m4a") return serveFile(res, NARRATION);
        if (p.startsWith("/fonts/")) return serveFile(res, join(FONTS, p.slice(7)));
        if (p.startsWith("/video/") || p.startsWith("/timing/") || p.startsWith("/truth/")) return serveFile(res, join(REPO, p));
        return res.writeHead(404).end();
      }
      const job = jobs.get(url.searchParams.get("job"));
      const body = await readBody(req);
      if (p === "/log") {
        console.log(`[page ${url.searchParams.get("job")}] ${body.toString()}`);
      } else if (!job) {
        return res.writeHead(410).end("no such job");
      } else if (p === "/frame") {
        await job.onFrame(+url.searchParams.get("i"), body);
      } else if (p === "/still") {
        await job.onStill(url.searchParams.get("name"), body);
      } else if (p === "/done") {
        job.onDone();
      } else if (p === "/fail") {
        job.onFail(body.toString());
      }
      res.writeHead(200).end("ok");
    } catch (e) {
      console.error(e);
      res.writeHead(500).end(String(e));
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}

function launchChromium(url) {
  const profile = mkdtempSync(join(tmpdir(), "lit-explainer-chromium-"));
  const proc = spawn("chromium", [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--mute-audio", "--hide-scrollbars",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion",
    `--user-data-dir=${profile}`, `--window-size=${W},${H}`, "--force-device-scale-factor=1",
    url,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  proc.stderr.on("data", (b) => { err = (err + b).slice(-4000); });
  proc.on("exit", () => rmSync(profile, { recursive: true, force: true }));
  proc.lastErr = () => err;
  return proc;
}

function pageUrl(port, params) {
  return `http://127.0.0.1:${port}/?${new URLSearchParams(params)}`;
}

// ------------------------------------------------------------------ stills

async function stills(times, opt) {
  const out = resolve(opt.out ?? join(REPO, "out/stills"));
  mkdirSync(out, { recursive: true });
  const server = await startServer();
  const port = server.address().port;
  const id = "still";
  let finish;
  const done = new Promise((ok) => (finish = ok));
  const written = [];
  let failed = null;
  jobs.set(id, {
    onStill: async (name, buf) => {
      const path = join(out, `${name}.png`);
      writeFileSync(path, buf);
      written.push(path);
    },
    onDone: () => finish(),
    onFail: (msg) => { failed = msg; finish(); },
  });
  const params = { mode: "still", job: id, times: times.join(","), scale: opt.scale ?? "0.5" };
  if (opt.stamp) params.stamp = 1;
  const browser = launchChromium(pageUrl(port, params));
  const timer = setTimeout(() => { console.error("timed out\n" + browser.lastErr()); finish(); }, 600_000);
  await done;
  clearTimeout(timer);
  browser.kill();
  server.close();
  if (!opt.quiet) for (const p of written) console.log(p);
  if (failed) {
    console.error(`page error: ${failed}`);
    process.exitCode = 1;
  }
  return written;
}

// ------------------------------------------------------------------- video

// RGB -> YUV with the BT.709 matrix, and say so in the stream. ffmpeg's
// default is BT.601, untagged, while browsers and players decode untagged HD
// as BT.709, which shifts saturated colours. (setparams: the encoder takes
// its colour tags from the frames, and scale only sets the matrix and range.)
export const BT709 = {
  filter: "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p," +
          "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv",
  tags: ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"],
};

// Chunks are encoded once, at delivery quality (rendering is the bottleneck,
// so a slow preset costs little). All chunks share settings, so the concat
// demuxer can join them without re-encoding.
function ffmpegChunk(path, scale, fps, { crf = "18", preset = "slow" } = {}) {
  const w = Math.round(W * scale), h = Math.round(H * scale);
  return spawn("ffmpeg", [
    "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${w}x${h}`, "-r", String(fps),
    "-i", "-", "-vf", BT709.filter, "-c:v", "libx264", "-preset", preset, "-crf", crf,
    "-tune", "animation", "-profile:v", "high", "-level:v", fps > 30 ? "4.2" : "4.1", ...BT709.tags,
    "-g", String(fps * 2), "-threads", "3", path,
  ], { stdio: ["pipe", "inherit", "inherit"] });
}

async function video(opt) {
  const scale = +(opt.scale ?? 1);
  const fps = +(opt.fps ?? 60);
  const workers = +(opt.workers ?? 10);
  const [t0s, t1s] = span(opt);
  const from = Math.round(t0s * fps);
  const to = Math.min(Math.ceil(DURATION * fps), Math.round(t1s * fps));
  const out = resolve(opt.out ?? join(REPO, opt.scene ? `out/scene-${opt.scene}.mp4` : "out/lit-html-renders.mp4"));
  const work = mkdtempSync(join(opt.tmp ?? tmpdir(), "lit-explainer-chunks-"));
  mkdirSync(dirname(out), { recursive: true });

  const server = await startServer();
  const port = server.address().port;
  const per = Math.ceil((to - from) / workers);
  const chunks = [];
  const t0 = Date.now();
  let rendered = 0;
  const progress = setInterval(() => {
    const el = (Date.now() - t0) / 1000;
    const rate = rendered / el;
    console.log(`${rendered}/${to - from} frames  ${rate.toFixed(1)} fps  eta ${((to - from - rendered) / rate / 60).toFixed(1)} min`);
  }, 15_000);

  await Promise.all(Array.from({ length: workers }, (_, k) => {
    const a = from + k * per, b = Math.min(to, a + per);
    if (a >= b) return null;
    const path = join(work, `chunk${String(k).padStart(3, "0")}.mp4`);
    chunks.push(path);
    const enc = ffmpegChunk(path, scale, fps, { crf: opt.crf, preset: opt.preset });
    const id = `w${k}`;
    let next = a;
    return new Promise((ok, fail) => {
      jobs.set(id, {
        onFrame: (i, buf) => {
          if (i !== next) throw new Error(`${id}: frame ${i}, expected ${next}`);
          next++;
          rendered++;
          return new Promise((drained) => (enc.stdin.write(buf) ? drained() : enc.stdin.once("drain", drained)));
        },
        onDone: () => {
          enc.stdin.end();
          enc.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg ${id} exit ${code}`))));
          browser.kill();
        },
        onFail: (msg) => {
          browser.kill();
          enc.kill();
          fail(new Error(`${id}: page error at frame ${next}: ${msg}`));
        },
      });
      const browser = launchChromium(pageUrl(port, { mode: "capture", job: id, from: a, to: b, scale, fps }));
      browser.on("exit", () => {
        if (next < b) fail(new Error(`chromium ${id} died at frame ${next}: ${browser.lastErr()}`));
      });
    });
  }).filter(Boolean));
  clearInterval(progress);
  server.close();

  const list = join(work, "chunks.txt");
  writeFileSync(list, chunks.sort().map((c) => `file '${c}'`).join("\n") + "\n");
  const tStart = from / fps, dur = (to - from) / fps;
  await new Promise((ok, fail) => spawn("ffmpeg", [
    "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-ss", String(tStart), "-t", String(dur), "-i", NARRATION,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-metadata", "title=How lit-html renders", "-movflags", "+faststart", "-shortest", out,
  ], { stdio: "inherit" }).on("exit", (c) => (c === 0 ? ok() : fail(new Error(`mux exit ${c}`)))));
  rmSync(work, { recursive: true, force: true });
  console.log(`${out}  (${to - from} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

// ------------------------------------------------------------ contact sheet

// A grid of small stills from --from to --to (or one --scene) every --step
// seconds, labelled with their times, as one PNG.
async function sheet(opt) {
  const [from, to] = span(opt);
  const step = +(opt.step ?? 2), cols = +(opt.cols ?? 6);
  const times = [];
  for (let t = from + step / 2; t < to; t += step) times.push(t.toFixed(2));
  const dir = mkdtempSync(join(tmpdir(), "lit-explainer-sheet-"));
  await stills(times, { ...opt, out: dir, scale: opt.scale ?? "0.25", quiet: true, stamp: 1 });
  const out = resolve(opt.out ?? join(REPO, `out/sheet_${opt.scene ?? `${from}-${to}`}.png`));
  mkdirSync(dirname(out), { recursive: true });
  const rows = Math.ceil(times.length / cols);
  await new Promise((ok, fail) => spawn("ffmpeg", [
    "-v", "error", "-y", "-pattern_type", "glob", "-i", join(dir, "*.png"),
    "-vf", `tile=${cols}x${rows}:padding=4:color=black`,
    "-frames:v", "1", out,
  ], { stdio: "inherit" }).on("exit", (c) => (c === 0 ? ok() : fail(new Error(`tile exit ${c}`)))));
  rmSync(dir, { recursive: true, force: true });
  console.log(out);
}

// ------------------------------------------------------------------- serve

async function serve(opt) {
  const server = await startServer(+(opt.port ?? 8123));
  console.log(`live preview: http://127.0.0.1:${server.address().port}/`);
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const cmd = pos.shift();
if (cmd === "still") await stills(pos, opt);
else if (cmd === "video") await video(opt);
else if (cmd === "serve") await serve(opt);
else if (cmd === "sheet") await sheet(opt);
else {
  console.error("usage: render.mjs still <t>... | sheet [--scene id] | video [--scene id --fps n --scale k] | serve");
  process.exit(2);
}
