import { useEffect, useState } from 'react';
import clover from '../assets/brand/clover.webp';
import wordmark from '../assets/brand/wordmark.webp';

/** Launch screen: the clover spins in, the wordmark follows. Tap to skip. */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const leave = () => { setLeaving(true); setTimeout(onDone, 220); };
  useEffect(() => {
    const t = setTimeout(leave, 1500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} onClick={leave}>
      <img className="s-clover" src={clover} alt="" />
      <img className="s-word" src={wordmark} alt="Betsie" />
      <p className="s-tag">Bets with your besties</p>
    </div>
  );
}
