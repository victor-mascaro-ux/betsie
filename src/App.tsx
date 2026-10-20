import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clover from './assets/brand/clover.webp';
import { firstName, person } from './data/people';
import { endBetNow, resetDemo, tick, useAppState } from './data/store';
import type { PersonId } from './data/types';
import { remaining, useNow } from './lib/time';
import { Phone } from './os/Phone';

const PHONE_W = 430, PHONE_H = 932, BEZEL = 16;
const isPhoneViewport = () => window.innerWidth < 720;

export function App() {
  const [small, setSmall] = useState(isPhoneViewport);
  const [active, setActive] = useState<PersonId>(() => (localStorage.getItem('betsie-active') as PersonId) || 'maxine');
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    const onResize = () => setSmall(isPhoneViewport());
    window.addEventListener('resize', onResize);
    const t = setInterval(tick, 1000);
    return () => { window.removeEventListener('resize', onResize); clearInterval(t); };
  }, []);

  const switchTo = (p: PersonId) => { setActive(p); localStorage.setItem('betsie-active', p); };

  if (small) {
    const other: PersonId = active === 'maxine' ? 'sylvia' : 'maxine';
    return (
      <div className="mobile">
        <FitPhone key={active} me={active} />
        <button className="switch tap" onClick={() => switchTo(other)} aria-label={`Switch to ${firstName(other)}'s phone`}>
          <img src={person(other).photo} alt="" />
        </button>
        <button className="menu-btn tap" onClick={() => setPanel(true)} aria-label="Demo controls">
          <img src={clover} alt="" />
        </button>
        {panel && (
          <div className="sheet-backdrop" onClick={() => setPanel(false)}>
            <div className="panel-sheet" onClick={(e) => e.stopPropagation()}><DemoPanel mobile /></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="panel"><DemoPanel /></aside>
      <main className="stage"><Phones /></main>
    </div>
  );
}

/** Both phones side by side, scaled to fit the window. */
function Phones() {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current?.parentElement;
      if (!el) return;
      const w = 2 * (PHONE_W + 2 * BEZEL) + 64, h = PHONE_H + 2 * BEZEL + 44;
      setK(Math.min(1, (el.clientWidth - 48) / w, (el.clientHeight - 32) / h));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(ref.current!.parentElement!);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="phones" ref={ref} style={{ transform: `translate(-50%, -50%) scale(${k})` }}>
      {(['maxine', 'sylvia'] as PersonId[]).map((p) => (
        <figure className="device" key={p}>
          <figcaption><img src={person(p).photo} alt="" />{firstName(p)}’s iPhone</figcaption>
          <div className="bezel">
            <i className="btn action" /><i className="btn vol-up" /><i className="btn vol-down" /><i className="btn power" />
            <div className="bezel-screen"><Phone me={p} framed /></div>
          </div>
        </figure>
      ))}
    </div>
  );
}

/** One phone, full screen, scaled to the viewport. */
function FitPhone({ me }: { me: PersonId }) {
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setK(Math.min(window.innerWidth / PHONE_W, window.innerHeight / PHONE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="fit" style={{ width: PHONE_W * k, height: PHONE_H * k }}>
      <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${k})`, transformOrigin: '0 0' }}>
        <Phone me={me} />
      </div>
    </div>
  );
}

function DemoPanel({ mobile }: { mobile?: boolean }) {
  const s = useAppState();
  const now = useNow(1000);
  const open = s.bets
    .filter((b) => b.status === 'active' && (b.by === 'maxine' || b.by === 'sylvia' || b.vs === 'maxine' || b.vs === 'sylvia'))
    .sort((x, y) => y.createdAt - x.createdAt);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="demo">
      <header>
        <img src={clover} alt="" />
        <div>
          <h1>Betsie</h1>
          <p>Bets with your besties</p>
        </div>
      </header>
      <p className="lede">
        A working prototype. {mobile ? 'Switch' : 'Use both'} phones: whatever Maxine does shows up on Sylvia’s phone, and back. Everyone else answers on their own.
      </p>
      <h2>Try it</h2>
      <ol className="steps">
        <li>On Maxine’s phone, open <b>Messages</b>, text Sylvia “I bet …” and tap the clover.</li>
        <li>Or open <b>Betsie</b> and tap <b>+</b> to start a bet.</li>
        <li>Accept it on Sylvia’s phone, set the stakes, trash-talk in the comments.</li>
        <li>End the bet below, then both vote on who won.</li>
      </ol>
      <p className="tip">Tip: double-click any empty text box to fill it in.</p>
      <h2>Bets in play</h2>
      {open.length === 0 && <p className="empty">Nothing running. Start one!</p>}
      <ul className="bets">
        {open.map((b) => (
          <li key={b.id}>
            <span className="who"><img src={person(b.by).photo} alt="" /><img src={person(b.vs).photo} alt="" /></span>
            <span className="what"><b>{b.text}</b><small>ends in {remaining(b.endsAt - now)}</small></span>
            <button className="tap" onClick={() => endBetNow(b.id)}>End now</button>
          </li>
        ))}
      </ul>
      <div className="foot">
        <button className={`reset tap${confirm ? ' armed' : ''}`} onClick={() => { if (confirm) { resetDemo(); setConfirm(false); } else setConfirm(true); }} onBlur={() => setConfirm(false)}>
          {confirm ? 'Tap again to reset everything' : 'Reset Demo'}
        </button>
        <p>Saved in this browser only.</p>
      </div>
    </div>
  );
}
