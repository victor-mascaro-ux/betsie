// Figma's easing presets as CSS easing strings. Springs are sampled into a
// linear() curve over the duration Figma reports for them.
import type { Transition } from './scene';

const BEZIER: Record<string, string> = {
  LINEAR: 'linear',
  EASE_IN: 'cubic-bezier(0.42, 0, 1, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.58, 1)',
  EASE_IN_AND_OUT: 'cubic-bezier(0.42, 0, 0.58, 1)',
  EASE_IN_BACK: 'cubic-bezier(0.3, -0.05, 0.7, -0.5)',
  EASE_OUT_BACK: 'cubic-bezier(0.45, 1.45, 0.8, 1)',
  EASE_IN_AND_OUT_BACK: 'cubic-bezier(0.7, -0.4, 0.4, 1.4)',
};

// mass, stiffness, damping
const SPRINGS: Record<string, [number, number, number]> = {
  GENTLE: [1, 100, 15],
  QUICK: [1, 300, 20],
  BOUNCY: [1, 600, 15],
  SLOW: [1, 80, 20],
};

const springCurve = ([m, k, c]: [number, number, number], seconds: number) => {
  const steps = 64;
  const dt = 1 / 2000;
  let x = 0, v = 0, t = 0;
  const out: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const target = (seconds * i) / steps;
    while (t < target) { const a = (-k * (x - 1) - c * v) / m; v += a * dt; x += v * dt; t += dt; }
    out.push((i === steps ? 1 : x).toFixed(4));
  }
  return `linear(${out.join(', ')})`;
};

const memo = new Map<string, string>();

export const easingOf = (tr: Transition): string => {
  if (tr.bz) return `cubic-bezier(${tr.bz.x1}, ${tr.bz.y1}, ${tr.bz.x2}, ${tr.bz.y2})`;
  const spring = SPRINGS[tr.e];
  if (!spring) return BEZIER[tr.e] || 'ease-out';
  const id = `${tr.e}:${tr.ms}`;
  let curve = memo.get(id);
  if (!curve) {
    curve = CSS.supports('transition-timing-function', 'linear(0, 1)') ? springCurve(spring, tr.ms / 1000) : 'cubic-bezier(0.2, 0.9, 0.3, 1)';
    memo.set(id, curve);
  }
  return curve;
};
