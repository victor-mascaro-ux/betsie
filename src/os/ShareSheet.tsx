// iOS share sheet for a bet: send it to a friend, an app, or your story.
import { useState } from 'react';
import mail from '../assets/apps/mail.svg';
import messages from '../assets/apps/messages.svg';
import messenger from '../assets/apps/messenger.svg';
import whatsapp from '../assets/apps/whatsapp.svg';
import clover from '../assets/brand/clover.webp';
import close from '../assets/os/close.svg';
import copyIcon from '../assets/os/copy.svg';
import glasses from '../assets/os/glasses.svg';
import instagram from '../assets/os/instagram.webp';
import { firstName, person } from '../data/people';
import { getState, shareToMessages } from '../data/store';
import { LIVE, type PersonId } from '../data/types';
import { usePhone } from './context';

export const shareTitle = (betId: string, me: PersonId) => {
  const b = getState().bets.find((x) => x.id === betId)!;
  if (b.status !== 'settled') return 'Check out my bet';
  return b.winner === me ? 'I nailed it!' : `${firstName(b.winner!)} was right!`;
};

export function ShareSheet({ betId, onClose }: { betId: string; onClose: () => void }) {
  const { me, open } = usePhone();
  const [done, setDone] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const b = getState().bets.find((x) => x.id === betId)!;
  const them = b.by === me ? b.vs : b.by;
  const friends = [them, ...(['sylvia', 'maxine', 'megan', 'emily', 'christopher', 'andy'] as PersonId[]).filter((p) => p !== me && p !== them)].slice(0, 5);

  const dismiss = (after?: () => void) => { setLeaving(true); setTimeout(() => { onClose(); after?.(); }, 260); };
  const sent = (key: string, to?: PersonId) => {
    if (to && LIVE.includes(to)) shareToMessages(betId, me, to);
    setDone(key);
    setTimeout(() => dismiss(), 700);
  };

  return (
    <div className={`share${leaving ? ' leaving' : ''}`} onClick={() => dismiss()}>
      <div className="share-panel" onClick={(e) => e.stopPropagation()}>
        <header>
          <span className="share-app"><img src={clover} alt="" /></span>
          <span className="share-title"><b>{shareTitle(betId, me)}</b><small>Betsie</small></span>
          <button className="share-close tap" onClick={() => dismiss()} aria-label="Close"><img src={close} alt="" /></button>
        </header>
        <div className="share-people">
          {friends.map((p) => (
            <button key={p} className="tap" onClick={() => sent(p, p)}>
              <span className="pic"><img src={person(p).photo} alt="" />{done === p && <i>✓</i>}</span>
              <span>{firstName(p)}<br />{person(p).last}</span>
            </button>
          ))}
        </div>
        <div className="share-apps">
          <button className="tap" onClick={() => sent('msg', them)}><img src={messages} alt="" /><span>{done === 'msg' ? 'Sent' : 'Message'}</span></button>
          <button className="tap" onClick={() => sent('mail')}><img src={mail} alt="" /><span>{done === 'mail' ? 'Sent' : 'Mail'}</span></button>
          <button className="tap" onClick={() => sent('messenger')}><img src={messenger} alt="" /><span>{done === 'messenger' ? 'Sent' : 'Messenger'}</span></button>
          <button className="tap" onClick={() => sent('whatsapp')}><img src={whatsapp} alt="" /><span>{done === 'whatsapp' ? 'Sent' : 'Whatsapp'}</span></button>
          <button className="tap" onClick={() => dismiss(() => open('betsie', { bet: betId, screen: 'story' }))}><img src={instagram} alt="" className="ig" /><span>Stories</span></button>
        </div>
        <div className="share-actions">
          <button className="tap" onClick={() => { navigator.clipboard?.writeText(`https://bet.sie/${betId}`).catch(() => undefined); setDone('copy'); }}>
            {done === 'copy' ? 'Copied Link' : 'Copy'}<img src={copyIcon} alt="" />
          </button>
          <button className="tap" onClick={() => sent('read')}>{done === 'read' ? 'Added' : 'Add to Reading List'}<img src={glasses} alt="" /></button>
        </div>
      </div>
    </div>
  );
}
