import camera from '../assets/os/camera.svg';
import flashlight from '../assets/os/flashlight.svg';
import focus from '../assets/os/focus.svg';
import maxineWall from '../assets/os/wallpaper-maxine.webp';
import sylviaWall from '../assets/os/wallpaper-sylvia.webp';
import { firstName } from '../data/people';
import { useAppState } from '../data/store';
import type { Notice } from '../data/types';
import { clock, lockDate, useNow } from '../lib/time';
import { usePhone } from './context';
import { NoticeCard } from './NoticeCard';

export const wallpaper = (me: string) => (me === 'sylvia' ? sylviaWall : maxineWall);

export function LockScreen({ leaving, onUnlock, onOpen }: { leaving: boolean; onUnlock: () => void; onOpen: (n: Notice) => void }) {
  const { me } = usePhone();
  const s = useAppState();
  const now = useNow(1000);
  const unread = s.notices.filter((n) => n.to === me && !n.read).slice(-4).reverse();
  return (
    <div className={`lock${leaving ? ' leaving' : ''}`} style={{ backgroundImage: `url(${wallpaper(me)})` }} onClick={onUnlock}>
      <div className="lock-date">{lockDate(now)}</div>
      <div className="lock-time">{clock(now)}</div>
      {me === 'sylvia' ? <SylviaWidgets /> : <MaxineWidgets />}
      <div className="lock-name">{firstName(me)}’s iPhone</div>
      <div className="lock-notices">
        {unread.map((n) => <NoticeCard key={n.id} notice={n} onOpen={() => onOpen(n)} />)}
      </div>
      <div className="lock-buttons">
        <span className="round"><img src={flashlight} alt="" style={{ height: 22 }} /></span>
        <span className="focus"><img src={focus} alt="" />Personal</span>
        <span className="round"><img src={camera} alt="" style={{ width: 22 }} /></span>
      </div>
      <div className="lock-hint">Tap to unlock</div>
    </div>
  );
}

// Maxine's lock screen widgets: watch battery, activity rings, weather.
function MaxineWidgets() {
  return (
    <div className="lock-widgets rings">
      <svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="21" className="track" /><circle cx="25" cy="25" r="21" className="arc" strokeDasharray="105 132" /><rect x="19" y="16" width="12" height="18" rx="4" className="glyph" /></svg>
      <svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="21" className="arc" strokeDasharray="120 132" /><circle cx="25" cy="25" r="14" className="arc" strokeDasharray="70 88" /><circle cx="25" cy="25" r="7" className="arc" strokeDasharray="34 44" /></svg>
      <svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="21" className="track" strokeDasharray="99 132" transform="rotate(135 25 25)" /><circle cx="9.5" cy="12" r="2.4" className="dot" /><text x="25" y="29" className="big">23</text><text x="17" y="42" className="small">15</text><text x="33" y="42" className="small">26</text></svg>
    </div>
  );
}

// Sylvia's: headphones battery and reminders.
function SylviaWidgets() {
  return (
    <div className="lock-widgets cards">
      <div className="w">
        <b>🎧 50 %</b>
        <span>WH-1000XM5</span>
        <i className="bar"><i style={{ width: '53%' }} /></i>
      </div>
      <div className="w list">
        <span><i />Prepare for Review</span>
        <span><i />Finish my design</span>
        <span><i />Prepare concept</span>
      </div>
    </div>
  );
}
