import { createContext, useContext } from 'react';
import type { Draft } from '../data/store';
import type { PersonId } from '../data/types';

export type AppName = 'betsie' | 'messages';

/** A request to show something inside an app (from a notification, a link, another app). */
export interface Link {
  bet?: string;
  thread?: string;
  compose?: Partial<Draft>;
  screen?: 'book' | 'notices' | 'friends' | 'story';
  /** Changes on every request so the same link can be opened twice. */
  n: number;
}

export interface PhoneApi {
  me: PersonId;
  app: AppName | null;
  open: (app: AppName, link?: Omit<Link, 'n'>) => void;
  home: () => void;
  share: (betId: string) => void;
  setStatusLight: (light: boolean) => void;
  /** The on-screen iOS keyboard is up (desktop only). */
  keyboard: boolean;
}

export const PhoneContext = createContext<PhoneApi>(null!);
export const usePhone = () => useContext(PhoneContext);
