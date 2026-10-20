// A phone: lock screen, home screen, the two apps, notification banners,
// share sheet and (on desktop) the iOS keyboard. One per person.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { markNoticesRead, useAppState } from '../data/store';
import type { Notice, PersonId } from '../data/types';
import { BetsieApp } from '../betsie/BetsieApp';
import { Messages } from '../imessage/Messages';
import { Banner } from './Banner';
import { PhoneContext, type AppName, type Link, type PhoneApi } from './context';
import { HomeScreen } from './HomeScreen';
import { Keyboard, KEYBOARD_HEIGHT, wantsKeyboard } from './Keyboard';
import { LockScreen } from './LockScreen';
import { ShareSheet } from './ShareSheet';
import { StatusBar } from './StatusBar';
import { sample } from '../lib/samples';
import { reportUi } from '../lib/ui';
import { HintRing } from '../guide/HintRing';
import '../styles/os.css';

const fineMouse = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function Phone({ me, framed }: { me: PersonId; framed?: boolean }) {
  const s = useAppState();
  const [locked, setLocked] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [app, setApp] = useState<AppName | null>(null);
  const [opened, setOpened] = useState<AppName[]>([]);
  const [links, setLinks] = useState<Partial<Record<AppName, Link>>>({});
  const [banner, setBanner] = useState<Notice | null>(null);
  const [shareBet, setShareBet] = useState<string | null>(null);
  const [statusLight, setStatusLight] = useState(false);
  const [kbTarget, setKbTarget] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const seen = useRef(Date.now());
  const n = useRef(0);

  const open = useCallback((a: AppName, link?: Omit<Link, 'n'>) => {
    setLocked(false);
    setApp(a);
    setOpened((o) => (o.includes(a) ? o : [...o, a]));
    if (link) setLinks((l) => ({ ...l, [a]: { ...link, n: ++n.current } }));
  }, []);
  const home = useCallback(() => { setApp(null); setShareBet(null); (document.activeElement as HTMLElement | null)?.blur?.(); }, []);

  const openNotice = useCallback((x: Notice) => {
    markNoticesRead(me, (y) => y.id === x.id);
    setBanner(null);
    if (x.app === 'messages') open('messages', { thread: x.thread });
    else open('betsie', { bet: x.betId });
  }, [me, open]);

  // New notifications: banner when unlocked (unless that app is already in front).
  useEffect(() => {
    const fresh = s.notices.filter((x) => x.to === me && x.at > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map((x) => x.at));
    const last = fresh[fresh.length - 1];
    if (locked || app === last.app) return;
    setBanner(last);
  }, [s.notices, me, locked, app]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  const unlock = () => {
    setUnlocking(true);
    setTimeout(() => { setLocked(false); setUnlocking(false); }, 380);
  };

  // The iOS keyboard follows focus inside this phone (desktop; phones use their own).
  const onFocus = (e: React.FocusEvent) => { if (fineMouse() && wantsKeyboard(e.target)) setKbTarget(e.target as HTMLInputElement); };
  const onBlur = () => setTimeout(() => {
    const a = document.activeElement;
    if (!a || !wantsKeyboard(a) || !rootRef.current?.contains(a)) setKbTarget(null);
  }, 0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Double-click an empty text box to fill it with a sample.
  const prefill = (e: React.MouseEvent) => {
    const el = e.target as HTMLInputElement;
    if (!wantsKeyboard(el) || el.value || !el.dataset.sample) return;
    const text = sample(el.dataset.sample, el.dataset.them);
    if (!text) return;
    el.focus();
    document.execCommand('insertText', false, text);
  };

  // When the keyboard comes up, scroll the focused field into view above it.
  useEffect(() => {
    if (!kbTarget) return;
    const t = setTimeout(() => {
      const root = rootRef.current;
      if (!root) return;
      const k = root.getBoundingClientRect().width / 430;
      const limit = root.getBoundingClientRect().top + (932 - KEYBOARD_HEIGHT - 16) * k;
      const r = kbTarget.getBoundingClientRect();
      if (r.bottom <= limit) return;
      let box: HTMLElement | null = kbTarget.parentElement;
      while (box && box !== root && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
      if (box && box !== root) box.scrollBy({ top: (r.bottom - limit) / k, behavior: 'smooth' });
    }, 40);
    return () => clearTimeout(t);
  }, [kbTarget]);

  const api: PhoneApi = useMemo(() => ({
    me, app, open, home, share: setShareBet, setStatusLight, keyboard: !!kbTarget,
  }), [me, app, open, home, kbTarget]);

  // "Start over": back to the lock screen with every app closed.
  useEffect(() => {
    const reset = () => { setLocked(true); setUnlocking(false); setApp(null); setOpened([]); setLinks({}); setBanner(null); setShareBet(null); seen.current = Date.now(); };
    window.addEventListener('betsie-reset', reset);
    return () => window.removeEventListener('betsie-reset', reset);
  }, []);

  // Tell the guided tour what this phone is showing.
  useEffect(() => { reportUi(me, { locked, app, api }); }, [me, locked, app, api]);

  const light = locked || app === null || statusLight;
  return (
    <PhoneContext.Provider value={api}>
      <div
        ref={rootRef}
        data-me={me}
        className={`phone${framed ? ' framed' : ''}${kbTarget ? ' kb' : ''}`}
        onFocus={onFocus}
        onBlur={onBlur}
        onDoubleClick={prefill}
      >
        <HomeScreen hidden={locked && !unlocking} />
        {opened.map((a) => (
          <div key={a} className={`app-layer${app === a && !locked ? ' front' : ''}`} aria-hidden={app !== a}>
            {a === 'betsie' ? <BetsieApp link={links.betsie} active={app === 'betsie' && !locked} /> : <Messages link={links.messages} active={app === 'messages' && !locked} />}
          </div>
        ))}
        {shareBet && <ShareSheet betId={shareBet} onClose={() => setShareBet(null)} />}
        {(locked || unlocking) && <LockScreen leaving={unlocking} onUnlock={unlock} onOpen={openNotice} />}
        <StatusBar light={light} framed={framed} />
        {banner && <Banner notice={banner} onOpen={() => openNotice(banner)} onDismiss={() => setBanner(null)} />}
        <Keyboard target={kbTarget} />
        <button className={`home-indicator${light ? ' light' : ''}`} aria-label="Home" onClick={() => (locked ? unlock() : home())} />
        <HintRing me={me} />
        <div className="finger" aria-hidden="true" />
      </div>
    </PhoneContext.Provider>
  );
}
