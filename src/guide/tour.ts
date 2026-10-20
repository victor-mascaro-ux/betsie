// Guided tour state: which task you're on, which phone to look at, and the
// desktop layout (both phones, or one phone like on a real device).
import { useSyncExternalStore } from 'react';
import type { PersonId } from '../data/types';

export interface Tour {
  step: number;
  startedAt: number;
  storyPosted: boolean;
  /** "Show me" is driving the phones. */
  running: boolean;
  /** The phone the current task is on (one-phone view switches to it). */
  focus: PersonId;
  view: 'two' | 'one';
}

const KEY = 'betsie-tour-v1';
const fresh = (view: Tour['view'] = 'two'): Tour => ({ step: 0, startedAt: Date.now(), storyPosted: false, running: false, focus: 'maxine', view });

let tour: Tour = (() => {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (t && typeof t.step === 'number') return { ...fresh(), ...t, running: false };
  } catch { /* ignore */ }
  return fresh();
})();

const listeners = new Set<() => void>();
export const getTour = () => tour;
export const setTour = (patch: Partial<Tour>) => {
  tour = { ...tour, ...patch };
  const { running: _r, ...keep } = tour;
  try { localStorage.setItem(KEY, JSON.stringify(keep)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
};
export const restartTour = () => setTour({ ...fresh(tour.view) });
export const useTour = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => tour);
