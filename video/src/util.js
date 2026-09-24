// Math and easing. Every frame is a pure function of time, so animation is
// written as "how far through [a, b] is t", never as state carried between frames.

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, u) => a + (b - a) * u;
export const invlerp = (a, b, x) => (a === b ? (x < a ? 0 : 1) : clamp((x - a) / (b - a)));
export const remap = (x, a, b, c, d) => lerp(c, d, invlerp(a, b, x));
export const TAU = Math.PI * 2;

export const ease = {
  linear: (u) => u,
  inQuad: (u) => u * u,
  outQuad: (u) => 1 - (1 - u) * (1 - u),
  inOutQuad: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  inCubic: (u) => u * u * u,
  outCubic: (u) => 1 - (1 - u) ** 3,
  inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  outQuart: (u) => 1 - (1 - u) ** 4,
  inOutQuart: (u) => (u < 0.5 ? 8 * u ** 4 : 1 - (-2 * u + 2) ** 4 / 2),
  outExpo: (u) => (u >= 1 ? 1 : 1 - 2 ** (-10 * u)),
  inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  // exact at the ends, so `x > 0` still means "has started"
  outBack: (u, s = 1.70158) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2),
};

// Progress of t through [a, a + dur], eased and clamped to [0, 1].
export const prog = (t, a, dur = 0.5, f = ease.inOutCubic) => f(invlerp(a, a + dur, t));

// 0 -> 1 when t passes `a` (over `inDur`), then 1 -> 0 when t passes `b` (over `outDur`).
export function window(t, a, b, inDur = 0.35, outDur = 0.35) {
  return Math.min(prog(t, a, inDur, ease.outCubic), 1 - prog(t, b, outDur, ease.inCubic));
}

// A short bump: 0 before `a`, up to 1 and back to 0 over `dur`.
export function pulse(t, a, dur = 0.6) {
  const u = invlerp(a, a + dur, t);
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2;
}

// Interpolate points / rects / numbers alike.
export function mix(a, b, u) {
  if (typeof a === "number") return lerp(a, b, u);
  const out = {};
  for (const k in a) out[k] = typeof a[k] === "number" && typeof b[k] === "number" ? lerp(a[k], b[k], u) : u < 0.5 ? a[k] : b[k];
  return out;
}

// Integer hash -> [0, 1). Deterministic, so every frame can be drawn in isolation.
export function hash(...xs) {
  let h = 0x9e3779b1 | 0;
  for (const x of xs) {
    let k = Math.imul((x * 1000003) | 0, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    h ^= Math.imul(k, 0x1b873593);
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
