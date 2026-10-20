// The guided tour panel: one task at a time, with a button that does it for you.
import { useEffect, useState } from 'react';
import clover from '../assets/brand/clover.webp';
import { firstName, person } from '../data/people';
import { createBet, endBetNow, resetDemo, useAppState } from '../data/store';
import { on, useUi } from '../lib/ui';
import { remaining, useNow } from '../lib/time';
import { hideFingers } from './pilot';
import { STEPS, tourBet, type Ctx } from './steps';
import { restartTour, setTour, useTour } from './tour';

/** Puts both phones back on their lock screens and the data back to the start. */
export const startOver = () => {
  resetDemo();
  restartTour();
  window.dispatchEvent(new Event('betsie-reset'));
};

export function useGuide() {
  const tour = useTour();
  const s = useAppState();
  const ui = useUi();
  const ctx: Ctx = { s, ui, tour, bet: tourBet(s, tour) };
  const step = STEPS[Math.min(tour.step, STEPS.length - 1)];
  const [done, setDone] = useState(false);

  useEffect(() => on('story-posted', () => setTour({ storyPosted: true })), []);
  const phone = typeof step.phone === 'function' ? step.phone(ctx) : step.phone;
  // The visible phone follows the task (one-phone view and phones switch to it).
  useEffect(() => { if (phone && !tour.running) setTour({ focus: phone }); }, [tour.step, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move on once the task is done (by "Show me" or by hand).
  useEffect(() => {
    if (tour.running || !step.done(ctx)) { setDone(false); return; }
    setDone(true);
    const t = setTimeout(() => { setDone(false); setTour({ step: tour.step + 1 }); }, 1400);
    return () => clearTimeout(t);
  }, [s, ui, tour]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMe = async () => {
    if (tour.running || !step.run) return;
    setTour({ running: true });
    try { await step.run(ctx); } catch (e) { console.warn('tour step stopped:', e); }
    finally { hideFingers(); setTour({ running: false }); }
  };
  // Sylvia said no (or let the clock run out): the tour can't go on with this bet,
  // so offer to send the same challenge again.
  const last = tour.step >= STEPS.length - 1;
  const failed = !last && tour.step >= 3 && !!ctx.bet && (ctx.bet.status === 'declined' || ctx.bet.status === 'expired') ? ctx.bet : undefined;
  const retry = () => {
    if (!failed) return;
    const { by, vs, text, endsAt, method, visibility, origin } = failed;
    createBet({ by, vs, text, endsAt: Math.max(endsAt, Date.now() + 24 * 3600_000), method, visibility, origin });
    setTour({ focus: vs });
  };
  return { tour, step, ctx, done, showMe, phone, last, failed, retry };
}

/** What to say when the tour's bet didn't happen. */
const failedCopy = (b: NonNullable<ReturnType<typeof useGuide>['failed']>) => ({
  title: b.status === 'declined' ? `${firstName(b.vs)} passed 🤷` : 'Time ran out ⏰',
  body: `${b.status === 'declined' ? `${firstName(b.vs)} tapped NO, so there’s no bet.` : `${firstName(b.vs)} didn’t answer in time, so there’s no bet.`} A bet takes two: send the same challenge again, and this time ${firstName(b.vs)} says YES.`,
});

const WhoChip = ({ phone }: { phone: Ctx['tour']['focus'] | null }) =>
  phone
    ? <span className="g-who"><img src={person(phone).photo} alt="" />On {firstName(phone)}’s iPhone</span>
    : <span className="g-who both">On both phones</span>;

export function GuidePanel() {
  const { tour, step, ctx, done, showMe, phone, last, failed, retry } = useGuide();
  const s = useAppState();
  const now = useNow(1000);
  const [confirm, setConfirm] = useState(false);
  const open = s.bets.filter((b) => b.status === 'active' && [b.by, b.vs].some((p) => p === 'maxine' || p === 'sylvia')).sort((x, y) => y.createdAt - x.createdAt);

  return (
    <div className="guide">
      <header className="g-brand">
        <img src={clover} alt="" />
        <div><h1>Betsie</h1><p>Bets with your besties</p></div>
      </header>

      <div className="g-progress" aria-label={`Step ${tour.step + 1} of ${STEPS.length}`}>
        {STEPS.map((_, i) => <i key={i} className={i < tour.step ? 'past' : i === tour.step ? 'now' : ''} />)}
      </div>
      <small className="g-count">{last ? 'Tour complete' : `Task ${tour.step + 1} of ${STEPS.length - 1}`}</small>

      {failed ? (
        <section className="g-card" key={`retry-${failed.id}`}>
          <WhoChip phone={failed.by} />
          <h2>{failedCopy(failed).title}</h2>
          <p>{failedCopy(failed).body}</p>
          <button className="g-go tap" onClick={retry}>Send it again</button>
          <small className="g-or">or start a new bet on {firstName(failed.by)}’s phone.</small>
        </section>
      ) : (
      <section className={`g-card${done ? ' done' : ''}`} key={tour.step}>
        {!last && <WhoChip phone={phone} key={phone || 'both'} />}
        <h2>{step.title}</h2>
        <p>{step.body(ctx)}</p>
        {last ? (
          <button className="g-go tap" onClick={startOver}>Start over</button>
        ) : (
          <>
            <button className={`g-go tap${tour.running ? ' busy' : ''}${done ? ' ok' : ''}`} onClick={showMe} disabled={tour.running || done}>
              {done ? 'Done ✓' : tour.running ? <><i className="spin" />Doing it…</> : step.cta || 'Show me'}
            </button>
            <small className="g-or">{phone ? <>or do it yourself on {firstName(phone)}’s phone: tap the pulsing ring.</> : 'or use the demo tools below.'}</small>
          </>
        )}
      </section>
      )}

      <div className="g-tools">
        <h3>View</h3>
        <div className="g-seg" role="radiogroup" aria-label="Phones on screen">
          <button role="radio" aria-checked={tour.view === 'two'} className={tour.view === 'two' ? 'on' : ''} onClick={() => setTour({ view: 'two' })}>Both phones</button>
          <button role="radio" aria-checked={tour.view === 'one'} className={tour.view === 'one' ? 'on' : ''} onClick={() => setTour({ view: 'one' })}>One phone</button>
        </div>
        {open.length > 0 && (
          <details className="g-bets">
            <summary>End a bet early ({open.length})</summary>
            <ul>
              {open.map((b) => (
                <li key={b.id}>
                  <span><b>{b.text}</b><small>ends in {remaining(b.endsAt - now)}</small></span>
                  <button className="tap" onClick={() => endBetNow(b.id)}>End now</button>
                </li>
              ))}
            </ul>
          </details>
        )}
        <button className={`g-reset tap${confirm ? ' armed' : ''}`} onClick={() => { if (confirm) { startOver(); setConfirm(false); } else setConfirm(true); }} onBlur={() => setConfirm(false)}>
          {confirm ? 'Tap again to start over' : 'Start Over'}
        </button>
        <p className="g-foot">Double-click any empty text box to fill it in. Saved in this browser only.</p>
      </div>
    </div>
  );
}

/** Phone-sized screens: the current task as a bar under the phone. */
export function GuideBar() {
  const { tour, step, ctx, done, showMe, last, failed, retry } = useGuide();
  if (failed) {
    const copy = failedCopy(failed);
    return (
      <div className="guide-bar" key={`retry-${failed.id}`}>
        <div className="gb-top"><span className="gb-count">{tour.step + 1}/{STEPS.length - 1}</span><b>{copy.title}</b></div>
        <p>{copy.body}</p>
        <button className="g-go tap" onClick={retry}>Send it again</button>
      </div>
    );
  }
  return (
    <div className={`guide-bar${done ? ' done' : ''}`} key={tour.step}>
      <div className="gb-top">
        <span className="gb-count">{last ? '✓' : `${tour.step + 1}/${STEPS.length - 1}`}</span>
        <b>{step.title}</b>
      </div>
      <p>{step.body(ctx)}</p>
      {last
        ? <button className="g-go tap" onClick={startOver}>Start over</button>
        : <button className="g-go tap" onClick={showMe} disabled={tour.running || done}>{done ? 'Done ✓' : tour.running ? 'Doing it…' : step.cta || 'Show me'}</button>}
    </div>
  );
}
