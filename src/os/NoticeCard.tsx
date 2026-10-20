import betsieIcon from '../assets/brand/notification.webp';
import messagesIcon from '../assets/apps/messages.svg';
import type { Notice } from '../data/types';
import { ago, useNow } from '../lib/time';

/** The frosted notification card, on the lock screen and as a banner. */
export function NoticeCard({ notice, onOpen }: { notice: Notice; onOpen: () => void }) {
  const now = useNow(15000);
  return (
    <button className="notice tap" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
      <img className="app-icon" src={notice.app === 'betsie' ? betsieIcon : messagesIcon} alt="" />
      <span className="copy">
        <span className="head"><b>{notice.title}</b><small>{ago(notice.at, now)}</small></span>
        <span className="body">{notice.body}</span>
      </span>
    </button>
  );
}
