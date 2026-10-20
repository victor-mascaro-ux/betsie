// Plays the prototype: navigation, triggers (click, after delay, drag),
// transitions, history and prefetching.
import { ambient, delayFor, intro, isSplash, motionFor, press } from './motion';
import { loadFrame, preloadAssets, renderFrame, type Reaction, type Rendered, type SFrame, type Transition } from './scene';
import { dissolve, smartAnimate, type Running } from './transitions';

const outgoing = (f: SFrame) => {
  const ids = new Set<string>();
  const walk = (re?: Reaction[]) => re?.forEach((r) => r.d && ids.add(r.d));
  walk(f.re);
  const visit = (nodes: SFrame['ch']) => nodes.forEach((n) => { walk(n.re); if (n.ch) visit(n.ch); });
  visit(f.ch);
  return [...ids];
};

const withTimeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);

export class Player {
  cur: Rendered | null = null;
  private history: string[] = [];
  private timers: number[] = [];
  private running: Running | null = null;
  private token = 0;
  private suppressClick = false;

  constructor(private stage: HTMLElement, private hints: HTMLElement, private onFrame: (id: string) => void) {
    stage.addEventListener('click', (e) => this.click(e));
    stage.addEventListener('pointerdown', (e) => this.pointerDown(e));
  }

  get scale() { return this.stage.getBoundingClientRect().width / (this.cur?.frame.w || 1); }

  async start(id: string) {
    this.history = [];
    await this.show(id, null, false);
  }

  async navigate(id: string, tr: Transition | null | undefined) {
    if (this.cur) this.history.push(this.cur.frame.id);
    await this.show(id, tr || null, true);
  }

  async back() {
    const prev = this.history.pop();
    if (prev) await this.show(prev, { k: 'DISSOLVE', ms: 200, e: 'EASE_OUT' }, true);
  }

  private async show(id: string, tr: Transition | null, animated: boolean) {
    const my = ++this.token;
    this.clearTimers();
    this.running?.finish();
    this.running = null;
    const frame = await loadFrame(id);
    await withTimeout(preloadAssets(frame.ch), 1500);
    if (my !== this.token) return;

    const A = this.cur;
    const B = renderFrame(frame);
    this.cur = B;
    this.onFrame(id);

    if (!A || !animated) {
      this.stage.replaceChildren(B.root);
      intro(B);
      ambient(B);
    } else {
      const m = motionFor(tr);
      this.running = m.kind === 'smart'
        ? smartAnimate(this.stage, A, B, m.ms, m.easing)
        : dissolve(this.stage, A, B, m.ms, m.easing);
      intro(B);
      ambient(B);
      await this.running.done;
      if (my !== this.token) return;
      this.running = null;
    }
    this.arm(frame);
    this.prefetch(frame);
  }

  // "After delay" can sit on the frame or on any visible layer inside it.
  private arm(frame: SFrame) {
    if ((window as unknown as { __holdTimers?: boolean }).__holdTimers) return; // debugging / visual tests
    const timeouts: Reaction[] = [];
    const take = (re?: Reaction[]) => re?.forEach((r) => r.tg === 'timeout' && timeouts.push(r));
    const visit = (nodes: SFrame['ch']) => nodes.forEach((n) => { if (n.h) return; take(n.re); if (n.ch) visit(n.ch); });
    take(frame.re);
    visit(frame.ch);
    for (const r of timeouts) this.timers.push(window.setTimeout(() => this.act(r), delayFor(r, frame)));
  }

  private clearTimers() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  private prefetch(frame: SFrame) {
    for (const id of outgoing(frame)) loadFrame(id).then((f) => preloadAssets(f.ch)).catch(() => undefined);
  }

  act(r: Reaction) {
    if (r.back) { this.back(); return; }
    if (!r.d) return;
    if (r.nav === 'SCROLL_TO') return;
    this.navigate(r.d, r.tr);
  }

  // As in Figma, the topmost hotspot under the pointer wins; layers without
  // interactions (labels, placeholders, icons) never block the hotspot below.
  private find(e: MouseEvent, tg: Reaction['tg']) {
    if (!this.cur) return null;
    for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
      if (!this.stage.contains(el)) continue;
      const r = this.cur.reactions.get(el)?.find((x) => x.tg === tg);
      if (r) return { el, r };
    }
    return null;
  }

  private click(e: MouseEvent) {
    if (this.suppressClick) { this.suppressClick = false; return; }
    const hit = this.find(e, 'click');
    if (hit) { this.act(hit.r); return; }
    // Sheet grabbers dismiss on a drag, as designed; a tap works too, for mouse users.
    const grab = this.find(e, 'drag');
    if (grab) { this.act(grab.r); return; }
    // Splash screens skip ahead on a tap, like a real app's launch screen.
    const skip = this.cur && isSplash(this.cur.frame) && this.cur.frame.re?.find((r) => r.tg === 'timeout');
    if (skip) this.act(skip);
    else this.flashHotspots();
  }

  private pointerDown(e: PointerEvent) {
    const tap = this.find(e, 'click');
    if (tap && this.cur && tap.el !== this.cur.root) {
      const n = this.cur.nodes.get(tap.el);
      if (n) press(tap.el as HTMLElement, n, this.cur.frame);
    }
    const drag = this.find(e, 'drag');
    const scroller = (e.target as Element).closest('.sc-x, .sc-y, .sc-xy') as HTMLElement | null;
    if (!drag && !(scroller && e.pointerType === 'mouse')) return;
    const x0 = e.clientX, y0 = e.clientY;
    const left0 = scroller?.scrollLeft || 0, top0 = scroller?.scrollTop || 0;
    let fired = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      const dist = Math.hypot(dx, dy);
      if (drag && !fired && dist > 8) { fired = true; this.suppressClick = true; this.act(drag.r); return; }
      if (!drag && scroller) {
        if (dist > 4) this.suppressClick = true;
        const k = this.scale || 1;
        scroller.scrollLeft = left0 - dx / k;
        scroller.scrollTop = top0 - dy / k;
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setTimeout(() => { this.suppressClick = false; }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // Clicking outside every hotspot flashes them, like Figma's prototype viewer.
  flashHotspots() {
    if (!this.cur) return;
    const base = this.stage.getBoundingClientRect();
    const k = this.scale || 1;
    this.hints.replaceChildren();
    for (const el of this.cur.root.querySelectorAll('.hs')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const d = document.createElement('div');
      d.className = 'hint';
      d.style.cssText = `left:${(r.left - base.left) / k}px;top:${(r.top - base.top) / k}px;width:${r.width / k}px;height:${r.height / k}px`;
      this.hints.append(d);
    }
    if (this.cur.frame.re?.some((r) => r.tg === 'click')) {
      const d = document.createElement('div');
      d.className = 'hint';
      d.style.cssText = 'inset:0';
      this.hints.append(d);
    }
  }
}
