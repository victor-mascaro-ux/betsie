// The moment a bet is decided: confetti and a crown for the winner,
// a jester's hat and a rain puddle for the loser. Once per person per bet.
import { useEffect } from 'react';
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

const key = (me: PersonId) => `betsie-celebrated-${me}`;
export const celebrated = (me: PersonId, id: string) => {
  try { return (JSON.parse(localStorage.getItem(key(me)) || '[]') as string[]).includes(id); } catch { return true; }
};
const mark = (me: PersonId, id: string) => {
  try { const l = JSON.parse(localStorage.getItem(key(me)) || '[]'); localStorage.setItem(key(me), JSON.stringify([...l, id].slice(-100))); } catch { /* ignore */ }
};

export function Celebration({ bet, won, onDone }: { bet: Bet; won: boolean; onDone: () => void }) {
  const { me } = usePhone();
  const who = won ? me : opponent(bet, me);
  useEffect(() => {
    mark(me, bet.id);
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Overlay>
      <div className={`celebrate${won ? ' won' : ' lost'}`} onClick={onDone}>
        <div className="cel-brand"><img src={wordmark} alt="Betsie" /><small>Bets with your besties</small></div>
        <div className="cel-bar">{won ? 'NAILED IT!' : `${firstName(bet.winner!).toUpperCase()} WAS RIGHT!`}</div>
        <div className="cel-stage">
          {won && <img className="confetti" src={confetti} alt="" />}
          {!won && <img className="puddle" src={puddle} alt="" />}
          <span className="cel-photo"><img src={person(won ? me : me).photo} alt="" /></span>
          <img className={won ? 'cel-crown' : 'cel-jester'} src={won ? crown : jester} alt="" />
        </div>
        <p className="cel-sub">{won ? `You beat ${firstName(opponent(bet, me))}. Go collect.` : `${firstName(who)} wins this one.`}</p>
        <small className="cel-tap">Tap to continue</small>
      </div>
    </Overlay>
  );
}
