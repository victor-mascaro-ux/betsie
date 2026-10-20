// The moment a bet is decided: confetti and a crown for the winner,
// a jester's hat and a rain puddle for the loser. Plays once per person, per bet,
// in each place it's seen: in Betsie, and in iMessage when it's settled there.
// It stays until tapped, so there's time to take it in.
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

type Surface = 'betsie' | 'imessage';
const key = (me: PersonId, surface: Surface) => `betsie-celebrated-${me}${surface === 'imessage' ? '-imessage' : ''}`;
export const celebrated = (me: PersonId, id: string, surface: Surface = 'betsie') => {
  try { return (JSON.parse(localStorage.getItem(key(me, surface)) || '[]') as string[]).includes(id); } catch { return true; }
};
const mark = (me: PersonId, id: string, surface: Surface) => {
  try { const l = JSON.parse(localStorage.getItem(key(me, surface)) || '[]'); localStorage.setItem(key(me, surface), JSON.stringify([...l, id].slice(-100))); } catch { /* ignore */ }
};

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
        <span className="cel-photo"><img src={person(me).photo} alt="" /></span>
        <img className={won ? 'cel-crown' : 'cel-jester'} src={won ? crown : jester} alt="" />
      </div>
      <p className="cel-sub">{won ? `You beat ${firstName(opponent(bet, me))}. Go collect.` : `${firstName(winner)} wins this one.`}</p>
      <small className="cel-tap">Tap to continue</small>
    </div>
  );
  return surface === 'imessage' ? screen : <Overlay>{screen}</Overlay>;
}
