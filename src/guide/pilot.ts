// "Show me": drives a phone the way a person would. A touch indicator moves to
// each target and taps it; text is typed one key at a time while the matching
// key lights up on the keyboard. Everything goes through the real UI.
import type { PersonId } from '../data/types';
import { getUi } from '../lib/ui';
import { getTour, setTour } from './tour';

export type Target = string | (() => HTMLElement | null | undefined);
interface Opts { text?: string; last?: boolean; nth?: number }

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const phoneEl = (me: PersonId) => document.querySelector<HTMLElement>(`.phone[data-me="${me}"]`);
const visible = (el: Element) => (el as HTMLElement).getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

export const find = (me: PersonId, t: Target, o: Opts = {}): HTMLElement | null => {
  if (typeof t === 'function') return t() || null;
  const root = phoneEl(me);
  if (!root) return null;
  let list = [...root.querySelectorAll<HTMLElement>(t)].filter(visible);
  if (o.text) list = list.filter((e) => e.textContent?.trim().toUpperCase().includes(o.text!.toUpperCase()));
  if (o.nth !== undefined) return list[o.nth] || null;
  return (o.last ? list[list.length - 1] : list[0]) || null;
};

export async function waitFor<T>(fn: () => T | null | undefined | false, ms = 6000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v as T;
    if (Date.now() > end) throw new Error('timeout');
    await sleep(60);
  }
}

/** Make sure the phone is on screen (one-phone view flips to it). */
export const show = async (me: PersonId) => {
  if (getTour().focus !== me) { setTour({ focus: me }); await sleep(380); }
};

const finger = (me: PersonId) => phoneEl(me)?.querySelector<HTMLElement>('.finger') || null;

async function moveTo(me: PersonId, el: HTMLElement) {
  const root = phoneEl(me)!, f = finger(me)!;
  const rr = root.getBoundingClientRect(), r = el.getBoundingClientRect();
  const k = rr.width / 430;
  const x = (r.left + Math.min(r.width, 300) / 2 - rr.left) / k;
  const y = (r.top + Math.min(r.height, 120) / 2 - rr.top) / k;
  f.style.setProperty('--x', `${x}px`);
  f.style.setProperty('--y', `${y}px`);
  if (!f.classList.contains('on')) { f.classList.add('jump'); f.getBoundingClientRect(); f.classList.remove('jump'); f.classList.add('on'); await sleep(240); }
  else await sleep(430);
}

export const hideFingers = () => document.querySelectorAll('.phone .finger').forEach((f) => f.classList.remove('on', 'press'));

/** Scrolls the nearest scrolling area (never the phone itself) so the target is in view. */
async function reveal(me: PersonId, el: HTMLElement) {
  const root = phoneEl(me)!;
  const rr = root.getBoundingClientRect(), r = el.getBoundingClientRect();
  const k = rr.width / 430;
  const kb = root.classList.contains('kb') ? 336 * k : 0;
  const top = rr.top + 110 * k, bottom = rr.bottom - Math.max(kb, 100 * k);
  if (r.top >= top && r.bottom <= bottom) return;
  let box = el.parentElement;
  while (box && box !== root && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
  if (!box || box === root) return;
  const dy = r.top < top ? r.top - top - 20 * k : r.bottom - bottom + 20 * k;
  box.scrollBy({ top: dy / k, behavior: 'smooth' });
  await sleep(400);
}

export async function tap(me: PersonId, t: Target, o: Opts = {}) {
  await show(me);
  const el = await waitFor(() => find(me, t, o));
  await reveal(me, el);
  await moveTo(me, el);
  const f = finger(me)!;
  f.classList.add('press');
  await sleep(110);
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== el && /INPUT|TEXTAREA/.test(active.tagName) && !el.closest('.ios-kb')) active.blur();
  if (/INPUT|TEXTAREA/.test(el.tagName)) el.focus();
  el.click();
  await sleep(150);
  f.classList.remove('press');
  await sleep(120);
  return el;
}

/** Tap a text box, then type into it key by key. */
export async function type(me: PersonId, t: Target, text: string, o: Opts = {}) {
  const el = (await tap(me, t, o)) as HTMLInputElement;
  el.focus();
  await sleep(420); // keyboard slides up
  const root = phoneEl(me)!;
  for (const ch of text) {
    root.dispatchEvent(new CustomEvent('betsie-keyflash', { detail: ch }));
    document.execCommand('insertText', false, ch);
    await sleep(ch === ' ' ? 55 : 24 + Math.random() * 30);
  }
  await sleep(250);
  return el;
}

// ---------- getting a phone to the right place ----------
export async function unlocked(me: PersonId) {
  if (getUi()[me]?.locked !== false) { await tap(me, '.lock'); await sleep(450); }
}

export async function inApp(me: PersonId, app: 'betsie' | 'messages') {
  await unlocked(me);
  if (getUi()[me]?.app === app) return;
  if (getUi()[me]?.app) { await tap(me, '.home-indicator'); await sleep(420); }
  await tap(me, `.app-icon-btn[aria-label="${app === 'betsie' ? 'Betsie' : 'Messages'}"]`);
  await sleep(500);
  if (app === 'betsie') await skipSplash(me);
}

export async function skipSplash(me: PersonId) {
  if (find(me, '.splash')) { await sleep(500); if (find(me, '.splash')) await tap(me, '.splash'); }
  await waitFor(() => !find(me, '.splash'), 3000).catch(() => undefined);
}

export async function inThread(me: PersonId, thread: string) {
  await inApp(me, 'messages');
  if (getUi()[me]?.thread === thread) return;
  if (getUi()[me]?.thread) { await tap(me, '.th-back'); await sleep(350); }
  await tap(me, `.tl-row[data-thread="${thread}"]`);
  await sleep(450);
}

/** Opens a bet in Betsie: through the app's own deep link (as a notification would). */
export async function atBet(me: PersonId, betId: string) {
  await unlocked(me);
  const ui = getUi()[me];
  ui?.api?.open('betsie', { bet: betId });
  await sleep(500);
  await skipSplash(me);
  await sleep(250);
}
