// The Betsie app: a navigation stack of screens inside the shared chrome.
// Runs full screen from the home screen, or compose-only inside iMessage.
import { useEffect, useMemo, useState } from 'react';
import commentIcon from '../assets/icons/comment.webp';
import nextIcon from '../assets/icons/next.webp';
import plusIcon from '../assets/icons/plus.webp';
import shareIcon from '../assets/icons/share.webp';
import { createBet, markNoticesRead, useAppState, type Draft } from '../data/store';
import { unreadComments } from '../data/stats';
import type { PersonId } from '../data/types';
import { usePhone, type Link } from '../os/context';
import { BetView } from './BetView';
import { Comments } from './Comments';
import { OverlayContext } from './overlay';
import { Book } from './Book';
import { Masthead, TabBar, type CenterAction } from './chrome';
import { Friends } from './Friends';
import { Method, NewBet, Review } from './NewBet';
import { Notices } from './Notices';
import { Splash } from './Splash';
import { Story } from './Story';
import '../styles/betsie.css';

export type Route =
  | { s: 'book' } | { s: 'friends' } | { s: 'notices' }
  | { s: 'new' } | { s: 'method' } | { s: 'review' }
  | { s: 'bet'; id: string } | { s: 'story'; id: string };

const quarter = (t: number) => Math.ceil(t / 900_000) * 900_000;
export const newDraft = (me: PersonId, d: Partial<Draft> = {}): Draft => ({
  by: me, vs: null, text: '', endsAt: quarter(Date.now() + 24 * 3600_000), method: 'consensus', visibility: 'everyone', origin: 'app', ...d,
});

export interface Nav {
  push: (r: Route) => void;
  pop: () => void;
  reset: (r: Route[]) => void;
  setCenter: (c: CenterAction | null) => void;
  openComments: () => void;
}

export function BetsieApp({ link, active, compose, onDone }: { link?: Link; active: boolean; compose?: Partial<Draft>; onDone?: () => void }) {
  const { me, share } = usePhone();
  const s = useAppState();
  const imessage = !!compose;
  const [stack, setStack] = useState<Route[]>(imessage ? [{ s: 'new' }] : [{ s: 'book' }]);
  const [dir, setDir] = useState<'push' | 'pop' | 'none'>('none');
  const [splash, setSplash] = useState(true);
  const [draft, setDraft] = useState<Draft>(() => newDraft(me, compose));
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [override, setCenter] = useState<CenterAction | null>(null);
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null);

  const push = (r: Route) => { setDir('push'); setCenter(null); setStack((st) => [...st, r]); };
  const pop = () => { setDir('pop'); setCenter(null); setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)); };
  const reset = (r: Route[]) => { setDir('none'); setCenter(null); setStack(r); };

  // Deep links from notifications, the widget, the share sheet, iMessage.
  useEffect(() => {
    if (!link) return;
    setCommentsFor(null);
    if (link.bet && link.screen === 'story') reset([{ s: 'book' }, { s: 'bet', id: link.bet }, { s: 'story', id: link.bet }]);
    else if (link.bet) reset([{ s: 'book' }, { s: 'bet', id: link.bet }]);
    else if (link.compose) { setDraft(newDraft(me, link.compose)); reset([{ s: 'book' }, { s: 'new' }]); }
    else if (link.screen) reset([{ s: link.screen as 'book' }]);
  }, [link?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const route = stack[stack.length - 1];
  const routeKey = `${stack.length}:${route.s}:${'id' in route ? route.id : ''}`;

  // Opening a bet clears its notifications.
  useEffect(() => {
    if (active && route.s === 'bet') markNoticesRead(me, (n) => n.betId === route.id);
  }, [active, routeKey, s.notices.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => {
    const id = createBet({ ...draft, origin: imessage ? 'imessage' : 'app' });
    setDraft(newDraft(me));
    if (imessage) { onDone?.(); return; }
    reset([{ s: 'book' }, { s: 'bet', id }]);
  };

  const nav: Nav = { push, pop, reset, setCenter, openComments: () => route.s === 'bet' && setCommentsFor(route.id) };

  const bet = route.s === 'bet' ? s.bets.find((b) => b.id === route.id) : undefined;
  const center: CenterAction = useMemo(() => {
    if (override) return override;
    switch (route.s) {
      case 'new': return { icon: nextIcon, label: 'Next', disabled: !draft.vs || !draft.text.trim(), onClick: () => push({ s: 'method' }) };
      case 'method': return { icon: nextIcon, label: 'Next', onClick: () => push({ s: 'review' }) };
      case 'review': return { icon: nextIcon, label: 'Send the bet', onClick: send };
      case 'bet':
        if (bet?.status === 'settled') return { icon: shareIcon, label: 'Share', glyph: true, onClick: () => share(bet.id) };
        return { icon: commentIcon, label: 'Comments', badge: bet ? unreadComments(bet, me) : 0, onClick: () => bet && setCommentsFor(bet.id) };
      default: return { icon: plusIcon, label: 'Start a bet', onClick: () => { setDraft(newDraft(me)); push({ s: 'new' }); } };
    }
  }, [override, route, draft, bet, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadNotices = s.notices.filter((n) => n.to === me && n.app === 'betsie' && !n.read).length;
  const goBook = () => (imessage ? undefined : reset([{ s: 'book' }]));

  if (route.s === 'story') return <Story id={route.id} onBack={pop} />;

  return (
    <OverlayContext.Provider value={overlayEl}>
    <div className={`betsie${imessage ? ' in-imessage' : ''}`}>
      <Masthead me={me} unread={unreadNotices} onBell={() => !imessage && push({ s: 'notices' })} onMe={() => goBook()} />
      <div className={`b-body ${dir}`} key={routeKey}>
        {route.s === 'book' && <Book nav={nav} />}
        {route.s === 'friends' && <Friends nav={nav} onBet={(vs) => { setDraft(newDraft(me, { vs })); push({ s: 'new' }); }} />}
        {route.s === 'notices' && <Notices nav={nav} />}
        {route.s === 'new' && <NewBet draft={draft} setDraft={setDraft} onBack={stack.length > 1 ? pop : imessage ? onDone : undefined} />}
        {route.s === 'method' && <Method draft={draft} setDraft={setDraft} onBack={pop} onNext={() => push({ s: 'review' })} />}
        {route.s === 'review' && <Review draft={draft} onBack={pop} onSend={send} />}
        {route.s === 'bet' && <BetView id={route.id} nav={nav} />}
      </div>
      <TabBar center={center} onBook={() => goBook()} onFriends={() => !imessage && reset([{ s: 'friends' }])} />
      <div className="b-overlays" ref={setOverlayEl} />
      {commentsFor && route.s === 'bet' && <Comments id={commentsFor} onClose={() => setCommentsFor(null)} />}
      {splash && <Splash onDone={() => setSplash(false)} />}
    </div>
    </OverlayContext.Provider>
  );
}
