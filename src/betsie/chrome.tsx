// Betsie's shared UI, built to the Figma specs.
import type { ReactNode } from 'react';
import backIcon from '../assets/icons/back.svg';
import bellIcon from '../assets/icons/bell.svg';
import calendarIcon from '../assets/icons/calendar.webp';
import privateIcon from '../assets/icons/private.webp';
import settingsIcon from '../assets/icons/settings.svg';
import tabbar from '../assets/icons/tabbar.svg';
import clover from '../assets/brand/clover.webp';
import wordmark from '../assets/brand/wordmark.webp';
import crown from '../assets/fx/crown.webp';
import consensusIcon from '../assets/decide/consensus.webp';
import moderatorIcon from '../assets/decide/moderator.webp';
import robotsIcon from '../assets/decide/robots.webp';
import crowdIcon from '../assets/decide/crowd.webp';
import { firstName, person } from '../data/people';
import { friendsRank, headToHead, record, winRate, winsAgainst } from '../data/stats';
import type { Bet, Method, PersonId, State, Visibility } from '../data/types';
import { countdown, shortDate, time12 } from '../lib/time';

export const METHODS: Record<Method, { label: string; icon: string }> = {
  consensus: { label: 'Consensus', icon: consensusIcon },
  moderator: { label: 'Moderator', icon: moderatorIcon },
  robots: { label: 'Ask the Robots', icon: robotsIcon },
  crowd: { label: 'Crowd-Sourced', icon: crowdIcon },
};

export const VISIBILITY: Record<Visibility, string> = {
  everyone: 'Everyone, and your mom.',
  friends: 'Just our friends.',
  private: 'Just the two of us.',
};
export const VISIBILITY_SHORT: Record<Visibility, string> = { everyone: 'Everyone', friends: 'Friends', private: 'Private' };

/** Top bar: Betsie "B", bell (with unread dot), settings, your photo. */
export function Masthead({ me, unread, onBell, onMe }: { me: PersonId; unread: number; onBell: () => void; onMe: () => void }) {
  return (
    <div className="masthead">
      <span className="b-logo"><i style={{ backgroundImage: `url(${wordmark})` }} /></span>
      <button className="mh-icon tap" onClick={onBell} aria-label="Notifications">
        <img src={bellIcon} alt="" />
        {unread > 0 && <span className="dot">{unread}</span>}
      </button>
      <button className="mh-icon tap" onClick={onMe} aria-label="Settings"><img src={settingsIcon} alt="" /></button>
      <button className="mh-me tap" onClick={onMe} aria-label="Your book of bets"><Photo id={me} size={30} ring={1} /></button>
    </div>
  );
}

/** The red title bar: "START A BET". */
export function TitleBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="titlebar">
      {onBack && <button className="tb-back tap" onClick={onBack} aria-label="Back"><img src={backIcon} alt="" /></button>}
      <h1 key={title}>{title}</h1>
    </div>
  );
}

/** `glyph`: a white icon that sits on the red circle (share); otherwise the icon is the whole button. */
export type CenterAction = { icon: string; label: string; onClick: () => void; disabled?: boolean; badge?: number; glyph?: boolean };

/** Bottom bar: your book, the big centre action, friends. */
export function TabBar({ center, onBook, onFriends }: { center: CenterAction; onBook: () => void; onFriends: () => void }) {
  return (
    <div className="tabbar">
      <img className="tb-shape" src={tabbar} alt="" />
      <button className="tb-left tap" onClick={onBook} aria-label="Your book of bets" />
      <button className="tb-right tap" onClick={onFriends} aria-label="Friends" />
      <button className={`tb-center tap${center.disabled ? ' off' : ''}`} onClick={center.disabled ? undefined : center.onClick} aria-label={center.label} key={center.icon}>
        {center.glyph ? <span className="tb-round"><img src={center.icon} alt="" /></span> : <img src={center.icon} alt="" />}
        {!!center.badge && <span className="tb-badge">{center.badge}</span>}
      </button>
    </div>
  );
}

export function Photo({ id, size, ring = 1, crowned, className = '' }: { id: PersonId; size: number; ring?: number; crowned?: boolean; className?: string }) {
  return (
    <span className={`photo ${className}`} style={{ width: size, height: size }}>
      <img src={person(id).photo} alt={firstName(id)} style={{ boxShadow: `inset 0 0 0 ${ring}px var(--accent)` }} />
      <i style={{ boxShadow: `inset 0 0 0 ${ring}px var(--accent)` }} />
      {crowned && <img className="crown" src={crown} alt="" style={{ width: size * 0.72, left: size * 0.5, top: -size * 0.42 }} />}
    </span>
  );
}

/** The "THE BET" / "THE STAKES" tab hanging off a card. */
export function Tag({ children }: { children: ReactNode }) {
  return <div className="tag">{children}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

/** The bet itself: clover + text, then method, end date and who can see it. */
export function BetCard({ bet, compact }: { bet: Pick<Bet, 'text' | 'method' | 'endsAt' | 'visibility'>; compact?: boolean }) {
  return (
    <Card className="bet-card">
      <div className="bc-text"><img src={clover} alt="" /><p>{bet.text}</p></div>
      {!compact && (
        <>
          <hr />
          <div className="bc-meta">
            <div className="bc-method">
              <span className="method-ring"><img src={METHODS[bet.method].icon} alt="" /></span>
              <span>Decision method:<br /><b>{METHODS[bet.method].label}</b></span>
            </div>
            <div className="bc-when">
              <span><img src={calendarIcon} alt="" />{shortDate(bet.endsAt)}, {time12(bet.endsAt)}</span>
              <span><img src={privateIcon} alt="" className="eye" />{VISIBILITY[bet.visibility]}</span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

/** "THE STAKES": what each person does if they lose. */
export function StakesRows({ bet, editable, me, onEdit }: { bet: Bet; editable?: boolean; me?: PersonId; onEdit?: (loser: PersonId, text: string) => void }) {
  const rows: PersonId[] = [bet.vs, bet.by];
  return (
    <div className="stakes">
      {rows.map((p, i) => (
        <div key={p} className="stake-row">
          {i > 0 && <hr />}
          <div className="stake-who">
            <Photo id={p === bet.vs ? bet.by : bet.vs} size={50} crowned />
            <span className="winner-chip">WINNER</span>
          </div>
          <div className="stake-what">
            <b>{firstName(p)} <span>will...</span></b>
            {editable && onEdit ? (
              <StakeField value={bet.stakes[p] || ''} them={firstName(p === bet.vs ? bet.by : bet.vs)} placeholder={p === me ? 'what you’ll do if you lose' : `what ${firstName(p)} will do`} onSave={(t) => onEdit(p, t)} />
            ) : (
              <p className={bet.stakes[p] ? '' : 'none'}>{bet.stakes[p] || 'Not set yet.'}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StakeField({ value, them, placeholder, onSave }: { value: string; them: string; placeholder: string; onSave: (t: string) => void }) {
  return (
    <textarea
      className="field stake-field"
      data-sample="stake"
      enterKeyHint="done"
      data-them={them}
      defaultValue={value}
      placeholder={placeholder}
      rows={2}
      onBlur={(e) => { if (e.target.value.trim() !== value) onSave(e.target.value); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
    />
  );
}

/** Yellow countdown tiles: "23 : 59". */
export function Countdown({ ms }: { ms: number }) {
  const [a, b] = countdown(ms);
  return (
    <div className="countdown">
      <span>{a}</span><i>:</i><span>{b}</span>
    </div>
  );
}

/** Head-to-head header: both photos, records, VS and the series score. */
export function VsHeader({ s, a, b, winner, me }: { s: State; a: PersonId; b: PersonId; winner?: PersonId; me: PersonId }) {
  const ra = record(s, a), rb = record(s, b);
  const h = headToHead(s, a, b);
  const pct = winsAgainst(s, a, b);
  return (
    <div className="vs">
      <div className="vs-row">
        <div className="vs-side"><Photo id={a} size={86} ring={3} crowned={winner === a} /><small><b>{ra.w}</b> - {ra.l}</small></div>
        <span className="vs-word">VS</span>
        <div className="vs-side"><Photo id={b} size={86} ring={3} crowned={winner === b} /><small><b>{rb.w}</b> - {rb.l}</small></div>
        <svg className="vs-lines" viewBox="0 0 430 120" aria-hidden="true"><path d="M126 46 L 182 86 M 304 44 L 248 86" /></svg>
        <span className="vs-score">{h.a} - {h.b}</span>
      </div>
      <p className="vs-line">
        {a === me ? 'You' : <b>{firstName(a)}</b>} win{a === me ? '' : 's'} against <b>{firstName(b)}</b> <em>{pct}%</em> of the time.
      </p>
    </div>
  );
}

/** Win rate, friends rank and global rank pills. */
export function StatPills({ s, id, small }: { s: State; id: PersonId; small?: boolean }) {
  return (
    <div className={`pills${small ? ' small' : ''}`}>
      <div><span style={{ background: 'var(--red)' }}>{winRate(s, id)}%</span><small>Win rate</small></div>
      <div><span style={{ background: 'var(--red-80)' }}>#{friendsRank(s, id)}</span><small>Friends</small></div>
      <div><span style={{ background: 'var(--red-60)' }}>#{person(id).global}</span><small>Global</small></div>
    </div>
  );
}
