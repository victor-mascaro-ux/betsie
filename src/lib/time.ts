import { useEffect, useState } from 'react';

/** Re-renders every `ms` with the current time. */
export const useNow = (ms = 1000) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
};

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** iOS status bar: "9:45". */
export const clock = (t: number) => { const d = new Date(t); return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** "Aug 9, 2024" */
export const shortDate = (t: number) => { const d = new Date(t); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
/** "9 Aug, 2024" (Book of Bets rows) */
export const dayMonth = (t: number) => { const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]}, ${d.getFullYear()}`; };
/** "11:40 AM" */
export const time12 = (t: number) => { const d = new Date(t); return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`; };
/** Lock screen: "Wednesday 7 August" */
export const lockDate = (t: number) => { const d = new Date(t); return `${DAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`; };
export const monthYear = (t: number) => { const d = new Date(t); return `${MONTH[d.getMonth()]} ${d.getFullYear()}`; };
/** iMessage: "Today 9:45 AM" */
export const chatStamp = (t: number) => {
  const d = new Date(t), now = new Date();
  const same = d.toDateString() === now.toDateString();
  return `${same ? 'Today' : `${DAY[d.getDay()].slice(0, 3)}, ${MON[d.getMonth()]} ${d.getDate()}`} ${time12(t)}`;
};

/** "now", "2m", "3h", "2d" */
export const ago = (t: number, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'now';
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
};

/** Countdown parts: "23 : 59" (hours : minutes), switching to minutes : seconds in the last hour. */
export const countdown = (ms: number): [string, string] => {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 3600) return [String(Math.min(99, Math.floor(s / 3600))).padStart(2, '0'), String(Math.floor((s % 3600) / 60)).padStart(2, '0')];
  return [String(Math.floor(s / 60)).padStart(2, '0'), String(s % 60).padStart(2, '0')];
};

/** Time left on a bet: "3d 05h", "01h 12m", "12m 30s" */
export const remaining = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${pad(Math.floor((s % 86400) / 3600))}h`;
  if (s >= 3600) return `${pad(Math.floor(s / 3600))}h ${pad(Math.floor((s % 3600) / 60))}m`;
  return `${pad(Math.floor(s / 60))}m ${pad(s % 60)}s`;
};
