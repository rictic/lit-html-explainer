#!/usr/bin/env node
// Captures truth/truth.json: runs truth/page.js (the video's example
// templates) against the real lit-html in headless Chromium and saves what
// lit-html did. Run inside `nix develop` (needs $LIT_HTML, $LIT_VENDOR and
// chromium).
//
//   node tools/truth.mjs                   truth/page.js     -> truth/truth.json    (episode 1)
//   node tools/truth.mjs --page platform   truth/platform.js -> truth/platform.json (episode 2)

import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIT = process.env.LIT_HTML;
if (!LIT) {
  console.error("LIT_HTML unset: run inside `nix develop`");
  process.exit(1);
}

const pageName = process.argv.includes("--page") ? process.argv[process.argv.indexOf("--page") + 1] : "page";
// Bare specifiers for Lit's development builds; "lit-html" is the same
// module the pages import directly.
const IMPORTS = {
  "lit-html": "/lit-html/development/lit-html.js",
  "lit-html/": "/lit-html/development/",
  "@lit/reactive-element": "/vendor/reactive-element/development/reactive-element.js",
  "@lit/reactive-element/": "/vendor/reactive-element/development/",
};
const PAGE = `<!doctype html><meta charset="utf-8"><title>truth</title>
<script type="importmap">${JSON.stringify({ imports: IMPORTS })}</script>
<script>addEventListener("error", (e) => fetch("/fail", { method: "POST", body: e.message }));
addEventListener("unhandledrejection", (e) => fetch("/fail", { method: "POST", body: String(e.reason?.stack ?? e.reason) }));</script>
<script type="module" src="/truth/${pageName}.js"></script>`;

let finish;
const done = new Promise((ok) => (finish = ok));

const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (req.method === "POST") {
    const parts = [];
    req.on("data", (b) => parts.push(b));
    req.on("end", () => {
      res.writeHead(200).end("ok");
      finish({ ok: p === "/truth", body: Buffer.concat(parts).toString() });
    });
    return;
  }
  const file = p === "/" ? null : p.startsWith("/lit-html/") ? join(LIT, p.slice(10))
    : p.startsWith("/vendor/") ? join(process.env.LIT_VENDOR ?? "", p.slice(8)) : join(REPO, p);
  if (file === null) return res.writeHead(200, { "content-type": "text/html" }).end(PAGE);
  if (!existsSync(file) || !statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": extname(file) === ".js" ? "text/javascript" : "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));

const profile = mkdtempSync(join(tmpdir(), "lit-truth-"));
const browser = spawn("chromium", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${profile}`, `http://127.0.0.1:${server.address().port}/`,
], { stdio: "ignore" });
const timer = setTimeout(() => finish({ ok: false, body: "timed out" }), 60_000);

const { ok, body } = await done;
clearTimeout(timer);
server.close();
// Remove the profile once Chromium has exited (it keeps writing until then).
browser.on("exit", () => rmSync(profile, { recursive: true, force: true }));
browser.kill();
if (!ok) {
  console.error(`page failed: ${body}`);
  process.exit(1);
}
const out = join(REPO, pageName === "page" ? "truth/truth.json" : `truth/${pageName}.json`);
writeFileSync(out, body + "\n");
console.log(out);
