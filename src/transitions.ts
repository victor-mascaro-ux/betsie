// Frame-to-frame transitions: Smart Animate and Dissolve, as Figma plays them.
import { enter } from './motion';
import type { Entry, Rendered, SNode } from './scene';

export interface Running {
  done: Promise<void>;
  finish(): void;
}

type KF = Record<string, string | number>;

const geomKF = (n: SNode): KF => ({
  left: `${n.g[0]}px`,
  top: `${n.g[1]}px`,
  width: `${n.g[2]}px`,
  height: `${n.g[3]}px`,
  transform: n.m ? `matrix(${n.m.join(',')})` : 'none',
});

// Keep only the properties that actually change.
const diffKF = (from: KF, to: KF): [KF, KF] | null => {
  const a: KF = {}, b: KF = {};
  for (const k of Object.keys(to)) if (from[k] !== to[k]) { a[k] = from[k]; b[k] = to[k]; }
  return Object.keys(a).length ? [a, b] : null;
};

const sameList = (a?: string[], b?: string[]) => (a || []).join('|') === (b || []).join('|');
const paintDiffers = (a: SNode, b: SNode) =>
  a.t !== b.t || a.src !== b.src || a.x !== b.x || (a.s || '') !== (b.s || '') || !sameList(a.fl, b.fl) || (a.k || '') !== (b.k || '');

const run = (anims: Animation[], cleanup: () => void, ms: number): Running => {
  let finished = false;
  let resolve!: () => void;
  const done = new Promise<void>((r) => { resolve = r; });
  const end = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    for (const a of anims) a.cancel();
    cleanup();
    resolve();
  };
  // Ends with the animations themselves; the timer only covers throttled tabs.
  Promise.all(anims.map((a) => a.finished)).then(end, () => undefined);
  const timer = window.setTimeout(end, anims.length ? ms * 4 + 1000 : 0);
  return { done, finish: end };
};

export const dissolve = (stage: HTMLElement, A: Rendered, B: Rendered, ms: number, easing: string): Running => {
  stage.append(B.root);
  const anim = B.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing, fill: 'both' });
  return run([anim], () => A.root.remove(), ms);
};

export const smartAnimate = (stage: HTMLElement, A: Rendered, B: Rendered, ms: number, easing: string): Running => {
  const opts: KeyframeAnimationOptions = { duration: ms, easing, fill: 'both' };
  const anims: Animation[] = [];
  const moved: HTMLElement[] = [];
  const animate = (el: HTMLElement, from: KF, to: KF) => {
    const kf = diffKF(from, to);
    if (kf) anims.push(el.animate(kf, opts));
  };
  const op = (n: SNode) => n.o ?? 1;
  const visibleIn = (r: Rendered, key: string | null) => key !== null && !!r.map.get(key)?.el;

  stage.append(B.root);

  // Background of the frame itself: colour interpolates, image/gradient paint cross-fades.
  const bgA = A.frame.bg || 'transparent', bgB = B.frame.bg || 'transparent';
  if (bgA !== bgB) animate(B.root, { backgroundColor: bgA }, { backgroundColor: bgB });
  if (A.frame.s !== B.frame.s) {
    const paintA = A.root.querySelector<HTMLElement>(':scope > .paint');
    const paintB = B.root.querySelector<HTMLElement>(':scope > .paint');
    if (paintB) animate(paintB, { opacity: 0 }, { opacity: 1 });
    if (paintA) { B.root.prepend(paintA); moved.push(paintA); animate(paintA, { opacity: 1 }, { opacity: 0 }); }
  }

  // Matched layers interpolate; layers that only exist in B arrive: small ones
  // (bubbles, banners, buttons) pop in, large ones fade.
  const small = (n: SNode) => (n.g[2] * n.g[3]) / (B.frame.w * B.frame.h) < 0.4;
  const arrive = (el: HTMLElement, n: SNode) => {
    if (small(n)) anims.push(enter(el, n));
    else animate(el, { opacity: 0 }, { opacity: op(n) });
  };
  for (const [key, b] of B.map) {
    if (!key || !b.el) continue;
    const a = A.map.get(key);
    if (!a) {
      if (b.parentKey === '' || (b.parentKey !== null && visibleIn(A, b.parentKey))) arrive(b.el, b.node);
      continue;
    }
    if (!a.el && small(b.node)) { arrive(b.el, b.node); continue; }
    const from: KF = { ...geomKF(a.node), opacity: a.el ? op(a.node) : 0 };
    const to: KF = { ...geomKF(b.node), opacity: op(b.node) };
    const leaf = !a.node.ch?.length && !b.node.ch?.length;
    if (a.el && leaf && paintDiffers(a.node, b.node)) {
      // Content changed (text, image, paint): cross-fade the two versions in motion.
      b.el.parentElement!.insertBefore(a.el, b.el);
      moved.push(a.el);
      animate(a.el, from, { ...to, opacity: 0 });
      animate(b.el, { ...from, opacity: 0 }, to);
      continue;
    }
    if (a.node.bg && b.node.bg && a.node.bg !== b.node.bg) { from.backgroundColor = a.node.bg; to.backgroundColor = b.node.bg; }
    if ((a.node.r || '0px') !== (b.node.r || '0px') && !/%/.test((a.node.r || '') + (b.node.r || ''))) {
      from.borderRadius = a.node.r || '0px'; to.borderRadius = b.node.r || '0px';
    }
    animate(b.el, from, to);
  }

  // Layers that leave: move A's element into the matching B parent and fade it out.
  const entries = [...A.map.entries()];
  for (const [key, a] of entries) {
    if (!key || !a.el || visibleIn(B, key)) continue;
    const parent = a.parentKey !== null ? B.map.get(a.parentKey) : undefined;
    if (!parent || !parent.el) continue; // an ancestor already fades
    const box = parent.box || parent.el;
    // Keep A's stacking order: insert before the next sibling that survives.
    const siblings = entries.filter(([, e]) => e.parentKey === a.parentKey).map(([k]) => k);
    let before: Element | null = null;
    for (let i = siblings.indexOf(key) + 1; i < siblings.length; i++) {
      const s = B.map.get(siblings[i]);
      if (s?.el && s.el.parentElement === box) { before = s.el; break; }
    }
    if (!before) before = [...box.children].find((c) => c.classList.contains('st')) || null;
    box.insertBefore(a.el, before);
    moved.push(a.el);
    animate(a.el, { opacity: op(a.node) }, { opacity: 0 });
  }

  A.root.remove();
  return run(anims, () => { for (const el of moved) el.remove(); }, ms);
};

export type { Entry };
