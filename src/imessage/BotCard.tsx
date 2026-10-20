// Betsie's rich messages in iMessage, as designed in Figma.
import type { ReactNode } from 'react';
import confetti from '../assets/fx/confetti.gif';
import crown from '../assets/fx/crown.webp';
import clover from '../assets/brand/clover.webp';
import { METHODS } from '../betsie/chrome';
import { firstName, person } from '../data/people';
import { answerCard, getState, useAppState } from '../data/store';
import type { Bet, Message, PersonId } from '../data/types';
import { shortDate, time12 } from '../lib/time';
import { usePhone } from '../os/context';

const U = (p: PersonId) => firstName(p).toUpperCase();
const when = (b: Bet) => `${shortDate(b.endsAt)}, ${time12(b.endsAt)}`;

function Bubble({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <div className={`bubble rich${wide ? ' wide' : ''}`}>{children}</div>;
}

export function BotCard({ m, onOpenBet }: { m: Message; onOpenBet: (id: string) => void }) {
  const { me } = usePhone();
  useAppState(); // re-render as the bet changes
  const card = m.card!;
  const b = getState().bets.find((x) => x.id === card.betId);
  if (!b) return null;
  const link = <button className="bet-link tap" onClick={() => onOpenBet(b.id)}>bet.sie/{b.id}</button>;

  switch (card.kind) {
    case 'challenge': {
      const asked = card.who!;
      const canAnswer = asked === me && b.status === 'pending' && !m.answer;
      return (
        <>
          <Bubble wide>
            <b>{U(b.by)}</b> has challenged <b>{U(b.vs)}</b>!<br /><br />
            <b>{U(b.by)}</b> bets <b>{U(b.vs)}</b> that <u>{b.text}</u><br /><br />
            Decision Method: <b>{METHODS[b.method].label}</b><br /><br />
            Bet ends on: <b>{when(b)}</b>.
          </Bubble>
          <Bubble><b>{U(asked)}</b>, do you accept this challenge?</Bubble>
          <div className="bubble rich buttons">
            <Choice label="YES" tone="red" picked={m.answer === 'yes' || (!m.answer && b.status === 'active')} faded={m.answer === 'no' || b.status === 'declined'} disabled={!canAnswer} onClick={() => answerCard(m.id, me, 'yes')} />
            <Choice label="NO" tone="gray" picked={m.answer === 'no' || (!m.answer && b.status === 'declined')} faded={m.answer === 'yes' || b.status === 'active'} disabled={!canAnswer} onClick={() => answerCard(m.id, me, 'no')} />
          </div>
          {asked === me && b.status === 'pending' && <span className="hint-under">Tap to answer</span>}
        </>
      );
    }
    case 'accepted':
      return <Bubble><b>{U(b.vs)}</b> has <b>accepted</b> the challenge!</Bubble>;
    case 'declined':
      return <Bubble><b>{U(b.vs)}</b> passed on the challenge. 🤷</Bubble>;
    case 'on':
      return (
        <Bubble wide>
          <b>YOUR BET IS ON!</b><br /><br />
          The bet: <b>{b.text}</b><br /><br />
          Decision Method: <b>{METHODS[b.method].label}</b><br /><br />
          Bet ends on: <b>{when(b)}</b>.<br /><br />
          {link}
        </Bubble>
      );
    case 'stakes-ask':
      return (
        <>
          <Bubble>Your bet is on!<br />Care to make things interesting?<br />Let’s set some <b>STAKES</b>?</Bubble>
          {!(b.stakes[b.by] && b.stakes[b.vs]) && b.status === 'active' && (
            <div className="bubble rich buttons"><Choice label="SET THE STAKES" tone="red" onClick={() => onOpenBet(b.id)} /></div>
          )}
        </>
      );
    case 'stakes':
      return (
        <Bubble wide>
          <b>The STAKES are set!</b>
          <ul>
            <li>If <b>{firstName(b.by)} wins</b>, {firstName(b.vs)} will <u>{b.stakes[b.vs]}</u></li>
            <li>If <b>{firstName(b.vs)} wins</b>, {firstName(b.by)} will <u>{b.stakes[b.by]}</u></li>
          </ul>
        </Bubble>
      );
    case 'over': {
      const canVote = b.status === 'voting' && (b.by === me || b.vs === me) && !b.votes[me];
      return (
        <>
          <Bubble wide>
            <b>YOUR BET IS OVER!</b><br /><br />
            The bet: <b>{b.text}</b><br /><br />
            Decision Method: <b>{METHODS[b.method].label}</b>
            {(b.stakes[b.by] || b.stakes[b.vs]) && <><br /><br />The stakes:<ul>
              {b.stakes[b.vs] && <li>If <b>{firstName(b.by)} wins</b>, {firstName(b.vs)} will <u>{b.stakes[b.vs]}</u></li>}
              {b.stakes[b.by] && <li>If <b>{firstName(b.vs)} wins</b>, {firstName(b.by)} will <u>{b.stakes[b.by]}</u></li>}
            </ul></>}
            <br />{link}
          </Bubble>
          <Bubble><b>{U(card.who || b.by)}, WHO WON THE BET?</b></Bubble>
          <div className="bubble rich buttons">
            {[b.by, b.vs].map((p) => (
              <Choice key={p} label={U(p)} tone={p === b.winner || b.votes[me] === p ? 'red' : 'gray'} picked={b.votes[me] === p || b.winner === p} faded={!!b.winner && b.winner !== p} disabled={!canVote} onClick={() => answerCard(m.id, me, p)} />
            ))}
          </div>
        </>
      );
    }
    case 'declared':
      return <Bubble><b>{U(card.who!)}</b> declared <b>{U(b.winner!)}</b> is the winner!</Bubble>;
    case 'winner':
      return (
        <>
          <Bubble><b>{U(b.winner!)} IS THE WINNER!</b></Bubble>
          <button className="win-card tap" onClick={() => onOpenBet(b.id)}>
            <img className="wc-confetti" src={confetti} alt="" />
            <span className="wc-photo"><img src={person(b.winner!).photo} alt="" /></span>
            <img className="wc-crown" src={crown} alt="" />
            <span className="wc-bar">{b.winner === me ? 'I NAILED IT!!' : `${U(b.winner!)} NAILED IT!`}</span>
            <span className="wc-open">Open in Betsie ›</span>
          </button>
        </>
      );
    case 'shared':
      return (
        <button className="share-card tap" onClick={() => onOpenBet(b.id)}>
          <span className="sc-head"><img src={clover} alt="" />Betsie</span>
          <b>{b.status === 'settled' ? (b.winner === card.who ? `${firstName(card.who!)} nailed it!` : `${firstName(b.winner!)} was right!`) : 'A bet on Betsie'}</b>
          <span className="sc-text">{b.text}</span>
          <span className="sc-open">bet.sie/{b.id}</span>
        </button>
      );
    default:
      return null;
  }
}

function Choice({ label, tone, picked, faded, disabled, onClick }: { label: string; tone: 'red' | 'gray'; picked?: boolean; faded?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button className={`choice ${tone} tap${picked ? ' picked' : ''}${faded ? ' faded' : ''}`} disabled={disabled} onClick={onClick}>{label}</button>
  );
}
