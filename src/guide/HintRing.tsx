// A pulsing ring on the next thing to tap, for people doing the task themselves.
import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../data/store';
import type { PersonId } from '../data/types';
import { useUi } from '../lib/ui';
import { find } from './pilot';
import { STEPS, tourBet } from './steps';
import { useTour } from './tour';

export function HintRing({ me }: { me: PersonId }) {
  const tour = useTour();
  const s = useAppState();
  const ui = useUi();
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const step = STEPS[tour.step];
  // The ring waits 2 s on each new target, so people read the task first.
  const target = useRef<{ el: HTMLElement | null; since: number }>({ el: null, since: 0 });

  useEffect(() => {
    if (tour.running || !step?.hints) { setBox(null); target.current = { el: null, since: 0 }; return; }
    const locate = () => {
      const hints = step.hints!({ s, ui, tour, bet: tourBet(s, tour) }).filter((h) => h.me === me);
      const root = ref.current?.parentElement;
      for (const h of hints) {
        const el = find(me, h.sel, { text: h.text, last: h.last });
        if (!el || !root) continue;
        const rr = root.getBoundingClientRect(), r = el.getBoundingClientRect();
        const k = rr.width / 430;
        if (r.bottom < rr.top || r.top > rr.bottom) continue;
        // Only when it's really on top (not under a sheet, the keyboard or a banner).
        const cx = Math.min(Math.max(r.left + r.width / 2, rr.left + 1), rr.right - 1);
        const cy = Math.min(Math.max(r.top + Math.min(r.height, 60) / 2, rr.top + 1), rr.bottom - 1);
        const top = document.elementFromPoint(cx, cy);
        if (!top || !(el === top || el.contains(top) || top.contains(el))) continue;
        if (target.current.el !== el) target.current = { el, since: Date.now() };
        if (Date.now() - target.current.since < 2000) { setBox(null); return; }
        setBox({ x: (r.left - rr.left) / k, y: (r.top - rr.top) / k, w: r.width / k, h: r.height / k });
        return;
      }
      target.current = { el: null, since: 0 };
      setBox(null);
    };
    locate();
    const t = setInterval(locate, 350);
    return () => clearInterval(t);
  }, [me, step, tour, s, ui]);

  return (
    <div ref={ref} className="hint-layer" aria-hidden="true">
      {box && (
        <span className="hint-ring" style={{ left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12, borderRadius: Math.min(box.h + 12, 40) / 2 }} />
      )}
    </div>
  );
}
