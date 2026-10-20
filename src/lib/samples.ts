// Double-click (or double-tap) an empty text box to fill it with a sample,
// so a demo never stalls on typing. Each field names its kind with data-sample;
// "{them}" becomes the field's data-them.
const SAMPLES: Record<string, string[]> = {
  bet: [
    "Taylor Swift will sing 'Getaway Car' at her next concert.",
    'This meeting is going to go a minimum of 15 minutes over time.',
    'Susan will make her third trip to the coffee pot before noon.',
    'Mom will try to get us to help her reorganize the garage this weekend.',
    'It will rain on the day of the company picnic.',
  ],
  stake: [
    "do {them}'s laundry for a week.",
    'wear a full onesie to work for the next all hands.',
    'post a reel of you singing Love Story completely unironically.',
    'buy {them} brunch. Bottomless.',
    'at minute 16, come off mute and have Tom yell "have you seen my red underwear, I only wore them once" in the background.',
  ],
  comment: [
    "I'm already rescheduling my next meeting, there is no way this is going to end on time.",
    'You are so going down 😏',
    'Ha! I trust in the hangriness of the collective to bring this to a swift and timely end.',
    'Exactly 30 days to your crushing defeat.',
    'I TOLD YA!!!',
  ],
  imessage: [
    "You're wrong. I bet Taylor Swift will sing 'Getaway Car' at her next concert.",
    'Ok, if I win, you have to wear a full onesie to work for our next all hands. 😂',
    "Your misplaced confidence is truly inspiring. Can't wait to see you cry.",
    "I'm also having my best onesie dry cleaned though, just in case. 😅",
    'Yeeeesh.',
  ],
  search: ['Sylvia', 'Megan', 'Chris'],
};

const turn = new Map<string, number>();

export const sample = (kind: string, them = 'Sylvia') => {
  const list = SAMPLES[kind];
  if (!list) return null;
  const i = turn.get(kind) || 0;
  turn.set(kind, i + 1);
  return list[i % list.length].replace(/\{them\}/g, them);
};
