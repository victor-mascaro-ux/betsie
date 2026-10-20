// One bet, as its state and the viewer dictate.
import { useEffect, useState } from 'react';
import clockIcon from '../assets/icons/clock.svg';
import commentIcon from '../assets/icons/comment.webp';
import stickerIcon from '../assets/icons/sticker.svg';
import clover from '../assets/brand/clover.webp';
import { firstName, person } from '../data/people';
import { acceptBet, declineBet, setStake, useAppState, vote } from '../data/store';
import { opponent } from '../data/stats';
import type { Bet, PersonId } from '../data/types';
import { remaining, useNow } from '../lib/time';
import { usePhone } from '../os/context';
import type { Nav } from './BetsieApp';
import { BetCard, Card, Countdown, METHODS, Photo, StakesRows, StatPills, Tag, TitleBar, VsHeader } from './chrome';
import { Celebration, celebrated } from './Celebration';

export function BetView({ id, nav }: { id: string; nav: Nav }) {
  const { me } = usePhone();
  const s = useAppState();
  const now = useNow(1000);
  const bet = s.bets.find((b) => b.id === id);
  if (!bet) return <div className="screen"><TitleBar title="BET NOT FOUND" onBack={nav.pop} /></div>;
  const them = opponent(bet, me);
  const isMine = bet.by === me;
  const edit = (loser: PersonId, text: string) => setStake(bet.id, loser, text, me);

  if (bet.status === 'settled') return <Result bet={bet} nav={nav} />;

  if (bet.status === 'voting') return <Voting bet={bet} nav={nav} />;

  if (bet.status === 'declined' || bet.status === 'expired') {
    return (
      <div className="screen">
        <TitleBar title={bet.status === 'declined' ? 'BET DECLINED' : 'BET EXPIRED'} onBack={nav.pop} />
        <p className="status-note">
          {bet.status === 'declined'
            ? (isMine ? `${firstName(them)} passed on this one. Maybe next time.` : 'You passed on this one.')
            : `${isMine ? firstName(them) : 'You'} didn’t accept in time, so it was cancelled.`}
        </p>
        <div className="tagged"><Tag>THE BET</Tag><BetCard bet={bet} /></div>
      </div>
    );
  }

  if (bet.status === 'pending') {
    return (
      <div className="screen pending">
        <TitleBar title="YOUR BET IS PENDING" onBack={nav.pop} />
        <div className="clock-block">
          <Countdown ms={bet.acceptBy - now} />
          <p>{isMine ? <><b>{firstName(them)}</b> has <b>24 hours</b> to accept.</> : <>You have <b>{remaining(bet.acceptBy - now).replace(/^0/, '')}</b> to accept.</>}</p>
          <small>If the clock runs out before the bet is accepted,<br />it will automatically be cancelled.</small>
        </div>
        {!isMine && (
          <div className="answer-row">
            <button className="pill gray tap" onClick={() => declineBet(bet.id, me)}>DECLINE</button>
            <button className="pill tap pulse" onClick={() => acceptBet(bet.id, me)}>ACCEPT</button>
          </div>
        )}
        <div className="tagged"><Tag>THE BET</Tag><BetCard bet={bet} /></div>
        <p className="by-line"><Photo id={bet.by} size={22} ring={1} /> {isMine ? 'You' : firstName(bet.by)} bet {isMine ? firstName(them) : 'you'}</p>
        <div className="tagged"><Tag>THE STAKES</Tag><Card><StakesRows bet={bet} editable me={me} onEdit={edit} /></Card></div>
      </div>
    );
  }

  // Active.
  return (
    <div className="screen active">
      <TitleBar title="YOUR BET IS ON!" onBack={nav.pop} />
      <VsHeader s={s} a={me} b={them} me={me} />
      <div className="tagged">
        <Tag>THE BET</Tag>
        <span className="time-left"><img src={clockIcon} alt="" />{remaining(bet.endsAt - now)}</span>
        <BetCard bet={bet} />
      </div>
      <div className="tagged"><Tag>THE STAKES</Tag><Card><StakesRows bet={bet} editable me={me} onEdit={edit} /></Card></div>
    </div>
  );
}

function Voting({ bet, nav }: { bet: Bet; nav: Nav }) {
  const { me } = usePhone();
  const them = opponent(bet, me);
  const mine = bet.votes[me];
  const theirs = bet.votes[them];
  const people: PersonId[] = [bet.by, bet.vs];
  const consensus = bet.method === 'consensus';
  return (
    <div className="screen voting">
      <TitleBar title="YOUR BET IS OVER" onBack={nav.pop} />
      <div className="who-won">
        <span className="method-ring"><img src={METHODS[bet.method].icon} alt="" /></span>
        <h2>WHO WON THE BET?</h2>
      </div>
      {consensus ? (
        <div className="candidates">
          {people.map((p) => (
            <div key={p} className={`candidate${mine === p ? ' mine' : ''}${mine && mine !== p ? ' faded' : ''}`}>
              <Photo id={p} size={98} ring={3} crowned={mine === p} />
              <button className="pill tap" onClick={() => vote(bet.id, me, p)}>{firstName(p).toUpperCase()}</button>
              {theirs === p && <span className="their-vote" title={`${firstName(them)}’s pick`}><img src={person(them).photo} alt="" /></span>}
            </div>
          ))}
        </div>
      ) : (
        <p className="status-note">{bet.method === 'robots' ? 'The robots are looking it up…' : bet.method === 'moderator' ? 'Waiting for the moderator’s call…' : 'Your friends are voting…'}</p>
      )}
      {consensus && (
        <p className="vote-status">
          {!mine && !theirs && 'Pick the winner. Be honest. 😇'}
          {mine && !theirs && `Waiting for ${firstName(them)}…`}
          {!mine && theirs && <>{firstName(them)}’s vote: <b>{theirs === them ? firstName(them) : 'you'}</b>. Do you agree?</>}
          {mine && theirs && mine !== theirs && <>You don’t agree! Talk it out, then vote again.</>}
        </p>
      )}
      <div className="tagged"><Tag>THE BET</Tag><BetCard bet={bet} compact /></div>
      <div className="tagged"><Tag>THE STAKES</Tag><Card><StakesRows bet={bet} /></Card></div>
    </div>
  );
}

function Result({ bet, nav }: { bet: Bet; nav: Nav }) {
  const { me } = usePhone();
  const s = useAppState();
  const winner = bet.winner!;
  const loser = opponent(bet, winner);
  const won = winner === me;
  const [party, setParty] = useState(() => !celebrated(me, bet.id));
  const last = bet.comments[bet.comments.length - 1];
  useEffect(() => { nav.setCenter(null); }, [party]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen result">
      <TitleBar title={won ? 'NAILED IT!' : `${firstName(winner).toUpperCase()} WAS RIGHT!`} onBack={nav.pop} />
      <Card className="result-card">
        <div className="bc-text"><img src={clover} alt="" /><p>{bet.text}</p></div>
        <hr />
        <VsHeader s={s} a={winner} b={loser} winner={winner} me={me} />
        <StatPills s={s} id={winner} small />
        <hr />
        <div className="owes">
          <Photo id={loser} size={40} ring={1} />
          <p><b>{firstName(loser)}</b> will...<br />{bet.stakes[loser] || 'owe bragging rights. No stakes were set.'}</p>
        </div>
        {last && (
          <div className="last-comment">
            <Photo id={last.by} size={30} ring={1} />
            <p><b>{firstName(last.by)}</b><br />{last.text}</p>
            {last.sticker && <img className="sticker" src={last.sticker} alt="" />}
          </div>
        )}
      </Card>
      <div className="result-actions">
        <button className="round-btn tap" onClick={nav.openComments} aria-label="Comment"><img src={commentIcon} alt="" /></button>
        <button className="round-btn sticker tap" onClick={nav.openComments} aria-label="Send a sticker"><img src={stickerIcon} alt="" /></button>
      </div>
      {party && <Celebration bet={bet} won={won} onDone={() => setParty(false)} />}
    </div>
  );
}
