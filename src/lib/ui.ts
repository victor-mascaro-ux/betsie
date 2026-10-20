// What each phone is showing right now, so the guided tour can tell when a
// task is done and drive the phones when someone taps "Show me".
import { useSyncExternalStore } from 'react';
import type { PhoneApi } from '../os/context';
import type { PersonId } from '../data/types';

export interface PhoneUi {
  locked: boolean;
  app: PhoneApi['app'];
  thread: string | null;
  api: PhoneApi | null;
}

type Ui = Partial<Record<PersonId, PhoneUi>>;
let ui: Ui = {};
const listeners = new Set<() => void>();

export const reportUi = (me: PersonId, patch: Partial<PhoneUi>) => {
  const cur = ui[me] || { locked: true, app: null, thread: null, api: null };
  const next = { ...cur, ...patch };
  if (Object.keys(patch).every((k) => (cur as unknown as Record<string, unknown>)[k] === (patch as Record<string, unknown>)[k])) return;
  ui = { ...ui, [me]: next };
  listeners.forEach((l) => l());
};

export const getUi = () => ui;
export const useUi = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => ui);

// Small app events the tour listens for (things that aren't stored data).
type EventName = 'story-posted';
const bus = new EventTarget();
export const emit = (name: EventName, me: PersonId) => bus.dispatchEvent(new CustomEvent(name, { detail: me }));
export const on = (name: EventName, fn: (me: PersonId) => void) => {
  const h = (e: Event) => fn((e as CustomEvent<PersonId>).detail);
  bus.addEventListener(name, h);
  return () => bus.removeEventListener(name, h);
};
