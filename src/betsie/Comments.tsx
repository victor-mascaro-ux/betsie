// The comments sheet: trash talk, quick emoji, likes and GIPHY stickers.
import { useEffect, useRef, useState } from 'react';
import sendIcon from '../assets/icons/send.webp';
import stickerIcon from '../assets/icons/sticker.svg';
import searchIcon from '../assets/icons/search.svg';
import { firstName } from '../data/people';
import { addComment, likeComment, markCommentsRead, useAppState } from '../data/store';
import { ago, useNow } from '../lib/time';
import { usePhone } from '../os/context';
import { Photo } from './chrome';

const stickerFiles = import.meta.glob('../assets/stickers/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const GIPHY = Object.entries(stickerFiles).filter(([k]) => k.includes('giphy')).map(([, v]) => v);
const MEMES = Object.entries(stickerFiles).filter(([k]) => !k.includes('giphy')).map(([, v]) => v);
const EMOJI = ['😏', '💕', '🙌', '👌', '✨', '💯', '🎉', '😜'];

export function Comments({ id, onClose }: { id: string; onClose: () => void }) {
  const { me, keyboard } = usePhone();
  const s = useAppState();
  const now = useNow(10000);
  const bet = s.bets.find((b) => b.id === id)!;
  const [text, setText] = useState('');
  const [stickers, setStickers] = useState(false);
  const [q, setQ] = useState('');
  const [leaving, setLeaving] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const y0 = useRef<number | null>(null);

  useEffect(() => { markCommentsRead(id, me); }, [id, me, bet.comments.length]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [bet.comments.length]);

  const close = () => { setLeaving(true); setTimeout(onClose, 260); };
  const send = () => { if (!text.trim()) return; addComment(id, me, { text: text.trim() }); setText(''); };
  const sticker = (src: string) => { addComment(id, me, { sticker: src }); setStickers(false); };
  const pool = q.trim() ? [...GIPHY, ...MEMES].filter((_, i) => (i + q.length) % 2 === 0) : [...GIPHY, ...MEMES];

  return (
    <div className={`comments${leaving ? ' leaving' : ''}`}>
      <div
        className="c-head"
        onPointerDown={(e) => { y0.current = e.clientY; }}
        onPointerUp={(e) => { if (y0.current !== null && e.clientY - y0.current > 30) close(); y0.current = null; }}
        onClick={(e) => { if ((e.target as HTMLElement).classList.contains('grab')) close(); }}
      >
        <button className="grab" aria-label="Close comments" onClick={close} />
        <b>Comments</b>
        <button className="c-done tap" onClick={close}>Done</button>
      </div>
      <div className="c-list" ref={listRef}>
        {bet.comments.length === 0 && <p className="c-empty">No trash talk yet. Start it. 😏</p>}
        {bet.comments.map((c) => (
          <div key={c.id} className={`comment${c.by === me ? ' mine' : ''}`}>
            <Photo id={c.by} size={40} ring={1} />
            <div className="c-body">
              <span className="c-meta"><b>{firstName(c.by)}</b> {ago(c.at, now)}</span>
              {c.text && <p>{c.text}</p>}
              {c.sticker && <img className="c-sticker" src={c.sticker} alt="sticker" />}
              <button className="c-reply tap" onClick={() => { setText(`@${firstName(c.by)} `); inputRef.current?.focus(); }}>Reply</button>
            </div>
            <button className={`heart tap${c.likes.includes(me) ? ' on' : ''}`} onClick={() => likeComment(id, c.id, me)} aria-label="Like">
              <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.7 3 5 6.6 5c2.1 0 3.6 1.2 5.4 3.2C13.8 6.2 15.3 5 17.4 5 21 5 23 8.7 21.6 11.8 19.5 16.4 12 21 12 21z" /></svg>
              {c.likes.length > 0 && <small>{c.likes.length}</small>}
            </button>
          </div>
        ))}
      </div>
      <div className="c-bottom" style={{ transform: keyboard && !stickers ? 'translateY(calc(-1 * var(--kb) + 20px))' : undefined }}>
        <div className="emoji-row">
          {EMOJI.map((e) => <button key={e} className="tap" onClick={() => { setText((t) => t + e); inputRef.current?.focus(); }}>{e}</button>)}
        </div>
        <div className="composer">
          <Photo id={me} size={45} ring={1} />
          <input
            ref={inputRef}
            value={text}
            placeholder="Add a comment"
            data-sample="comment"
            enterKeyHint="send"
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setStickers(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          />
          {text.trim() ? (
            <button className="c-send tap" onClick={send} aria-label="Send"><img src={sendIcon} alt="" /></button>
          ) : (
            <button className={`c-send sticker tap${stickers ? ' on' : ''}`} onClick={() => setStickers((v) => !v)} aria-label="Stickers"><img src={stickerIcon} alt="" /></button>
          )}
        </div>
        {stickers && (
          <div className="stickers">
            <div className="st-head"><b>Stickers</b></div>
            <label className="search"><img src={searchIcon} alt="" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search GIPHY" enterKeyHint="search" /></label>
            <div className="st-grid">
              {pool.map((src, i) => (
                <button key={src} className="tap" style={{ animationDelay: `${i * 20}ms` }} onClick={() => sticker(src)}><img src={src} alt="" /></button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
