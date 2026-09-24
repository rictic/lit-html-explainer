#!/usr/bin/env node
// Text to speech for the narration, one Gemini TTS call per paragraph.
//
//   node pipeline/tts.mjs                 synthesize every paragraph not yet in cache/tts
//   node pipeline/tts.mjs --only markers  just one scene (or scene:index)
//   node pipeline/tts.mjs --redo markers:2  throw away a take and make a new one
//   node pipeline/tts.mjs --sample open:1 --voices Charon,Iapetus --out out/voices
//                                         the same paragraph in several voices
//
// Voice settings live in pipeline/voice.json. A take is cached under the hash
// of (model, voice, style, text, take number), so editing a paragraph only
// re-synthesizes that paragraph. Needs GEMINI_API_KEY (source
// /keys/gemini_api_keys.env).

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseScript, sha } from "./script.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VOICE = JSON.parse(readFileSync(join(REPO, "pipeline/voice.json"), "utf8"));
const KEY = process.env.GEMINI_API_KEY;

function parseArgs(argv) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
  return opt;
}

// The cache key of a paragraph's take with the given voice settings.
export function takeKey(p, v = VOICE, take = VOICE.takes?.[`${p.scene}:${p.index}`] ?? 0) {
  return sha(v.model, v.voice, v.style, p.text, take);
}

async function synthesize(text, v) {
  const body = {
    model: v.model,
    input: [{
      type: "user_input",
      content: [{
        type: "text",
        text,
        annotations: [{ type: "speech_metadata", style: v.style }],
      }],
    }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: v.voice }] },
  };
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(json).slice(0, 400)}`);
      const audio = json.steps?.flatMap((s) => s.content ?? []).find((c) => c.type === "audio");
      if (!audio) throw new Error(`no audio in response: ${JSON.stringify(json).slice(0, 400)}`);
      return Buffer.from(audio.data, "base64");
    } catch (e) {
      if (attempt >= 5) throw e;
      const wait = 2000 * 2 ** attempt;
      console.error(`  retry ${attempt} in ${wait / 1000}s: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, wait));
    }
  }
}

// Runs fn over items, n at a time.
async function pool(items, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

async function main() {
  if (!KEY) throw new Error("GEMINI_API_KEY unset: source /keys/gemini_api_keys.env");
  const opt = parseArgs(process.argv.slice(2));
  const scenes = parseScript(join(REPO, "script/narration.md"));
  const paragraphs = scenes.flatMap((s) => s.paragraphs);
  const pick = (sel) => paragraphs.filter((p) => {
    const [scene, index] = sel.split(":");
    return p.scene === scene && (index === undefined || p.index === +index);
  });

  if (opt.sample) {
    const [p] = pick(opt.sample);
    const out = resolve(opt.out ?? join(REPO, "out/voices"));
    mkdirSync(out, { recursive: true });
    const voices = (opt.voices ?? VOICE.voice).split(",");
    await pool(voices, 4, async (voice) => {
      const v = { ...VOICE, voice, ...(opt.style ? { style: opt.style } : {}) };
      const wav = await synthesize(p.text, v);
      const path = join(out, `${opt.sample.replace(":", "-")}-${voice}${opt.tag ? "-" + opt.tag : ""}.wav`);
      writeFileSync(path, wav);
      console.log(path);
    });
    return;
  }

  if (opt.redo) {
    const [scene, index] = opt.redo.split(":");
    const k = `${scene}:${index}`;
    VOICE.takes = { ...VOICE.takes, [k]: (VOICE.takes?.[k] ?? 0) + 1 };
    writeFileSync(join(REPO, "pipeline/voice.json"), JSON.stringify(VOICE, null, 2) + "\n");
    console.log(`${k}: take ${VOICE.takes[k]}`);
    opt.only = k;
  }

  const dir = join(REPO, "cache/tts");
  mkdirSync(dir, { recursive: true });
  // The paragraphs and their current takes, for align.py and timeline.py.
  writeFileSync(join(REPO, "cache/paragraphs.json"), JSON.stringify(
    scenes.map((s) => ({ scene: s.id, lead: s.lead, paragraphs: s.paragraphs.map((p) => ({ ...p, key: takeKey(p) })) })), null, 1));
  const todo = (opt.only ? pick(opt.only) : paragraphs).filter((p) => !existsSync(join(dir, `${takeKey(p)}.wav`)));
  console.log(`${todo.length} paragraph(s) to synthesize`);
  await pool(todo, +(opt.jobs ?? 4), async (p) => {
    const key = takeKey(p);
    const wav = await synthesize(p.text, VOICE);
    writeFileSync(join(dir, `${key}.wav.tmp`), wav);
    renameSync(join(dir, `${key}.wav.tmp`), join(dir, `${key}.wav`));
    console.log(`${p.scene}:${p.index}  ${key}  ${(wav.length / 48000).toFixed(1)}s`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
