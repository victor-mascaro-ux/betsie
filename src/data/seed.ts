// Starting data for the demo. Everything is relative to "now" so dates read naturally.
import type { Bet, Comment, Message, PersonId, State } from './types';
import { pairThread } from './threads';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

let n = 0;
const id = (p: string) => `${p}${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const settled = (by: PersonId, vs: PersonId, winner: PersonId, text: string, daysAgo: number, length: number, stakes: Bet['stakes'] = {}): Bet => {
  const createdAt = Date.now() - daysAgo * DAY;
  const endsAt = createdAt + length * DAY;
  return {
    id: id('b'), createdAt, by, vs, text, endsAt, acceptBy: createdAt + DAY, method: 'consensus', visibility: 'everyone',
    stakes, status: 'settled', origin: 'app', votes: { [by]: winner, [vs]: winner }, winner,
    acceptedAt: createdAt + 2 * HOUR, votingAt: endsAt, settledAt: endsAt + HOUR, comments: [], read: {},
  };
};

const comment = (by: PersonId, minsAgo: number, text: string): Comment => ({ id: id('c'), by, at: Date.now() - minsAgo * 60_000, text, likes: [] });

export const seed = (): State => {
  const now = Date.now();
  const bets: Bet[] = [
    // Maxine vs Sylvia: Sylvia leads 4–2 ("Maxine wins against Sylvia 33% of the time").
    settled('maxine', 'sylvia', 'maxine', 'This meeting is going to go a minimum of 15 minutes over time.', 9, 1, { sylvia: 'at minute 16, come off mute and have Tom yell "have you seen my red underwear, I only wore them once" in the background.', maxine: "do Sylvia's laundry for a week." }),
    settled('sylvia', 'maxine', 'sylvia', 'A major discovery will be made in space exploration in the next 5 years.', 40, 20),
    settled('maxine', 'sylvia', 'sylvia', 'The new season of our show gets renewed before the finale airs.', 70, 14),
    settled('sylvia', 'maxine', 'sylvia', 'It will rain on the day of the company picnic.', 95, 6),
    settled('maxine', 'sylvia', 'maxine', 'Brunch will take longer than two hours.', 120, 1),
    settled('sylvia', 'maxine', 'sylvia', 'Our flight to Lisbon will be delayed.', 160, 9),
    // Maxine against everyone else: 14–0.
    settled('maxine', 'christopher', 'maxine', 'Mom will try to get us to help her reorganize the garage this weekend.', 12, 3),
    settled('maxine', 'megan', 'maxine', 'The office coffee machine breaks again before Friday.', 18, 4),
    settled('emily', 'maxine', 'maxine', 'Jake shows up late to his own birthday dinner.', 23, 2),
    settled('maxine', 'andy', 'maxine', 'Andy can run a 10K in under an hour by June.', 34, 60),
    settled('maxine', 'pavel', 'maxine', 'The new café on 5th closes within a year.', 48, 30),
    settled('sarah', 'maxine', 'maxine', 'It snows before Thanksgiving.', 55, 20),
    settled('maxine', 'jessica', 'maxine', "Jessica's sourdough starter survives the month.", 63, 30),
    settled('maxine', 'christopher', 'maxine', 'The fantasy league trade goes through this week.', 80, 7),
    settled('megan', 'maxine', 'maxine', 'Megan finishes the puzzle before the weekend.', 88, 5),
    settled('maxine', 'emily', 'maxine', 'The concert sells out in under ten minutes.', 101, 1),
    settled('maxine', 'sammanth', 'maxine', 'Sammanth keeps the plant alive until spring.', 130, 90),
    settled('maxine', 'andy', 'maxine', 'The book club picks a thriller next month.', 145, 30),
    settled('pavel', 'maxine', 'maxine', 'Pavel learns to juggle three balls by summer.', 170, 60),
    settled('maxine', 'sarah', 'maxine', 'The marathon gets moved because of heat.', 190, 40),
    // Sylvia against others: 3–0.
    settled('sylvia', 'andy', 'sylvia', 'Andy forgets the tickets at home.', 15, 2),
    settled('emily', 'sylvia', 'sylvia', 'The bakery runs out of croissants by 9am.', 44, 1),
    settled('sylvia', 'jessica', 'sylvia', 'The heat wave breaks before the weekend.', 77, 4),
    // In progress.
    {
      id: id('b'), createdAt: now - 2 * DAY, by: 'maxine', vs: 'christopher', text: "In n Out won't change their menu in the next 10 years.",
      endsAt: now + 3 * DAY + 5 * HOUR, acceptBy: now - DAY, method: 'consensus', visibility: 'everyone',
      stakes: { christopher: 'buy the whole office lunch.', maxine: 'wear a Christopher fan shirt for a day.' },
      status: 'active', origin: 'app', votes: {}, acceptedAt: now - 2 * DAY + HOUR, comments: [comment('christopher', 2880, 'Animal style is going away. Mark my words.')], read: {},
    },
    {
      id: id('b'), createdAt: now - 20 * HOUR, by: 'emily', vs: 'maxine', text: 'Susan will make her third trip to the coffee pot before noon.',
      endsAt: now + 19 * HOUR, acceptBy: now + 4 * HOUR, method: 'consensus', visibility: 'friends',
      stakes: {}, status: 'active', origin: 'app', votes: {}, acceptedAt: now - 19 * HOUR,
      comments: [comment('emily', 1100, "She's already on her second. ☕"), comment('maxine', 1080, 'Bold of you to assume she stops at three.')], read: { maxine: now },
    },
    {
      id: id('b'), createdAt: now - 3 * HOUR, by: 'megan', vs: 'maxine', text: "It will snow in Austin before New Year's.",
      endsAt: now + 40 * DAY, acceptBy: now + 21 * HOUR, method: 'consensus', visibility: 'everyone',
      stakes: {}, status: 'pending', origin: 'app', votes: {}, comments: [], read: {},
    },
  ];

  // Today's iMessage, where Maxine's Taylor Swift bet starts.
  const t = pairThread('maxine', 'sylvia');
  const messages: Message[] = [
    { id: id('m'), thread: t, from: 'sylvia', at: now - 14 * 60_000, text: "Excited for Taylor Swift's next concert 🤩" },
    { id: id('m'), thread: t, from: 'maxine', at: now - 13 * 60_000, text: "🎤 Ooh, new bet idea! Will she sing 'Getaway Car'?" },
    { id: id('m'), thread: t, from: 'sylvia', at: now - 12 * 60_000, text: "😛 Interesting! But… I don't think she will this time... She's got newer songs." },
  ];

  return { version: 1, bets, messages, notices: [], seen: { maxine: { [t]: now }, sylvia: { [t]: now } } };
};
