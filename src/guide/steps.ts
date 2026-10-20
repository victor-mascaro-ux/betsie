// The guided tour: one task at a time. Each task knows when it's done (from the
// app's data or what the phones show), where to tap if you do it yourself, and
// how to do it for you ("Show me").
import { endBetNow } from '../data/store';
import { betsieThread, pairThread } from '../data/threads';
import type { Bet, PersonId, State } from '../data/types';
import type { PhoneUi } from '../lib/ui';
import { atBet, find, inThread, show, skipSplash, sleep, tap, type, unlocked, waitFor } from './pilot';
import type { Tour } from './tour';

const M: PersonId = 'maxine';
const S: PersonId = 'sylvia';
const DM = pairThread(M, S);
const GROUP = betsieThread(M, S);

export interface Ctx {
  s: State;
  ui: Partial<Record<PersonId, PhoneUi>>;
  tour: Tour;
  /** The bet made during the tour (newest Maxine–Sylvia bet since it started). */
  bet?: Bet;
}
export interface Hint { me: PersonId; sel: string; text?: string; last?: boolean }

export interface Step {
  phone: PersonId | null;
  title: string;
  body: (c: Ctx) => string;
  done: (c: Ctx) => boolean;
  hints?: (c: Ctx) => Hint[];
  run?: (c: Ctx) => Promise<void>;
  cta?: string;
}

export const tourBet = (s: State, tour: Tour) =>
  s.bets
    .filter((b) => b.createdAt >= tour.startedAt - 1000 && [b.by, b.vs].includes(M) && [b.by, b.vs].includes(S))
    .sort((a, b) => b.createdAt - a.createdAt)[0];

const isOn = (b?: Bet) => !!b && ['active', 'voting', 'settled'].includes(b.status);

export const STEPS: Step[] = [
  {
    phone: M,
    title: 'Wake up Maxine’s phone',
    body: () => 'Maxine and Sylvia are best friends who can’t stop betting. This is Maxine’s iPhone: tap the lock screen to unlock it.',
    done: (c) => c.ui[M]?.locked === false,
    hints: () => [{ me: M, sel: '.lock-hint' }],
    run: async () => { await tap(M, '.lock'); },
  },
  {
    phone: M,
    title: 'Text Sylvia a bet',
    body: () => 'Sylvia just texted about Taylor Swift’s concert. Open Messages and reply with a bet that starts with “I bet…”.',
    done: (c) => c.s.messages.some((m) => m.thread === DM && m.from === M && m.at >= c.tour.startedAt && /\bI bet\b/i.test(m.text || '')),
    hints: () => [
      { me: M, sel: '.th-send' },
      { me: M, sel: '.th-input textarea' },
      { me: M, sel: `.tl-row[data-thread="${DM}"]` },
      { me: M, sel: '.app-icon-btn[aria-label="Messages"]' },
      { me: M, sel: '.home-indicator' },
    ],
    run: async () => {
      await inThread(M, DM);
      await type(M, '.th-input textarea', 'You’re wrong. I bet Taylor Swift will sing ‘Getaway Car’ at her next concert.');
      await tap(M, '.th-send');
    },
  },
  {
    phone: M,
    title: 'Turn it into a bet',
    body: () => 'See the 🍀 next to your message? Tap it: Betsie opens right inside iMessage, already filled in. Pick how to decide the winner, then tap BET!',
    done: (c) => !!c.bet,
    hints: () => [
      { me: M, sel: '.imsg-app .bet-btn' },
      { me: M, sel: '.imsg-app .method-opt', text: 'CONSENSUS' },
      { me: M, sel: '.imsg-app .tb-center:not(.off)' },
      { me: M, sel: '.bet-this', last: true },
      { me: M, sel: `.tl-row[data-thread="${DM}"]` },
    ],
    run: async () => {
      if (!find(M, '.imsg-app')) {
        await inThread(M, DM);
        await tap(M, '.bet-this', { last: true });
      }
      await waitFor(() => find(M, '.imsg-app'));
      await skipSplash(M);
      if (find(M, '.imsg-app .new-bet')) await tap(M, '.imsg-app .tb-center');
      if (find(M, '.imsg-app .method')) await tap(M, '.imsg-app .method-opt', { text: 'CONSENSUS' });
      await waitFor(() => find(M, '.imsg-app .bet-btn'));
      await sleep(400);
      await tap(M, '.imsg-app .bet-btn');
    },
  },
  {
    phone: S,
    title: 'Sylvia gets the challenge',
    body: () => 'Over on Sylvia’s phone, a notification just arrived. Tap it.',
    done: (c) => c.ui[S]?.locked === false && !!c.ui[S]?.app,
    hints: () => [{ me: S, sel: '.banner .notice' }, { me: S, sel: '.lock .notice' }, { me: S, sel: '.lock-hint' }],
    run: async (c) => {
      await show(S);
      if (find(S, '.lock .notice')) await tap(S, '.lock .notice');
      else if (find(S, '.banner .notice')) await tap(S, '.banner .notice');
      else if (c.bet) await atBet(S, c.bet.id);
    },
  },
  {
    phone: S,
    title: 'Accept the challenge',
    body: (c) => c.bet?.origin === 'imessage'
      ? 'Betsie asks Sylvia to accept. Tap YES, and watch Maxine’s phone update at the same moment.'
      : 'Tap ACCEPT, and watch Maxine’s phone update at the same moment.',
    done: (c) => isOn(c.bet),
    hints: () => [{ me: S, sel: '.choice:not(:disabled)', text: 'YES' }, { me: S, sel: '.pill', text: 'ACCEPT' }],
    run: async (c) => {
      if (!c.bet) return;
      if (c.bet.origin === 'imessage') {
        await inThread(S, GROUP);
        await tap(S, '.choice:not(:disabled)', { text: 'YES', last: true });
      } else {
        await atBet(S, c.bet.id);
        await tap(S, '.pill', { text: 'ACCEPT' });
      }
    },
  },
  {
    phone: S,
    title: 'Raise the stakes',
    body: () => 'Make it interesting: what does each of you do if you lose? Tap SET THE STAKES and fill in both.',
    done: (c) => !!(c.bet?.stakes[M] && c.bet?.stakes[S]),
    hints: () => [
      { me: S, sel: '.app-layer.front textarea.stake-field' },
      { me: S, sel: '.choice:not(:disabled)', text: 'SET THE STAKES', last: true },
    ],
    run: async (c) => {
      if (!c.bet) return;
      if (find(S, '.choice:not(:disabled)', { text: 'SET THE STAKES' })) { await tap(S, '.choice:not(:disabled)', { text: 'SET THE STAKES', last: true }); await sleep(500); await skipSplash(S); }
      else await atBet(S, c.bet.id);
      await waitFor(() => find(S, '.app-layer.front textarea.stake-field'));
      await type(S, '.app-layer.front textarea.stake-field', 'wear a full onesie to work for the next all hands.', { nth: 0 });
      await type(S, '.app-layer.front textarea.stake-field', 'do Sylvia’s laundry for a week.', { nth: 1 });
      await tap(S, '.app-layer.front .titlebar h1');
    },
  },
  {
    phone: S,
    title: 'Talk some trash',
    body: () => 'Every bet has comments. Open them with the speech bubble, say something, and send a sticker. Maxine gets it right away.',
    done: (c) => !!c.bet?.comments.some((x) => x.at >= c.tour.startedAt),
    hints: () => [
      { me: S, sel: '.comments .c-send' },
      { me: S, sel: '.comments .composer input' },
      { me: S, sel: '.app-layer.front .tb-center' },
    ],
    run: async (c) => {
      if (!c.bet) return;
      if (!find(S, '.comments')) {
        if (!find(S, '.app-layer.front .active, .app-layer.front .pending')) await atBet(S, c.bet.id);
        await tap(S, '.app-layer.front .tb-center');
      }
      await type(S, '.comments .composer input', 'Exactly 30 days to your crushing defeat. 😏');
      await tap(S, '.comments .c-send');
      await tap(S, '.comments .c-send.sticker');
      await tap(S, '.comments .st-grid button', { nth: 6 });
      await sleep(900);
      await tap(S, '.comments .c-done');
    },
  },
  {
    phone: null,
    title: 'Fast-forward to concert night',
    body: () => 'A bet runs until its end date. For this demo, skip ahead to the end and both phones hear about it.',
    cta: 'Skip to the end',
    done: (c) => c.bet?.status === 'voting' || c.bet?.status === 'settled',
    run: async (c) => { if (c.bet) endBetNow(c.bet.id); await sleep(400); },
  },
  {
    phone: S,
    title: 'Who won? Both vote',
    body: () => 'She sang it! Sylvia votes for Sylvia, then Maxine admits it. When one of you concedes, the bet is settled.',
    done: (c) => c.bet?.status === 'settled',
    hints: () => [
      { me: S, sel: '.candidate .pill', text: 'SYLVIA' },
      { me: M, sel: '.choice:not(:disabled)', text: 'SYLVIA', last: true },
      { me: M, sel: '.candidate .pill', text: 'SYLVIA' },
    ],
    run: async (c) => {
      const b = c.bet;
      if (!b) return;
      if (!b.votes[S]) {
        if (!find(S, '.candidate .pill')) await atBet(S, b.id);
        await tap(S, '.candidate .pill', { text: 'SYLVIA' });
        await sleep(700);
      }
      await show(M);
      await unlocked(M);
      if (b.origin === 'imessage') {
        await inThread(M, GROUP);
        await tap(M, '.choice:not(:disabled)', { text: 'SYLVIA', last: true });
      } else {
        await atBet(M, b.id);
        await tap(M, '.candidate .pill', { text: 'SYLVIA' });
      }
    },
  },
  {
    phone: S,
    title: 'Celebrate, then brag',
    body: () => 'Sylvia nailed it! Tap past the celebration, then share the win to Sylvia’s Instagram story.',
    done: (c) => c.tour.storyPosted,
    hints: () => [
      { me: S, sel: '.st-pill', text: 'YOUR STORIES' },
      { me: S, sel: '.share-apps button', text: 'STORIES' },
      { me: S, sel: '.app-layer.front .tb-center' },
    ],
    run: async (c) => {
      if (!c.bet) return;
      await show(S);
      if (!find(S, '.share, .story')) {
        if (!find(S, '.app-layer.front .result')) await atBet(S, c.bet.id);
        if (find(S, '.celebrate')) { await sleep(900); await tap(S, '.celebrate'); await sleep(300); }
        await tap(S, '.app-layer.front .tb-center');
      }
      if (find(S, '.share')) await tap(S, '.share-apps button', { text: 'Stories' });
      await waitFor(() => find(S, '.story'));
      await sleep(700);
      await tap(S, '.st-pill', { text: 'Your stories' });
    },
  },
  {
    phone: null,
    title: 'That’s Betsie! 🍀',
    body: () => 'Now it’s yours to play with. Start a new bet with +, flip through the Book of Bets, or bet a friend who answers on their own. Double-click any empty text box to fill it in.',
    done: () => false,
  },
];

