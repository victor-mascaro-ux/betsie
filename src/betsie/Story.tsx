// Sharing the result to your Instagram story.
import { useEffect, useState } from 'react';
import nextIcon from '../assets/os/next.svg';
import starIcon from '../assets/os/star.svg';
import clover from '../assets/brand/clover.webp';
import { firstName, person } from '../data/people';
import { useAppState } from '../data/store';
import { opponent } from '../data/stats';
import { usePhone } from '../os/context';
import { StatPills, VsHeader } from './chrome';

export function Story({ id, onBack }: { id: string; onBack: () => void }) {
  const { me, setStatusLight } = usePhone();
  const s = useAppState();
  const bet = s.bets.find((b) => b.id === id)!;
  const [posted, setPosted] = useState<string | null>(null);
  useEffect(() => { setStatusLight(true); return () => setStatusLight(false); }, [setStatusLight]);
  const winner = bet.winner || bet.by;
  const loser = opponent(bet, winner);
  const post = (to: string) => { setPosted(to); setTimeout(onBack, 1100); };
  const last = bet.comments.filter((c) => c.sticker || c.text).slice(-1)[0];

  return (
    <div className="story">
      <div className="story-top">
        <button className="st-round tap" onClick={onBack} aria-label="Back">‹</button>
        <span className="st-tools"><i>Aa</i><i>☺︎</i><i>✦</i><i>♫</i><i>•••</i></span>
      </div>
      <div className="story-card">
        <div className="bc-text"><img src={clover} alt="" /><p>{bet.text}</p></div>
        <hr />
        <VsHeader s={s} a={winner} b={loser} winner={bet.winner} me={me} />
        <StatPills s={s} id={winner} small />
        <hr />
        <div className="owes"><img src={person(loser).photo} alt="" /><p><b>{firstName(loser)}</b> will...<br />{bet.stakes[loser] || 'owe bragging rights.'}</p></div>
        {last && (
          <div className="last-comment">
            <img src={person(last.by).photo} alt="" className="lc-photo" />
            <p><b>{firstName(last.by)}</b><br />{last.text}</p>
            {last.sticker && <img className="sticker" src={last.sticker} alt="" />}
          </div>
        )}
      </div>
      <div className="story-bottom">
        <button className="st-pill tap" onClick={() => post('story')}>{posted === 'story' ? 'Shared ✓' : 'Your stories'}</button>
        <button className="st-pill tap" onClick={() => post('close')}><img src={starIcon} alt="" />{posted === 'close' ? 'Shared ✓' : 'Close friends'}</button>
        <button className="st-next tap" onClick={() => post('story')} aria-label="Share"><img src={nextIcon} alt="" /></button>
      </div>
    </div>
  );
}
