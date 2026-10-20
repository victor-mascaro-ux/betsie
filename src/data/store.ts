// The demo's single source of truth: bets, comments, iMessage threads and
// notifications. Both phones read it, so whatever one person does shows up on
// the other phone straight away. Saved in this browser (localStorage) and kept
// in sync across tabs.
import { useSyncExternalStore } from 'react';
import { firstName } from './people';
import { seed } from './seed';
import { betsieThread, pairThread, threadPeople } from './threads';
import { LIVE, type Bet, type CardKind, type Message, type Method, type Notice, type PersonId, type State, type Visibility } from './types';

const KEY = 'betsie-demo-v1';
const HOUR = 3600_000;
const ACCEPT_WINDOW = 24 * HOUR;

const load = (): State => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw) as State; if (s.version === 1) return s; }
  } catch { /* private mode or corrupt: start fresh */ }
  return seed();
};

let state: State = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ } };

const update = (fn: (s: State) => void) => {
  const next = structuredClone(state);
  fn(next);
  state = next;
  save();
  emit();
};

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  state = load();
  emit();
});

export const getState = () => state;
export const useAppState = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);

// ---------- helpers ----------
const rid = (n = 7) => Array.from({ length: n }, () => 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 56)]).join('');
const isLive = (p: PersonId) => LIVE.includes(p);
const other = (b: Bet, p: PersonId) => (b.by === p ? b.vs : b.by);
const findBet = (s: State, id: string) => s.bets.find((b) => b.id === id)!;
const upper = (p: PersonId) => firstName(p).toUpperCase();

const notify = (s: State, n: Omit<Notice, 'id' | 'at'>) => {
  if (!isLive(n.to)) return;
  s.notices.push({ ...n, id: rid(), at: Date.now() });
  if (s.notices.length > 200) s.notices = s.notices.slice(-200);
};

const post = (s: State, m: Omit<Message, 'id' | 'at'>) => {
  const msg: Message = { ...m, id: rid(), at: Date.now() };
  s.messages.push(msg);
  return msg;
};

/** Betsie posts into the pair's group thread (only for bets made from iMessage) and pings the other side. */
const bot = (s: State, b: Bet, kind: CardKind, actor: PersonId | null, who?: PersonId, preview?: string) => {
  if (b.origin !== 'imessage') return;
  const thread = betsieThread(b.by, b.vs);
  post(s, { thread, from: 'betsie', card: { kind, betId: b.id, who } });
  for (const p of [b.by, b.vs]) {
    if (p === actor) continue;
    notify(s, { to: p, app: 'messages', title: `Betsie: ${firstName(b.by)} vs. ${firstName(b.vs)}`, body: preview || 'Betsie sent an update.', thread });
  }
};

/** App notifications for bets made in the Betsie app. */
const ping = (s: State, b: Bet, to: PersonId, body: string) => {
  if (b.origin === 'imessage') return;
  notify(s, { to, app: 'betsie', title: 'Betsie', body, betId: b.id });
};

// ---------- actions ----------
export interface Draft {
  by: PersonId;
  vs: PersonId | null;
  text: string;
  endsAt: number;
  method: Method;
  visibility: Visibility;
  origin: 'app' | 'imessage';
}

export const createBet = (d: Draft): string => {
  const id = rid();
  update((s) => {
    const now = Date.now();
    const b: Bet = {
      id, createdAt: now, by: d.by, vs: d.vs!, text: d.text.trim(), endsAt: d.endsAt, acceptBy: now + ACCEPT_WINDOW,
      method: d.method, visibility: d.visibility, stakes: {}, status: 'pending', origin: d.origin, votes: {}, comments: [], read: {},
    };
    s.bets.push(b);
    ping(s, b, b.vs, `You have a new Bet from ${firstName(b.by)}!`);
    bot(s, b, 'challenge', b.by, b.vs, `${upper(b.by)} has challenged ${upper(b.vs)}!`);
  });
  return id;
};

export const acceptBet = (id: string, who: PersonId) => update((s) => {
  const b = findBet(s, id);
  if (b.status !== 'pending' || who !== b.vs) return;
  b.status = 'active';
  b.acceptedAt = Date.now();
  ping(s, b, b.by, `${firstName(who)} accepted your bet! It's on.`);
  bot(s, b, 'accepted', who, undefined, `${upper(who)} has accepted the challenge!`);
  bot(s, b, 'on', who, undefined, 'YOUR BET IS ON!');
  if (!b.stakes[b.by] || !b.stakes[b.vs]) bot(s, b, 'stakes-ask', who, undefined, 'Care to make things interesting?');
});

export const declineBet = (id: string, who: PersonId) => update((s) => {
  const b = findBet(s, id);
  if (b.status !== 'pending' || who !== b.vs) return;
  b.status = 'declined';
  ping(s, b, b.by, `${firstName(who)} passed on your bet.`);
  bot(s, b, 'declined', who, undefined, `${upper(who)} passed on the challenge.`);
});

/** `loser` is the person who does it if they lose. */
export const setStake = (id: string, loser: PersonId, text: string, actor: PersonId) => update((s) => {
  const b = findBet(s, id);
  const had = !!(b.stakes[b.by] && b.stakes[b.vs]);
  if (text.trim()) b.stakes[loser] = text.trim(); else delete b.stakes[loser];
  const has = !!(b.stakes[b.by] && b.stakes[b.vs]);
  if (has && !had) {
    ping(s, b, other(b, actor), `${firstName(actor)} set the stakes. Things just got interesting.`);
    bot(s, b, 'stakes', actor, undefined, 'The STAKES are set!');
  }
});

export const addComment = (id: string, by: PersonId, c: { text?: string; sticker?: string }) => update((s) => {
  const b = findBet(s, id);
  b.comments.push({ id: rid(), by, at: Date.now(), likes: [], ...c });
  b.read[by] = Date.now();
  ping(s, b, other(b, by), c.sticker ? `${firstName(by)} sent a sticker 😜` : `${firstName(by)}: ${c.text}`);
});

export const likeComment = (id: string, commentId: string, who: PersonId) => update((s) => {
  const c = findBet(s, id).comments.find((x) => x.id === commentId);
  if (!c) return;
  c.likes = c.likes.includes(who) ? c.likes.filter((p) => p !== who) : [...c.likes, who];
});

export const markCommentsRead = (id: string, who: PersonId) => {
  const b = findBet(state, id);
  if (b && (b.read[who] || 0) >= Math.max(0, ...b.comments.map((c) => c.at))) return;
  update((s) => { findBet(s, id).read[who] = Date.now(); });
};

const startVoting = (s: State, b: Bet) => {
  b.status = 'voting';
  b.votingAt = Date.now();
  b.endsAt = Math.min(b.endsAt, Date.now());
  for (const p of [b.by, b.vs]) ping(s, b, p, 'Your bet is over! Time to decide the winner!');
  bot(s, b, 'over', null, b.by, 'YOUR BET IS OVER!');
};

/** Demo control: skip to the end of a bet. */
export const endBetNow = (id: string) => update((s) => {
  const b = findBet(s, id);
  if (b.status === 'active') startVoting(s, b);
});

const settle = (s: State, b: Bet, winner: PersonId, by: PersonId | null) => {
  b.status = 'settled';
  b.winner = winner;
  b.settledAt = Date.now();
  const loser = other(b, winner);
  ping(s, b, winner, 'You nailed it! 🎉 Come collect your bragging rights.');
  ping(s, b, loser, `${firstName(winner)} was right!`);
  if (by) bot(s, b, 'declared', null, by, `${upper(by)} declared ${upper(winner)} is the winner!`);
  bot(s, b, 'winner', null, winner, `${upper(winner)} IS THE WINNER!`);
};

export const vote = (id: string, who: PersonId, pick: PersonId) => update((s) => {
  const b = findBet(s, id);
  if (b.status !== 'voting') return;
  b.votes[who] = pick;
  const them = other(b, who);
  if (pick === them) return settle(s, b, pick, who); // conceding settles it
  const theirs = b.votes[them];
  if (theirs === pick) return settle(s, b, pick, who);
  ping(s, b, them, `${firstName(who)} voted for ${pick === them ? 'you' : firstName(pick)}. Do you agree?`);
  if (b.origin === 'imessage') bot(s, b, 'over', who, them, `${upper(them)}, who won the bet?`);
});

export const sendMessage = (thread: string, from: PersonId, text: string) => update((s) => {
  post(s, { thread, from, text });
  s.seen[from] = { ...(s.seen[from] || {}), [thread]: Date.now() };
  for (const p of threadPeople(thread)) {
    if (p !== from) notify(s, { to: p, app: 'messages', title: firstName(from), body: text, thread });
  }
});

export const shareToMessages = (betId: string, from: PersonId, to: PersonId) => update((s) => {
  const thread = pairThread(from, to);
  post(s, { thread, from, card: { kind: 'shared', betId, who: from } });
  notify(s, { to, app: 'messages', title: firstName(from), body: 'Shared a bet from Betsie 🍀', thread });
});

/** YES/NO and vote buttons inside Betsie's iMessage cards. */
export const answerCard = (messageId: string, who: PersonId, answer: string) => {
  const m = state.messages.find((x) => x.id === messageId);
  if (!m?.card) return;
  update((s) => { s.messages.find((x) => x.id === messageId)!.answer = answer; });
  const b = findBet(state, m.card.betId);
  if (m.card.kind === 'challenge') (answer === 'yes' ? acceptBet : declineBet)(b.id, who);
  if (m.card.kind === 'over') vote(b.id, who, answer as PersonId);
};

export const markThreadSeen = (who: PersonId, thread: string) => {
  const last = Math.max(0, ...state.messages.filter((m) => m.thread === thread).map((m) => m.at));
  if ((state.seen[who]?.[thread] || 0) >= last) return;
  update((s) => { s.seen[who] = { ...(s.seen[who] || {}), [thread]: Date.now() }; });
};

export const markNoticesRead = (who: PersonId, match: (n: Notice) => boolean = () => true) => {
  if (!state.notices.some((n) => n.to === who && !n.read && match(n))) return;
  update((s) => { s.notices.forEach((n) => { if (n.to === who && match(n)) n.read = true; }); });
};

export const resetDemo = () => {
  state = seed();
  save();
  emit();
};

// ---------- time passing + friends without a phone ----------
// Deterministic per bet, so a reload mid-way ends the same.
const coin = (id: string, salt: string) => [...(id + salt)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 100;

export const tick = () => {
  const now = Date.now();
  const due = state.bets.filter((b) =>
    (b.status === 'pending' && (b.acceptBy < now || (!isLive(b.vs) && now - b.createdAt > 3500))) ||
    (b.status === 'active' && b.endsAt <= now) ||
    (b.status === 'voting' && now - (b.votingAt || now) > 3000 && (b.method !== 'consensus' || [b.by, b.vs].some((p) => !isLive(p) && !b.votes[p]))));
  if (!due.length) return;
  update((s) => {
    for (const d of due) {
      const b = findBet(s, d.id);
      if (b.status === 'pending') {
        if (b.acceptBy < now) { b.status = 'expired'; ping(s, b, b.by, `Your bet with ${firstName(b.vs)} expired.`); continue; }
        if (coin(b.id, 'accept') < 85) {
          b.status = 'active'; b.acceptedAt = now;
          ping(s, b, b.by, `${firstName(b.vs)} accepted your bet! It's on.`);
        } else {
          b.status = 'declined';
          ping(s, b, b.by, `${firstName(b.vs)} passed on your bet.`);
        }
      } else if (b.status === 'active') {
        startVoting(s, b);
      } else if (b.method !== 'consensus') {
        // Robots, a moderator or the crowd decide.
        settle(s, b, coin(b.id, 'decide') < 50 ? b.by : b.vs, null);
      } else {
        for (const p of [b.by, b.vs]) {
          if (isLive(p) || b.votes[p]) continue;
          const pick = coin(b.id, 'vote') < 50 ? other(b, p) : p;
          b.votes[p] = pick;
          const them = other(b, p);
          if (pick === them || b.votes[them] === pick) settle(s, b, pick, p);
          else ping(s, b, them, `${firstName(p)} voted for ${firstName(p)}. Do you agree?`);
        }
      }
    }
  });
};
