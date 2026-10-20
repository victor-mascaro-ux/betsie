import { useRef } from 'react';
import type { Notice } from '../data/types';
import { NoticeCard } from './NoticeCard';

/** iOS banner: drops in from the top; tap to open, swipe up to dismiss. */
export function Banner({ notice, onOpen, onDismiss }: { notice: Notice; onOpen: () => void; onDismiss: () => void }) {
  const y0 = useRef<number | null>(null);
  return (
    <div
      className="banner"
      key={notice.id}
      onPointerDown={(e) => { y0.current = e.clientY; }}
      onPointerUp={(e) => { if (y0.current !== null && y0.current - e.clientY > 20) onDismiss(); y0.current = null; }}
    >
      <NoticeCard notice={notice} onOpen={onOpen} />
    </div>
  );
}
