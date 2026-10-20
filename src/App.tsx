import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clover from './assets/brand/clover.webp';
import { firstName, person } from './data/people';
import { tick } from './data/store';
import type { PersonId } from './data/types';
import { GuideBar, GuidePanel, startOver } from './guide/Guide';
import { restartTour, setTour, useTour } from './guide/tour';
import { Phone } from './os/Phone';

const PHONE_W = 430, PHONE_H = 932, BEZEL = 16;
const PEOPLE: PersonId[] = ['maxine', 'sylvia'];
const isPhoneViewport = () => window.innerWidth < 720;

export function App() {
  const [small, setSmall] = useState(isPhoneViewport);
  useEffect(() => {
    const onResize = () => setSmall(isPhoneViewport());
    window.addEventListener('resize', onResize);
    const t = setInterval(tick, 1000);
    return () => { window.removeEventListener('resize', onResize); clearInterval(t); };
  }, []);
  return small ? <MobileShell /> : <DesktopShell />;
}

function DesktopShell() {
  const tour = useTour();
  return (
    <div className="shell">
      <aside className="panel"><GuidePanel /></aside>
      <main className="stage"><Devices one={tour.view === 'one'} focus={tour.focus} /></main>
    </div>
  );
}

/** Framed phones, scaled to fit. Both stay mounted so switching never loses your place. */
function Devices({ one, focus }: { one: boolean; focus: PersonId }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current?.parentElement;
      if (!el) return;
      const w = (one ? 1 : 2) * (PHONE_W + 2 * BEZEL) + (one ? 0 : 64), h = PHONE_H + 2 * BEZEL + (one ? 64 : 52);
      setK(Math.min(1, (el.clientWidth - 48) / w, (el.clientHeight - 32) / h));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(ref.current!.parentElement!);
    return () => ro.disconnect();
  }, [one]);
  return (
    <div className={`phones${one ? ' one' : ''}`} ref={ref} style={{ transform: `translate(-50%, -50%) scale(${k})` }}>
      {PEOPLE.map((p) => (
        <figure className={`device${focus === p ? ' focus' : ''}${one && focus !== p ? ' off' : ''}`} key={p}>
          <figcaption>
            {one ? (
              <span className="who-switch" role="radiogroup" aria-label="Whose phone">
                {PEOPLE.map((q) => (
                  <button key={q} role="radio" aria-checked={focus === q} className={focus === q ? 'on' : ''} onClick={() => setTour({ focus: q })}>
                    <img src={person(q).photo} alt="" />{firstName(q)}
                  </button>
                ))}
              </span>
            ) : <><img src={person(p).photo} alt="" />{firstName(p)}’s iPhone</>}
          </figcaption>
          <div className="bezel">
            <i className="btn action" /><i className="btn vol-up" /><i className="btn vol-down" /><i className="btn power" />
            <div className="bezel-screen"><Phone me={p} framed /></div>
          </div>
        </figure>
      ))}
    </div>
  );
}

/** Phone-sized screens: one phone edge to edge, the current task underneath. */
function MobileShell() {
  const tour = useTour();
  const [tools, setTools] = useState(false);
  const [k, setK] = useState(1);
  const BAR = 158;
  useLayoutEffect(() => {
    const fit = () => setK(Math.min(window.innerWidth / PHONE_W, (window.innerHeight - BAR) / PHONE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const other: PersonId = tour.focus === 'maxine' ? 'sylvia' : 'maxine';
  return (
    <div className="mobile">
      {PEOPLE.map((p) => (
        <div key={p} className="fit" style={{ width: PHONE_W * k, height: PHONE_H * k, display: tour.focus === p ? undefined : 'none' }}>
          <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${k})`, transformOrigin: '0 0' }}><Phone me={p} /></div>
        </div>
      ))}
      <div className="mobile-foot">
        <GuideBar />
        <button className="switch tap" onClick={() => setTour({ focus: other })} aria-label={`Switch to ${firstName(other)}'s phone`}>
          <img src={person(other).photo} alt="" />
        </button>
        <button className="menu-btn tap" onClick={() => setTools(true)} aria-label="Demo tools"><img src={clover} alt="" /></button>
      </div>
      {tools && (
        <div className="sheet-backdrop" onClick={() => setTools(false)}>
          <div className="panel-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="demo">
              <h2>Demo tools</h2>
              <button className="reset tap" onClick={() => { startOver(); setTools(false); }}>Start Over</button>
              <button className="reset tap" onClick={() => { restartTour(); setTools(false); }}>Replay the tour</button>
              <p className="tip">Double-click any empty text box to fill it in.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
