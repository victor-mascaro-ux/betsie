import { useEffect } from 'react';
import clover from '../assets/brand/clover.webp';
import { markNoticesRead, useAppState } from '../data/store';
import { ago, useNow } from '../lib/time';
import { usePhone } from '../os/context';
import type { Nav } from './BetsieApp';
import { TitleBar } from './chrome';

export function Notices({ nav }: { nav: Nav }) {
  const { me } = usePhone();
  const s = useAppState();
  const now = useNow(15000);
  const list = s.notices.filter((n) => n.to === me && n.app === 'betsie').slice().reverse();
  useEffect(() => () => markNoticesRead(me, (n) => n.app === 'betsie'), [me]);
  return (
    <div className="screen notices">
      <TitleBar title="NOTIFICATIONS" onBack={nav.pop} />
      {list.length === 0 && <p className="empty">All caught up. 🍀</p>}
      <div className="notice-list">
        {list.map((n, i) => (
          <button key={n.id} className={`notice-row tap${n.read ? '' : ' unread'}`} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }} onClick={() => n.betId && nav.push({ s: 'bet', id: n.betId })}>
            <img src={clover} alt="" />
            <span>{n.body}</span>
            <small>{ago(n.at, now)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
