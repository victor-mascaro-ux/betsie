import type { PersonId } from './types';

/** One-to-one iMessage thread between two people. */
export const pairThread = (a: PersonId, b: PersonId) => `dm:${[a, b].sort().join('~')}`;

/** Betsie's group thread for two people ("Betsie: Maxine vs. Sylvia"). */
export const betsieThread = (a: PersonId, b: PersonId) => `betsie:${[a, b].sort().join('~')}`;

export const threadPeople = (thread: string) => thread.split(':')[1].split('~') as PersonId[];
export const isBetsieThread = (thread: string) => thread.startsWith('betsie:');
