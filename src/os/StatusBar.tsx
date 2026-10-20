import icons from '../assets/os/status-icons.svg';
import { clock, useNow } from '../lib/time';

/** Live time, signal / wifi / battery, and the Dynamic Island on the framed phone. */
export function StatusBar({ light, framed }: { light: boolean; framed?: boolean }) {
  const now = useNow(5000);
  return (
    <div className={`status-bar${light ? ' light' : ''}`}>
      <span className="time">{clock(now)}</span>
      {framed && <span className="island" />}
      <img className="icons" src={icons} alt="" />
    </div>
  );
}
