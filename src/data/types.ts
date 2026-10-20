export type PersonId =
  | 'maxine' | 'sylvia' | 'christopher' | 'megan' | 'sammanth'
  | 'andy' | 'emily' | 'pavel' | 'sarah' | 'jessica';

/** The two people with a phone in the demo. Everyone else answers on their own. */
export const LIVE: PersonId[] = ['maxine', 'sylvia'];

export interface Person {
  id: PersonId;
  first: string;
  last: string;
  handle: string;
  photo: string;
  mutual: number;
  /** Global leaderboard position (decorative). */
  global: number;
  /** Bets won and lost outside this demo, so friends have records. */
  base: { w: number; l: number };
}

export type Method = 'consensus' | 'moderator' | 'robots' | 'crowd';
export type Visibility = 'everyone' | 'friends' | 'private';
export type BetStatus = 'pending' | 'declined' | 'expired' | 'active' | 'voting' | 'settled';

export interface Comment {
  id: string;
  by: PersonId;
  at: number;
  text?: string;
  sticker?: string;
  likes: PersonId[];
}

export interface Bet {
  id: string;
  createdAt: number;
  by: PersonId;
  vs: PersonId;
  text: string;
  endsAt: number;
  acceptBy: number;
  method: Method;
  visibility: Visibility;
  /** What each person does if they lose ("Sylvia will…"). */
  stakes: Partial<Record<PersonId, string>>;
  status: BetStatus;
  /** Where it was made: in the app, or from an iMessage thread (Betsie then reports there). */
  origin: 'app' | 'imessage';
  votes: Partial<Record<PersonId, PersonId>>;
  winner?: PersonId;
  acceptedAt?: number;
  votingAt?: number;
  settledAt?: number;
  comments: Comment[];
  /** Last time each person opened the comments, for the unread badge. */
  read: Partial<Record<PersonId, number>>;
}

/** Betsie's rich messages in an iMessage thread. */
export type CardKind =
  | 'challenge' | 'accepted' | 'declined' | 'on' | 'stakes-ask' | 'stakes'
  | 'countdown' | 'over' | 'declared' | 'winner' | 'shared';

export interface Message {
  id: string;
  thread: string;
  from: PersonId | 'betsie';
  at: number;
  text?: string;
  card?: { kind: CardKind; betId: string; who?: PersonId };
  /** For YES/NO and vote buttons: what the addressed person picked. */
  answer?: string;
}

export interface Notice {
  id: string;
  to: PersonId;
  at: number;
  app: 'betsie' | 'messages';
  title: string;
  body: string;
  betId?: string;
  thread?: string;
  read?: boolean;
}

export interface State {
  version: 1;
  bets: Bet[];
  messages: Message[];
  notices: Notice[];
  /** Messages each person has read, per thread (last read time). */
  seen: Partial<Record<PersonId, Record<string, number>>>;
}
