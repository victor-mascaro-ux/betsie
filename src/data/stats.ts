import { PEOPLE } from './people';
import type { Bet, PersonId, State } from './types';

const settledWith = (s: State, p: PersonId) => s.bets.filter((b) => b.status === 'settled' && (b.by === p || b.vs === p));

export const record = (s: State, p: PersonId) => {
  const mine = settledWith(s, p);
  const w = mine.filter((b) => b.winner === p).length + PEOPLE[p].base.w;
  const l = mine.length - (w - PEOPLE[p].base.w) + PEOPLE[p].base.l;
  return { w, l };
};

export const headToHead = (s: State, a: PersonId, b: PersonId) => {
  const games = settledWith(s, a).filter((x) => x.by === b || x.vs === b);
  const aw = games.filter((x) => x.winner === a).length;
  return { a: aw, b: games.length - aw };
};

export const winRate = (s: State, p: PersonId) => {
  const { w, l } = record(s, p);
  return w + l ? Math.round((w / (w + l)) * 100) : 0;
};

/** Position among the person and their friends, by win rate. */
export const friendsRank = (s: State, p: PersonId) => {
  const all = (Object.keys(PEOPLE) as PersonId[]).map((id) => ({ id, r: winRate(s, id) })).sort((x, y) => y.r - x.r);
  return all.findIndex((x) => x.id === p) + 1;
};

/** "Maxine wins against Sylvia 33% of the time." */
export const winsAgainst = (s: State, a: PersonId, b: PersonId) => {
  const h = headToHead(s, a, b);
  return h.a + h.b ? Math.round((h.a / (h.a + h.b)) * 100) : 50;
};

export const betsOf = (s: State, p: PersonId) => s.bets.filter((b) => b.by === p || b.vs === p);
export const isOpen = (b: Bet) => b.status === 'pending' || b.status === 'active' || b.status === 'voting';
export const opponent = (b: Bet, me: PersonId) => (b.by === me ? b.vs : b.by);
export const unreadComments = (b: Bet, me: PersonId) => b.comments.filter((c) => c.by !== me && c.at > (b.read[me] || 0)).length;
