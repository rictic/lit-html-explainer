// Frame renderer: background, the active scene (crossfading between scenes
// that ask for it), the HUD, and a vignette.
//
// Scenes draw in a fixed 1920x1080 logical space. Each scene module
// (scenes/<id>.js) exports draw(F, S); see docs/STYLE.md for the contract.

import { SCENES } from "./scenes/index.js";
import { drawPlaceholder } from "./scenes/placeholder.js";
import { scene, timeline } from "./timing.js";
import { drawHud } from "./kit/hud.js";
import { C } from "./kit/theme.js";
import { clamp } from "./util.js";

export const W = 1920, H = 1080;

function canvas2d(w, h, opts) {
  const c = new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  return c.getContext("2d", opts);
}

export class Renderer {
  // readback: frames will be read with pixels() (capture mode); keeps the
  // canvas in CPU memory. Live playback leaves it GPU-backed.
  constructor(canvas, scale = 1, { readback = false } = {}) {
    this.s = scale;
    this.w = Math.round(W * scale);
    this.h = Math.round(H * scale);
    canvas.width = this.w;
    canvas.height = this.h;
    this.ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: readback });
    this.layers = [canvas2d(this.w, this.h, { alpha: false }), canvas2d(this.w, this.h, { alpha: false })];
    this.bg = this.makeBackground();
  }

  makeBackground() {
    const g = canvas2d(this.w, this.h, { alpha: false });
    g.setTransform(this.s, 0, 0, this.s, 0, 0);
    const grad = g.createRadialGradient(W * 0.5, H * 0.42, 80, W * 0.5, H * 0.5, W * 0.75);
    grad.addColorStop(0, C.bg2);
    grad.addColorStop(1, C.bg);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // a faint dot grid
    g.fillStyle = C.grid;
    for (let y = 30; y < H; y += 40) for (let x = 30; x < W; x += 40) g.fillRect(x - 1, y - 1, 2, 2);
    return g.canvas;
  }

  // Draws scene `id` at time t onto ctx (background included).
  drawScene(ctx, id, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(this.s, 0, 0, this.s, 0, 0);
    const S = scene(id);
    const F = { t, ctx, W, H, s: this.s, S };
    ctx.save();
    const mod = SCENES[id];
    if (mod?.draw) mod.draw(F, S);
    else drawPlaceholder(F, S);
    ctx.restore();
  }

  draw(t) {
    const T = timeline();
    const ctx = this.ctx;
    const cur = T.sceneAt(t);
    // Crossfade into scenes that ask for it (the default), centred on the cut.
    const fadeOf = (s) => (SCENES[s.id]?.transition ?? "fade") === "fade" ? (SCENES[s.id]?.fadeDur ?? 0.6) : 0;
    let a = cur, b = null, u = 0;
    if (cur.next && fadeOf(cur.next) > 0 && t > cur.end - fadeOf(cur.next) / 2) {
      b = cur.next;
      u = clamp((t - (cur.end - fadeOf(cur.next) / 2)) / fadeOf(cur.next));
    } else if (cur.prev && fadeOf(cur) > 0 && t < cur.start + fadeOf(cur) / 2) {
      a = cur.prev;
      b = cur;
      u = clamp((t - (cur.start - fadeOf(cur) / 2)) / fadeOf(cur));
    }
    if (b && u > 0 && u < 1) {
      const [la, lb] = this.layers;
      this.drawScene(la, a.id, t);
      this.drawScene(lb, b.id, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(la.canvas, 0, 0);
      ctx.globalAlpha = u * u * (3 - 2 * u);
      ctx.drawImage(lb.canvas, 0, 0);
      ctx.globalAlpha = 1;
    } else {
      this.drawScene(ctx, (b && u >= 1 ? b : a).id, t);
    }
    ctx.setTransform(this.s, 0, 0, this.s, 0, 0);
    drawHud({ t, ctx, W, H, s: this.s });
    this.vignette(ctx);
  }

  vignette(ctx) {
    this.vig ??= (() => {
      const g = canvas2d(this.w, this.h);
      g.setTransform(this.s, 0, 0, this.s, 0, 0);
      const grad = g.createRadialGradient(W / 2, H / 2, H * 0.62, W / 2, H / 2, W * 0.75);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.22)");
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      return g.canvas;
    })();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.vig, 0, 0);
  }

  // The time and scene, top left (contact sheets).
  stamp(t) {
    const ctx = this.ctx;
    ctx.setTransform(this.s, 0, 0, this.s, 0, 0);
    const label = `${t.toFixed(1)}s ${timeline().sceneAt(t).id}`;
    ctx.font = '600 44px "JetBrains Mono"';
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, ctx.measureText(label).width + 32, 64);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 16, 34);
  }

  pixels() {
    return this.ctx.getImageData(0, 0, this.w, this.h).data;
  }
}
