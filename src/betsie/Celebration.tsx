// The moment a bet is decided: confetti and a crown for the winner,
// a jester's hat, rain and tears for the loser. Plays once per person, per bet,
// in each place it's seen: in Betsie, and in iMessage when it's settled there.
// It stays until tapped, so there's time to take it in.
import { useEffect, useMemo, type CSSProperties } from 'react';
import confetti from '../assets/fx/confetti.gif';
import crown from '../assets/fx/crown.webp';
import jester from '../assets/fx/jester.webp';
import puddle from '../assets/fx/puddle.webp';
import wordmark from '../assets/brand/wordmark.webp';
import { firstName, person } from '../data/people';
import { opponent } from '../data/stats';
import type { Bet, PersonId } from '../data/types';
import { usePhone } from '../os/context';
import { Overlay } from './overlay';

type Surface = 'betsie' | 'imessage';
const key = (me: PersonId, surface: Surface) => `betsie-celebrated-${me}${surface === 'imessage' ? '-imessage' : ''}`;
export const celebrated = (me: PersonId, id: string, surface: Surface = 'betsie') => {
  try { return (JSON.parse(localStorage.getItem(key(me, surface)) || '[]') as string[]).includes(id); } catch { return true; }
};
const mark = (me: PersonId, id: string, surface: Surface) => {
  try { const l = JSON.parse(localStorage.getItem(key(me, surface)) || '[]'); localStorage.setItem(key(me, surface), JSON.stringify([...l, id].slice(-100))); } catch { /* ignore */ }
};

// Where the eyes are in each phone owner's photo (% of the square photo), so the tears start there.
const EYES: Partial<Record<PersonId, [number, number][]>> = {
  maxine: [[27, 39], [44, 37]],
  sylvia: [[42, 39], [63, 34]],
};
const FACE: [number, number][] = [[38, 42], [62, 42]];

/** Rain from under the status bar onto the puddle (stage coordinates: the sky starts at -222, the puddle's ground is y 310–378). */
function Rain() {
  const drops = useMemo(() => Array.from({ length: 48 }, (_, i) => {
    const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    const land = 310 + r(1) * 68;
    return { left: 30 + r(2) * 370, h: 222 + land, d: 0.7 + r(3) * 0.3, delay: -r(4) * 1.2 };
  }), []);
  return (
    <span className="cel-rain" aria-hidden>
      {drops.map((x, i) => (
        <i key={i} style={{ left: x.left, height: x.h, '--fall': `${x.h - 24}px`, animationDuration: `${x.d}s`, animationDelay: `${x.delay}s` } as CSSProperties} />
      ))}
    </span>
  );
}

function Tears({ who }: { who: PersonId }) {
  return (
    <span className="cel-tears" aria-hidden>
      {(EYES[who] || FACE).map(([x, y], e) => (
        <span key={e} className="cel-eye" style={{ left: `${x}%`, top: `${y}%` }}>
          <b className="track" />
          {[0, 1].map((n) => <i key={n} style={{ animationDelay: `${1.4 + e * 0.45 + n * 0.85}s` }} />)}
        </span>
      ))}
    </span>
  );
}

export function Celebration({ bet, won, onDone, surface = 'betsie' }: { bet: Bet; won: boolean; onDone: () => void; surface?: Surface }) {
  const { me } = usePhone();
  const winner = bet.winner!;
  useEffect(() => { mark(me, bet.id, surface); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const screen = (
    <div className={`celebrate${won ? ' won' : ' lost'}${surface === 'imessage' ? ' in-chat' : ''}`} onClick={onDone}>
      <div className="cel-brand"><img src={wordmark} alt="Betsie" /><small>Bets with your besties</small></div>
      <div className="cel-bar">{won ? 'NAILED IT!' : `${firstName(winner).toUpperCase()} WAS RIGHT!`}</div>
      <div className="cel-stage">
        {won && <img className="confetti" src={confetti} alt="" />}
        {!won && <img className="puddle" src={puddle} alt="" />}
        <span className="cel-photo"><img src={person(me).photo} alt="" />{!won && <Tears who={me} />}</span>
        <img className={won ? 'cel-crown' : 'cel-jester'} src={won ? crown : jester} alt="" />
        {!won && <Rain />}
      </div>
      <p className="cel-sub">{won ? `You beat ${firstName(opponent(bet, me))}. Go collect.` : `${firstName(winner)} wins this one.`}</p>
      <small className="cel-tap">Tap to continue</small>
    </div>
  );
  return surface === 'imessage' ? screen : <Overlay>{screen}</Overlay>;
}
