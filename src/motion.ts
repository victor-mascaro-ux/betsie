// The prototype's motion system, layered on top of the Figma data.
// The flow and Smart Animate layer matching stay as designed. Timings are tuned
// to feel like a shipped iOS app, and one set of curves drives every screen, so
// Betsie inside iMessage and the standalone app move the same way.
import { springEasing, type Spring } from './easing';
import type { Reaction, Rendered, SFrame, SNode, Transition } from './scene';

// Layout motion (matched layers moving / resizing): quick, barely any overshoot.
const STANDARD: Spring = [1, 520, 36];
const STANDARD_MS = 380;
// Things arriving (bubbles, banners, cards, the logo): lively, a little bounce.
const POP: Spring = [1, 420, 24];
export const POP_MS = 560;
// Cross-fades between unrelated screens.
const FADE_MS = 200;
const FADE_EASE = 'cubic-bezier(0.2, 0, 0, 1)';

export const standard = () => ({ ms: STANDARD_MS, easing: springEasing(STANDARD, STANDARD_MS) });
// Animation timing for arrivals.
export const pop = (ms = POP_MS): KeyframeAnimationOptions => ({ duration: ms, easing: springEasing(POP, ms) });

// The Complete Betsie Flow opens on the Betsie splash instead of Maxine's lock screen.
export const FLOW_START: Record<string, string> = { '307:7838': '307:3411' };

export interface Motion { kind: 'smart' | 'fade'; ms: number; easing: string }

// Every Figma transition maps onto the same small set. Figma's "Instant" becomes
// Smart Animate too, so new iMessage bubbles slide in instead of popping.
export const motionFor = (tr: Transition | null | undefined): Motion =>
  tr && tr.k !== 'SMART_ANIMATE' && tr.k !== 'INSTANT'
    ? { kind: 'fade', ms: FADE_MS, easing: FADE_EASE }
    : { kind: 'smart', ...standard() };

const splashes = new WeakMap<SFrame, boolean>();
export const isSplash = (f: SFrame) => {
  let s = splashes.get(f);
  if (s === undefined) {
    const text = (nodes: SNode[]): boolean => nodes.some((n) => (n.x && n.x.includes('Bets with your besties')) || (n.ch ? text(n.ch) : false));
    s = !!f.re?.some((r) => r.tg === 'timeout') && text(f.ch);
    splashes.set(f, s);
  }
  return s;
};

export const delayFor = (r: Reaction, frame: SFrame): number => {
  const ms = r.ms || 0;
  if (ms <= 10) return ms; // chained steps fire straight away
  if (ms <= 500) return 120; // pressed-state holds: a quick flash, like a real tap
  if (isSplash(frame)) return 1500;
  if (frame.n === 'Single Chat') return Math.max(600, Math.round(ms * 0.3)); // iMessage: messages land quickly
  return Math.round(ms * 0.6);
};

// A transform that scales / nudges a layer around its own centre, on top of its Figma transform.
export const around = (n: SNode, fn: string) => {
  const [, , w, h] = n.g;
  const base = n.m ? `matrix(${n.m.join(',')}) ` : '';
  return `${base}translate(${w / 2}px, ${h / 2}px) ${fn} translate(${-w / 2}px, ${-h / 2}px)`;
};
const REST = 'translate(0px, 0px) scale(1) rotate(0deg)';

// Arrival of a new layer: fade, rise a few points and settle with a little bounce.
export const enter = (el: HTMLElement, n: SNode, delay = 0) =>
  el.animate([
    { opacity: 0, transform: around(n, 'translate(0px, 12px) scale(0.9) rotate(0deg)') },
    { opacity: n.o ?? 1, transform: around(n, REST) },
  ], { ...pop(), delay, fill: 'both' });

// Splash screens: the clover spins in, the wordmark and tagline rise after it,
// crowns drop onto the winner.
export const intro = (r: Rendered): Animation[] => {
  if (!isSplash(r.frame)) return [];
  const anims: Animation[] = [];
  for (const e of r.map.values()) {
    if (!e.el) continue;
    const name = e.node.n || '';
    const opts = (delay: number, ms = 700): KeyframeAnimationOptions => ({ ...pop(ms), delay, fill: 'both' });
    if (/^clover/i.test(name)) {
      anims.push(e.el.animate([
        { opacity: 0, transform: around(e.node, 'translate(0px, 0px) scale(0.3) rotate(-70deg)') },
        { opacity: 1, transform: around(e.node, REST) },
      ], opts(0)));
    } else if (/^crown/i.test(name)) {
      anims.push(e.el.animate([
        { opacity: 0, transform: around(e.node, 'translate(0px, -60px) scale(1.15) rotate(-18deg)') },
        { opacity: 1, transform: around(e.node, REST) },
      ], opts(260)));
    } else if (e.parentKey && /\/Betsie Masthead#\d+$/.test(e.parentKey)) {
      const i = [...r.map.values()].filter((x) => x.parentKey === e.parentKey).indexOf(e);
      anims.push(e.el.animate([
        { opacity: 0, transform: around(e.node, 'translate(0px, 16px) scale(1) rotate(0deg)') },
        { opacity: e.node.o ?? 1, transform: around(e.node, REST) },
      ], opts(140 + i * 110, 620)));
    }
  }
  return anims;
};

// Ambient life while a screen is shown: the countdown's colon ticks like a live timer.
export const ambient = (r: Rendered) => {
  for (const e of r.map.values()) {
    if (e.el && e.node.t === 'x' && e.node.n === ':') {
      e.el.animate([{ opacity: e.node.o ?? 1 }, { opacity: 0.15 }], { duration: 500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    }
  }
};

// Press feedback for every hotspot: shrink a touch and dim while held, spring back on release.
export const press = (el: HTMLElement, n: SNode, frame: SFrame) => {
  const [, , w, h] = n.g;
  if ((w * h) / (frame.w * frame.h) > 0.3) return; // big areas (keyboards, whole cards) don't squish
  const s = Math.min(0.98, Math.max(0.92, 1 - 8 / Math.max(w, h)));
  const rest = { transform: around(n, REST), opacity: n.o ?? 1 };
  const held = { transform: around(n, `translate(0px, 0px) scale(${s}) rotate(0deg)`), opacity: (n.o ?? 1) * 0.82 };
  const down = el.animate([rest, held], { duration: 90, easing: 'ease-out', fill: 'forwards' });
  const release = () => {
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
    const up = el.animate([held, rest], { ...pop(420), fill: 'forwards' });
    up.finished.then(() => { down.cancel(); up.cancel(); }, () => undefined);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
};
