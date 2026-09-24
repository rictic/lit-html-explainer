#!/usr/bin/env node
// Asks a Gemini model to listen to narration takes and report problems:
// words that differ from the script, mispronounced terms, glitches, odd
// pacing or emphasis. A second pair of ears, since this pipeline has none.
//
//   node pipeline/critique.mjs --files a.wav,b.wav --text "the script text"
//   node pipeline/critique.mjs                 every cached paragraph take
//   node pipeline/critique.mjs --only markers  one scene (or scene:index)
//
// Writes cache/critique/<take>.json and prints a summary.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseScript } from "./script.mjs";
import { takeKey } from "./tts.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.8-flash";

const SCHEMA = {
  type: "object",
  properties: {
    transcript: { type: "string", description: "verbatim transcript of what is actually said" },
    differences: { type: "array", items: { type: "string" }, description: "every word or phrase that differs from the script: skipped, added, or changed" },
    pronunciation: { type: "array", items: { type: "string" }, description: "every mispronounced or oddly pronounced word, especially technical terms" },
    glitches: { type: "array", items: { type: "string" }, description: "audio artifacts: clicks, distortion, breaths cut off, sudden volume or tone changes, with timestamps" },
    delivery: { type: "string", description: "one or two sentences on pacing, emphasis and tone for an explainer video" },
    naturalness: { type: "integer", description: "1-10" },
    clarity: { type: "integer", description: "1-10" },
    fit: { type: "integer", description: "1-10: how well this suits a calm, precise programming explainer" },
  },
  required: ["transcript", "differences", "pronunciation", "glitches", "delivery", "naturalness", "clarity", "fit"],
};

export async function critique(wavPath, script) {
  const prompt = `You are reviewing a narration take for a programming explainer video about the lit-html JavaScript library.
The narrator was asked to read this script exactly:

"""${script}"""

Listen carefully. Terms that must be said correctly: "lit-html" (said "lit H-T-M-L"), "HTML" (letters), "DOM" (said "dom", one syllable), "innerHTML" as "inner H-T-M-L". Report every deviation from the script, every mispronunciation, and any audio glitch. Be strict and specific.`;
  const body = {
    contents: [{ role: "user", parts: [
      { inline_data: { mime_type: "audio/wav", data: readFileSync(wavPath).toString("base64") } },
      { text: prompt },
    ] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2 },
  };
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(json).slice(0, 300)}`);
      return JSON.parse(json.candidates[0].content.parts.map((p) => p.text ?? "").join(""));
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((ok) => setTimeout(ok, 2000 * 2 ** attempt));
    }
  }
}

function summary(name, c) {
  const issues = [...c.differences.map((d) => `diff: ${d}`), ...c.pronunciation.map((d) => `pron: ${d}`), ...c.glitches.map((d) => `glitch: ${d}`)];
  return `${name}  nat ${c.naturalness} clar ${c.clarity} fit ${c.fit}\n    ${c.delivery}${issues.map((i) => "\n    - " + i).join("")}`;
}

async function main() {
  if (!KEY) throw new Error("GEMINI_API_KEY unset: source /keys/gemini_api_keys.env");
  const opt = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];

  if (opt.files) {
    await Promise.all(opt.files.split(",").map(async (f) => {
      const c = await critique(f, opt.text);
      writeFileSync(f.replace(/\.wav$/, ".critique.json"), JSON.stringify(c, null, 2));
      console.log(summary(basename(f), c));
    }));
    return;
  }

  const dir = join(REPO, "cache/critique");
  mkdirSync(dir, { recursive: true });
  const paragraphs = parseScript(join(REPO, "script/narration.md")).flatMap((s) => s.paragraphs)
    .filter((p) => !opt.only || `${p.scene}:${p.index}`.startsWith(opt.only));
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < paragraphs.length) {
      const p = paragraphs[next++];
      const key = takeKey(p);
      const wav = join(REPO, "cache/tts", `${key}.wav`);
      const out = join(dir, `${key}.json`);
      if (!existsSync(wav)) continue;
      const c = existsSync(out) && !opt.force ? JSON.parse(readFileSync(out, "utf8")) : await critique(wav, p.text);
      writeFileSync(out, JSON.stringify(c, null, 2));
      console.log(summary(`${p.scene}:${p.index}`, c));
    }
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
