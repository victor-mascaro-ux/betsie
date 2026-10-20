// Making a bet: Start a Bet → Decision Method → Review your bet.
import { useEffect, useMemo, useRef, useState } from 'react';
import calendarIcon from '../assets/icons/calendar.webp';
import friendIcon from '../assets/icons/friend.svg';
import privateIcon from '../assets/icons/private.webp';
import searchIcon from '../assets/icons/search.svg';
import clover from '../assets/brand/clover.webp';
import { firstName, friendsOf, fullName, person } from '../data/people';
import type { Draft } from '../data/store';
import type { Method, PersonId, Visibility } from '../data/types';
import { monthYear, shortDate, time12 } from '../lib/time';
import { usePhone } from '../os/context';
import { BetCard, Card, METHODS, Photo, Tag, TitleBar, VISIBILITY } from './chrome';
import { Overlay } from './overlay';

type Props = { draft: Draft; setDraft: (d: Draft) => void; onBack?: () => void };

const PLACEHOLDERS = [
  'Susan will make her third trip to the coffee pot before noon.',
  'In n Out won’t change their menu in the next 10 years.',
  'This meeting is going to go a minimum of 15 minutes over time.',
];

export function NewBet({ draft, setDraft, onBack }: Props) {
  const { me } = usePhone();
  const [picking, setPicking] = useState(false);
  const [dating, setDating] = useState<'date' | 'time' | null>(null);
  const placeholder = useMemo(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)], []);
  const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p });

  return (
    <div className="screen new-bet">
      <TitleBar title="START A BET" onBack={onBack} />
      <Card className="start-card">
        <div className="i-bet">
          <img className="clover" src={clover} alt="" />
          <span className="lead">I <b>BET</b></span>
          <button className={`friend-chip tap${draft.vs ? '' : ' empty'}${picking ? ' open' : ''}`} onClick={() => setPicking((v) => !v)}>
            {draft.vs ? <Photo id={draft.vs} size={25} ring={1} /> : <img src={friendIcon} alt="" className="ph" />}
            <span>{draft.vs ? `${firstName(draft.vs)} ${person(draft.vs).last}` : 'Select friend'}</span>
          </button>
          <span className="lead">that...</span>
        </div>
        <textarea
          className="field bet-text"
          data-sample="bet"
          enterKeyHint="done"
          value={draft.text}
          placeholder={placeholder}
          rows={3}
          maxLength={140}
          onChange={(e) => set({ text: e.target.value.replace(/\n/g, ' ') })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
        />
        {picking && <FriendPicker me={me} selected={draft.vs} onPick={(vs) => { set({ vs }); setPicking(false); }} />}
      </Card>

      <Card className="when-card">
        <div className="when-row">
          <img src={calendarIcon} alt="" className="cal" />
          <span>Bet ends on:</span>
          <button className="chip tap" onClick={() => setDating('date')}>{shortDate(draft.endsAt)}</button>
          <button className="chip tap" onClick={() => setDating('time')}>{time12(draft.endsAt)}</button>
        </div>
        <hr />
        <div className="who-row">
          <img src={privateIcon} alt="" className="eye" />
          <div className="who-text">
            <span>Who can see this?</span>
            <VisibilityMenu value={draft.visibility} onChange={(visibility) => set({ visibility })} />
          </div>
        </div>
      </Card>

      {dating && <DatePicker value={draft.endsAt} focus={dating} onChange={(endsAt) => set({ endsAt })} onClose={() => setDating(null)} />}
    </div>
  );
}

const VIS_OPTIONS: { v: Visibility; icon: string; hint: string }[] = [
  { v: 'everyone', icon: '🌍', hint: 'Anyone on Betsie' },
  { v: 'friends', icon: '👯', hint: 'Your friends and theirs' },
  { v: 'private', icon: '🔒', hint: 'Only you two' },
];

/** The answer sits on the right; tapping it opens a drop-up menu anchored to it. */
function VisibilityMenu({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [open]);
  return (
    <div className="vis" ref={ref}>
      <button className={`link vis-value tap${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} key={value}>
        {VISIBILITY[value]}
        <svg className="chev" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 5 5 1l4 4" /></svg>
      </button>
      {open && (
        <div className="dropup" role="menu">
          {VIS_OPTIONS.map((o, i) => (
            <button key={o.v} role="menuitemradio" aria-checked={o.v === value} className={`tap${o.v === value ? ' on' : ''}`} style={{ animationDelay: `${(VIS_OPTIONS.length - 1 - i) * 30}ms` }} onClick={() => { onChange(o.v); setOpen(false); }}>
              <span className="dd-icon">{o.icon}</span>
              <span className="dd-text"><b>{VISIBILITY[o.v]}</b><small>{o.hint}</small></span>
              <span className="dd-check">{o.v === value ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FriendPicker({ me, selected, onPick }: { me: PersonId; selected: PersonId | null; onPick: (p: PersonId) => void }) {
  const [q, setQ] = useState('');
  const list = friendsOf(me).filter((p) => fullName(p).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="picker">
      <label className="search"><img src={searchIcon} alt="" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Contacts" data-sample="search" enterKeyHint="search" /></label>
      <div className="picker-list">
        {list.map((p, i) => (
          <div key={p} className="picker-row" style={{ animationDelay: `${i * 25}ms` }}>
            <Photo id={p} size={50} ring={1} />
            <span className="pr-name"><b>{fullName(p)}</b><small>{person(p).mutual} mutual friend{person(p).mutual === 1 ? '' : 's'}</small></span>
            <button className={`select tap${selected === p ? ' on' : ''}`} onClick={() => onPick(p)}>{selected === p ? 'PICKED' : 'SELECT'}</button>
          </div>
        ))}
        {!list.length && <p className="none">No one by that name.</p>}
      </div>
    </div>
  );
}

const WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function DatePicker({ value, focus, onChange, onClose }: { value: number; focus: 'date' | 'time'; onChange: (t: number) => void; onClose: () => void }) {
  const d = new Date(value);
  const [month, setMonth] = useState(new Date(d.getFullYear(), d.getMonth(), 1));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = useMemo(() => {
    const first = month.getDay(), total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }, [month]);
  const pick = (day: number) => { const n = new Date(value); n.setFullYear(month.getFullYear(), month.getMonth(), day); onChange(n.getTime()); };
  const h = d.getHours(), m = d.getMinutes();
  const setTime = (hh: number, mm: number) => { const n = new Date(value); n.setHours(hh, mm, 0, 0); onChange(n.getTime()); };
  const hours12 = h % 12 || 12;
  const timeRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focus === 'time') timeRef.current?.scrollIntoView({ block: 'nearest' }); }, [focus]);

  return (
    <Overlay>
      <div className="dim" onClick={onClose}>
        <div className="calendar" onClick={(e) => e.stopPropagation()}>
          <div className="cal-head">
            <b>{monthYear(month.getTime())} <span>›</span></b>
            <span className="cal-nav">
              <button className="tap" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
              <button className="tap" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
            </span>
          </div>
          <div className="cal-grid">
            {WEEK.map((w) => <small key={w}>{w}</small>)}
            {days.map((day, i) => {
              if (!day) return <span key={`x${i}`} />;
              const t = new Date(month.getFullYear(), month.getMonth(), day);
              const past = t < today;
              const sel = t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && day === d.getDate();
              const isToday = t.getTime() === today.getTime();
              return (
                <button key={i} disabled={past} className={`tap${sel ? ' sel' : ''}${isToday ? ' today' : ''}`} onClick={() => pick(day)}>{day}</button>
              );
            })}
          </div>
          <div className="cal-time" ref={timeRef}>
            <span>Ends</span>
            <span className="time-box">
              <select value={hours12} onChange={(e) => setTime((+e.target.value % 12) + (h >= 12 ? 12 : 0), m)} aria-label="Hour">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              :
              <select value={m - (m % 5)} onChange={(e) => setTime(h, +e.target.value)} aria-label="Minutes">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((x) => <option key={x} value={x}>{String(x).padStart(2, '0')}</option>)}
              </select>
            </span>
            <span className="ampm">
              <button className={h < 12 ? 'on' : ''} onClick={() => h >= 12 && setTime(h - 12, m)}>AM</button>
              <button className={h >= 12 ? 'on' : ''} onClick={() => h < 12 && setTime(h + 12, m)}>PM</button>
            </span>
          </div>
          <button className="cal-done tap" onClick={onClose}>Done</button>
        </div>
      </div>
    </Overlay>
  );
}

export function Method({ draft, setDraft, onBack, onNext }: Props & { onNext: () => void }) {
  const [chosen, setChosen] = useState<Method | null>(null);
  const choose = (m: Method) => {
    setChosen(m);
    setDraft({ ...draft, method: m });
    setTimeout(onNext, 280);
  };
  return (
    <div className="screen method">
      <TitleBar title="DECISION METHOD" onBack={onBack} />
      <div className="methods">
        {(Object.keys(METHODS) as Method[]).map((m, i) => (
          <button key={m} className={`method-opt tap${chosen && chosen !== m ? ' faded' : ''}${chosen === m ? ' picked' : ''}${!chosen && draft.method === m ? ' current' : ''}`} style={{ animationDelay: `${i * 50}ms` }} onClick={() => choose(m)}>
            <span className="method-circle"><img src={METHODS[m].icon} alt="" /></span>
            <span className="method-label">{METHODS[m].label.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <p className="method-help">{HELP[chosen || draft.method]}</p>
      <div className="tagged">
        <Tag>THE BET</Tag>
        <BetCard bet={draft} compact />
      </div>
    </div>
  );
}

const HELP: Record<Method, string> = {
  consensus: 'You both say who won. If one of you concedes, it’s settled.',
  moderator: 'A friend you both trust makes the call.',
  robots: 'Betsie’s robots look it up and decide.',
  crowd: 'Your friends vote. Majority wins.',
};

export function Review({ draft, onBack, onSend }: { draft: Draft; onBack: () => void; onSend: () => void }) {
  const [sending, setSending] = useState(false);
  const go = () => { setSending(true); setTimeout(onSend, 420); };
  return (
    <div className="screen review">
      <TitleBar title="REVIEW YOUR BET" onBack={onBack} />
      <div className="tagged">
        <Tag>THE BET</Tag>
        <div className={sending ? 'fly' : ''}><BetCard bet={draft} /></div>
      </div>
      <p className="against">Against <Photo id={draft.vs!} size={28} ring={1} /> <b>{draft.vs ? fullName(draft.vs) : ''}</b></p>
      <div className="send-row">
        <p>Send the bet to {draft.vs ? firstName(draft.vs) : 'your friend'} right away!</p>
        <button className={`bet-btn tap${sending ? ' sent' : ''}`} onClick={go} disabled={sending}>{sending ? 'SENT!' : 'BET!'}</button>
        <small>You can set the stakes once it’s sent.</small>
      </div>
    </div>
  );
}
