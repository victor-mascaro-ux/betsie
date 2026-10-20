import clover from '../assets/brand/clover.webp';
import messagesIcon from '../assets/apps/messages.svg';
import { firstName } from '../data/people';
import { useAppState } from '../data/store';
import { betsOf, isOpen, opponent, record } from '../data/stats';
import { remaining, useNow } from '../lib/time';
import { usePhone } from './context';
import { wallpaper } from './LockScreen';

export function HomeScreen({ hidden }: { hidden: boolean }) {
  const { me, open, app } = usePhone();
  const s = useAppState();
  const now = useNow(30000);
  const mine = betsOf(s, me).filter(isOpen);
  const next = mine.filter((b) => b.status === 'active').sort((a, b) => a.endsAt - b.endsAt)[0];
  const r = record(s, me);
  const badge = (a: 'betsie' | 'messages') => s.notices.filter((n) => n.to === me && !n.read && n.app === a).length;

  return (
    <div className={`home${hidden ? ' hidden' : ''}${app ? ' behind' : ''}`} style={{ backgroundImage: `url(${wallpaper(me)})` }}>
      <button className="widget tap" onClick={() => open('betsie', { screen: 'book' })}>
        <span className="w-head"><img src={clover} alt="" />Betsie</span>
        <span className="w-record">{r.w} – {r.l}</span>
        <span className="w-sub">{mine.length ? `${mine.length} bet${mine.length > 1 ? 's' : ''} in play` : 'No bets in play'}</span>
        {next && <span className="w-next">vs {firstName(opponent(next, me))} · ends in {remaining(next.endsAt - now)}</span>}
      </button>
      <div className="search-pill">🔍︎ Search</div>
      <div className="dock">
        <AppIcon label="Messages" badge={badge('messages')} onClick={() => open('messages')}>
          <img src={messagesIcon} alt="" />
        </AppIcon>
        <AppIcon label="Betsie" badge={badge('betsie')} onClick={() => open('betsie')}>
          <span className="betsie-icon"><img src={clover} alt="" /></span>
        </AppIcon>
      </div>
    </div>
  );
}

function AppIcon({ label, badge, onClick, children }: { label: string; badge: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="app-icon-btn tap" onClick={onClick} aria-label={label}>
      {children}
      {badge > 0 && <span className="badge">{badge}</span>}
      <span className="label">{label}</span>
    </button>
  );
}
