// "Your Book of Bets": your record and every bet, active and completed.
import { useState } from 'react';
import calendarIcon from '../assets/icons/calendar.webp';
import privateIcon from '../assets/icons/private.webp';
import { firstName, fullName, person } from '../data/people';
import { useAppState } from '../data/store';
import { betsOf, isOpen, opponent, record, unreadComments } from '../data/stats';
import type { Bet, PersonId } from '../data/types';
import { dayMonth, remaining, useNow } from '../lib/time';
import { usePhone } from '../os/context';
import type { Nav } from './BetsieApp';
import { Photo, StatPills, TitleBar, VISIBILITY_SHORT } from './chrome';

export function Book({ nav }: { nav: Nav }) {
  const { me } = usePhone();
  const s = useAppState();
  const mine = betsOf(s, me).sort((a, b) => b.createdAt - a.createdAt);
  const active = mine.filter(isOpen);
  const done = mine.filter((b) => !isOpen(b));
  const [tab, setTab] = useState<'active' | 'completed'>(active.length ? 'active' : 'completed');
  const r = record(s, me);
  const list = tab === 'active' ? active : done;

  return (
    <div className="screen book">
      <TitleBar title="YOUR BOOK OF BETS" />
      <div className="profile">
        <div className="pf-photo">
          <Photo id={me} size={141} ring={3} className="big-shadow" />
          <span className="pf-record"><b>{r.w}</b> - {r.l}</span>
        </div>
        <div className="pf-info">
          <h2>{fullName(me)}</h2>
          <span className="handle">{person(me).handle}</span>
          <StatPills s={s} id={me} />
        </div>
      </div>
      <div className="tabs">
        <button className={`tab tap${tab === 'active' ? ' on' : ''}`} onClick={() => setTab('active')}>ACTIVE ({active.length})</button>
        <button className={`tab tap${tab === 'completed' ? ' on' : ''}`} onClick={() => setTab('completed')}>COMPLETED ({done.length})</button>
      </div>
      <div className="book-list" key={tab}>
        {list.length === 0 && <p className="empty">{tab === 'active' ? 'No bets in play. Tap + to start one.' : 'Nothing settled yet.'}</p>}
        {list.map((b, i) => <BookRow key={b.id} bet={b} me={me} i={i} onOpen={() => nav.push({ s: 'bet', id: b.id })} />)}
      </div>
    </div>
  );
}

function BookRow({ bet, me, i, onOpen }: { bet: Bet; me: PersonId; i: number; onOpen: () => void }) {
  const now = useNow(30000);
  const them = opponent(bet, me);
  const unread = unreadComments(bet, me);
  const status =
    bet.status === 'pending' ? (bet.vs === me ? 'Your call: accept?' : `Waiting for ${firstName(them)}`)
      : bet.status === 'active' ? `${remaining(bet.endsAt - now)} left`
        : bet.status === 'voting' ? (bet.votes[me] ? 'Waiting on the vote' : 'Who won? Vote now')
          : bet.status === 'declined' ? 'Declined' : bet.status === 'expired' ? 'Expired' : null;
  return (
    <button className="book-row tap" onClick={onOpen} style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
      <span className="br-top">
        <span className="br-dates"><img src={calendarIcon} alt="" />{dayMonth(bet.createdAt)} / <em>{dayMonth(bet.endsAt)}</em></span>
        <span className="br-vis"><img src={privateIcon} alt="" />{VISIBILITY_SHORT[bet.visibility]}</span>
      </span>
      <span className="br-main">
        <span className="br-vs">
          <Photo id={me} size={37} ring={2} crowned={bet.winner === me} />
          <i>VS</i>
          <Photo id={them} size={37} ring={2} crowned={bet.winner === them} />
        </span>
        <span className="br-text">{bet.text}</span>
      </span>
      {status && <span className={`br-status${bet.status === 'pending' && bet.vs === me ? ' hot' : ''}${bet.status === 'voting' && !bet.votes[me] ? ' hot' : ''}`}>{status}</span>}
      {unread > 0 && <span className="br-badge">{unread}</span>}
    </button>
  );
}
