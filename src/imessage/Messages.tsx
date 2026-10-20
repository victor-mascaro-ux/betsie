// Messages: conversations between the two phones, plus Betsie's group thread
// where the bot reports on bets made from iMessage. Betsie also runs inside
// iMessage as an app (the clover next to "I bet…", or the + drawer).
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type TextareaHTMLAttributes } from 'react';
import backIcon from '../assets/imessage/back.svg';
import chevron from '../assets/imessage/chevron.svg';
import facetime from '../assets/imessage/facetime.svg';
import clover from '../assets/brand/clover.webp';
import { BetsieApp } from '../betsie/BetsieApp';
import { firstName, person } from '../data/people';
import { markNoticesRead, markThreadSeen, sendMessage, useAppState, type Draft } from '../data/store';
import { betsieThread, isBetsieThread, pairThread, threadPeople } from '../data/threads';
import type { Message, PersonId } from '../data/types';
import { ago, chatStamp, useNow } from '../lib/time';
import { usePhone, type Link } from '../os/context';
import { reportUi } from '../lib/ui';
import { BotCard } from './BotCard';
import '../styles/imessage.css';

const BET_RE = /\bI bet\b\s*(?:that\s+)?(.+)/i;
export const betFromText = (t: string) => {
  const m = t.match(BET_RE);
  if (!m) return null;
  const s = m[1].trim().replace(/^[a-z]/, (c) => c.toUpperCase());
  return /[.!?]$/.test(s) ? s : `${s}.`;
};

/** The message field grows with what you type (up to five lines, then it scrolls). */
function GrowingField(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 22 * 5 + 14)}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
}

export function Messages({ link, active }: { link?: Link; active: boolean }) {
  const { me } = usePhone();
  const other: PersonId = me === 'maxine' ? 'sylvia' : 'maxine';
  const [thread, setThread] = useState<string | null>(null);
  const [dir, setDir] = useState<'in' | 'out'>('in');

  useEffect(() => { if (link?.thread) { setDir('in'); setThread(link.thread); } }, [link?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reportUi(me, { thread }); }, [me, thread]);

  return (
    <div className="imsg">
      {thread
        ? <Thread key={thread} thread={thread} active={active} dir={dir} onBack={() => { setDir('out'); setThread(null); }} onOpenThread={(t) => setThread(t)} />
        : <ThreadList other={other} dir={dir} onOpen={(t) => { setDir('in'); setThread(t); }} />}
    </div>
  );
}

function ThreadList({ other, dir, onOpen }: { other: PersonId; dir: 'in' | 'out'; onOpen: (t: string) => void }) {
  const { me } = usePhone();
  const s = useAppState();
  const now = useNow(30000);
  const threads = useMemo(() => {
    const ids = new Set<string>([pairThread(me, other)]);
    for (const m of s.messages) if (threadPeople(m.thread).includes(me)) ids.add(m.thread);
    return [...ids].map((id) => {
      const msgs = s.messages.filter((m) => m.thread === id);
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => m.from !== me && m.at > (s.seen[me]?.[id] || 0)).length;
      return { id, last, unread };
    }).sort((a, b) => (b.last?.at || 0) - (a.last?.at || 0));
  }, [s.messages, s.seen, me, other]);

  return (
    <div className={`thread-list ${dir === 'out' ? 'back' : ''}`}>
      <div className="tl-head"><span className="tl-edit">Edit</span><h1>Messages</h1><label className="tl-search">🔍︎ <input placeholder="Search" readOnly /></label></div>
      {threads.map(({ id, last, unread }, i) => {
        const them = threadPeople(id).filter((p) => p !== me);
        const group = isBetsieThread(id);
        return (
          <button key={id} className="tl-row tap" data-thread={id} style={{ animationDelay: `${i * 40}ms` }} onClick={() => onOpen(id)}>
            {unread > 0 ? <i className="tl-dot" /> : <i className="tl-dot off" />}
            <Avatars ids={them} group={group} size={52} />
            <span className="tl-text">
              <span className="tl-top"><b>{group ? `Betsie: ${firstName(threadPeople(id)[0])} vs. ${firstName(threadPeople(id)[1])}` : firstName(them[0])}</b><small>{last ? ago(last.at, now) : ''}</small></span>
              <span className="tl-preview">{last ? preview(last, me) : 'Say hi 👋'}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const preview = (m: Message, me: PersonId) => {
  if (m.card) return m.card.kind === 'shared' ? '🍀 Shared a bet from Betsie' : `Betsie: ${CARD_PREVIEW[m.card.kind] || 'update'}`;
  return `${m.from === me ? 'You: ' : ''}${m.text}`;
};
const CARD_PREVIEW: Record<string, string> = {
  challenge: 'New challenge!', accepted: 'Challenge accepted!', declined: 'Challenge declined', on: 'Your bet is on!',
  'stakes-ask': 'Let’s set some stakes?', stakes: 'The stakes are set!', over: 'Your bet is over! Who won?', declared: 'A winner was declared',
  winner: 'We have a winner! 🏆',
};

export function Avatars({ ids, group, size }: { ids: PersonId[]; group?: boolean; size: number }) {
  if (!group) return <img className="av" src={person(ids[0]).photo} alt="" style={{ width: size, height: size }} />;
  return (
    <span className="av-group" style={{ width: size, height: size }}>
      <span className="av-clover"><img src={clover} alt="" /></span>
      {ids.slice(0, 2).map((p, i) => <img key={p} className={`av-${i}`} src={person(p).photo} alt="" />)}
    </span>
  );
}

function Thread({ thread, active, dir, onBack, onOpenThread }: { thread: string; active: boolean; dir: 'in' | 'out'; onBack: () => void; onOpenThread: (t: string) => void }) {
  const { me, keyboard, open } = usePhone();
  const s = useAppState();
  const people = threadPeople(thread);
  const them = people.filter((p) => p !== me);
  const group = isBetsieThread(thread);
  const msgs = s.messages.filter((m) => m.thread === thread);
  const [text, setText] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [compose, setCompose] = useState<Partial<Draft> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    markThreadSeen(me, thread);
    markNoticesRead(me, (n) => n.thread === thread);
  }, [active, msgs.length, me, thread]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6, behavior: msgs.length ? 'smooth' : 'auto' }); }, [msgs.length, keyboard]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6 }); }, []);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendMessage(thread, me, t);
    setText('');
  };
  const startBet = (d: Partial<Draft>) => { setDrawer(false); setCompose({ vs: them[0], origin: 'imessage', ...d }); };
  const done = () => {
    setCompose(null);
    const t = betsieThread(me, them[0]);
    if (t !== thread) setTimeout(() => onOpenThread(t), 250);
  };

  return (
    <div className={`thread ${dir}`}>
      <header className="th-head">
        <button className="th-back tap" onClick={onBack} aria-label="Back"><img src={backIcon} alt="" /></button>
        <span className="th-who">
          <Avatars ids={group ? people : them} group={group} size={group ? 60 : 50} />
          <span className="th-name">{group ? `Betsie: ${firstName(people[0])} vs. ${firstName(people[1])}` : firstName(them[0])} <img src={chevron} alt="" /></span>
        </span>
        <img className="th-ft" src={facetime} alt="" />
      </header>
      <div className="th-list" ref={listRef}>
        {msgs.map((m, i) => {
          const prev = msgs[i - 1], next = msgs[i + 1];
          const stamp = !prev || m.at - prev.at > 15 * 60_000;
          const mine = m.from === me;
          const lastOfRun = !next || next.from !== m.from || next.at - m.at > 15 * 60_000;
          const firstOfRun = stamp || !prev || prev.from !== m.from;
          const bet = !mine ? null : betFromText(m.text || '');
          return (
            <Fragment key={m.id}>
              {stamp && <p className="th-stamp">iMessage<br />{chatStamp(m.at)}</p>}
              <div className={`msg ${mine ? 'out' : 'in'}${lastOfRun ? ' tail' : ''}${firstOfRun ? ' first' : ''}`}>
                {!mine && (group || m.from === 'betsie') && (
                  <span className="msg-av">{lastOfRun && (m.from === 'betsie' ? <span className="av-clover small"><img src={clover} alt="" /></span> : <img src={person(m.from as PersonId).photo} alt="" />)}</span>
                )}
                <div className="msg-col">
                  {!mine && firstOfRun && (group || m.from === 'betsie') && <span className="msg-name">{m.from === 'betsie' ? 'Betsie' : firstName(m.from as PersonId)}</span>}
                  {m.card ? <BotCard m={m} onOpenBet={(id) => open('betsie', { bet: id })} /> : (
                    <div className="bubble-row">
                      {bet && !group && <button className="bet-this tap" onClick={() => startBet({ text: bet })} aria-label="Make it a bet with Betsie"><img src={clover} alt="" /></button>}
                      <p className="bubble">{m.text}</p>
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          );
        })}
        {msgs.length === 0 && <p className="th-stamp">No messages yet.</p>}
      </div>
      <div className="th-compose">
        <button className={`th-plus tap${drawer ? ' on' : ''}`} onClick={() => setDrawer((d) => !d)} aria-label="Apps">+</button>
        <label className="th-input">
          <GrowingField
            value={text}
            placeholder="iMessage"
            data-sample={group ? 'comment' : 'imessage'}
            enterKeyHint="send"
            onChange={(e) => setText(e.target.value.replace(/\s*\r?\n\s*/g, ' '))}
            onFocus={() => setDrawer(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          />
          {text.trim()
            ? <button className="th-send tap" onClick={send} aria-label="Send">↑</button>
            : <span className="th-mic">🎙︎</span>}
        </label>
      </div>
      {text && betFromText(text) && !group && (
        <button className="bet-hint tap" onClick={() => startBet({ text: betFromText(text)! })}>
          <img src={clover} alt="" /> Make it a bet with {firstName(them[0])}
        </button>
      )}
      {drawer && (
        <div className="drawer">
          <button className="drawer-app tap" onClick={() => startBet({})}>
            <span className="betsie-icon"><img src={clover} alt="" /></span>
            <span>Betsie</span>
          </button>
          <p>Challenge {firstName(them[0])} without leaving the chat.</p>
        </div>
      )}
      {compose && (
        <div className="imsg-app">
          <div className="imsg-app-bar"><img src={clover} alt="" /><b>Betsie</b><button className="tap" onClick={() => setCompose(null)}>Cancel</button></div>
          <div className="imsg-app-body"><BetsieApp active compose={compose} onDone={done} /></div>
        </div>
      )}
    </div>
  );
}
