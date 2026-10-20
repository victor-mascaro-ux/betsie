// A standard iOS keyboard, in code: predictive bar, letters with shift and
// caps lock, 123 and #+= layers, emoji, hold-to-delete, double-space full stop,
// and a return key that reads "send" / "done" / "search" from the field.
// Desktop only; real phones bring their own keyboard.
import { useEffect, useRef, useState } from 'react';

type Field = HTMLInputElement | HTMLTextAreaElement;
export const KEYBOARD_HEIGHT = 336;

export const wantsKeyboard = (el: EventTarget | Element | null): el is Field =>
  !!el && (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && ['text', 'search', ''].includes(el.type))) && !(el as Field).readOnly;

type Layer = 'abc' | '123' | '#+=' | 'emoji';
const ROWS: Record<Exclude<Layer, 'emoji'>, string[][]> = {
  abc: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']],
  '123': [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'], ['.', ',', '?', '!', '’']],
  '#+=': [['[', ']', '{', '}', '#', '%', '^', '*', '+', '='], ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'], ['.', ',', '?', '!', '’']],
};
const EMOJI = ['😂', '🤣', '😏', '😜', '😎', '🥹', '😅', '😭', '😤', '🙃', '🤞', '🙌', '👏', '👌', '💪', '🔥', '💯', '✨', '🎉', '🏆', '👑', '🍀', '💕', '❤️', '😈', '🤡', '🫠', '😬', '🤔', '🙈', '☕', '🎤', '🎶', '🍕', '🧺', '🧦'];
const WORDS = ["I","I’m","I’ll","the","that","this","then","there","their","they","we","you","your","you’re","will","won’t","would","bet","before","by","next","week","weekend","tonight","tomorrow","today","Friday","Saturday","Sunday","Monday","hours","hour","home","how","have","has","had","going","gonna","go","down","never","always","maybe","might","more","most","minutes","minimum","meeting","over","time","coffee","laundry","lunch","brunch","dinner","onesie","concert","sing","song","Taylor","Swift","Sylvia","Maxine","Megan","Emily","Christopher","Andy","winner","wins","win","won","lose","loser","concede","confidence","crushing","defeat","about","after","again","all","also","and","any","are","because","been","best","better","big","can","can’t","could","day","did","didn’t","do","does","doesn’t","done","don’t","even","every","first","for","from","get","good","great","happen","happens","he","here","her","him","his","if","in","into","is","isn’t","it","it’s","just","know","last","late","least","like","long","look","lot","make","many","me","mom","much","my","new","no","not","now","of","off","on","once","one","only","or","other","our","out","own","people","really","right","said","say","see","she","should","show","so","some","still","sure","take","than","thank","thanks","them","these","thing","think","those","through","to","too","totally","two","up","us","very","want","was","way","well","were","what","when","where","which","who","why","with","without","work","yes","yet"];

const insert = (el: Field, text: string) => { el.focus(); document.execCommand('insertText', false, text); };
const del = (el: Field) => { el.focus(); document.execCommand('delete'); };
const before = (el: Field) => el.value.slice(0, el.selectionStart ?? el.value.length);
const autoShift = (el: Field | null) => !!el && (before(el).trim() === '' || /[.!?]\s+$/.test(before(el)));
const currentWord = (el: Field) => (before(el).match(/[\p{L}’']+$/u) || [''])[0];

const suggestions = (el: Field | null): string[] => {
  if (!el) return ['I', 'The', 'I’m'];
  const w = currentWord(el);
  if (!w) return /[.!?]\s*$/.test(before(el)) || !before(el).trim() ? ['I', 'The', 'I’m'] : ['the', 'will', 'that'];
  const lower = w.toLowerCase();
  const hits = WORDS.filter((x) => x.toLowerCase().startsWith(lower) && x.toLowerCase() !== lower).slice(0, 2);
  return [`“${w}”`, ...hits, ...['the', 'to', 'and'].filter((x) => !hits.includes(x))].slice(0, 3);
};

export function Keyboard({ target }: { target: Field | null }) {
  const [layer, setLayer] = useState<Layer>('abc');
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);
  const [, bump] = useState(0);
  const lastShift = useRef(0);
  const lastSpace = useRef(0);
  const repeat = useRef<number | null>(null);

  useEffect(() => {
    if (!target) { setLayer('abc'); return; }
    setShift(autoShift(target));
    const sync = () => { if (!caps) setShift(autoShift(target)); bump((x) => x + 1); };
    target.addEventListener('input', sync);
    target.addEventListener('click', sync);
    target.addEventListener('keyup', sync);
    return () => { target.removeEventListener('input', sync); target.removeEventListener('click', sync); target.removeEventListener('keyup', sync); };
  }, [target, caps]);

  const stopRepeat = () => { if (repeat.current) { clearTimeout(repeat.current); repeat.current = null; } };
  useEffect(() => stopRepeat, []);

  const after = () => { if (!target) return; if (!caps) setShift(autoShift(target)); bump((x) => x + 1); };
  const type = (ch: string) => {
    if (!target) return;
    insert(target, layer === 'abc' && (shift || caps) ? ch.toUpperCase() : ch);
    if (layer !== 'abc' && ch === '’') setLayer('abc');
    after();
  };
  const space = () => {
    if (!target) return;
    const now = Date.now();
    // Double-tap space: full stop, like iOS.
    if (now - lastSpace.current < 350 && /\w $/.test(before(target))) { del(target); insert(target, '. '); }
    else insert(target, ' ');
    lastSpace.current = now;
    if (layer !== 'abc') setLayer('abc');
    after();
  };
  const backspace = () => {
    if (!target) return;
    del(target); after();
    repeat.current = window.setTimeout(function rep() { del(target); after(); repeat.current = window.setTimeout(rep, 70); }, 420);
  };
  const shiftKey = () => {
    const now = Date.now();
    if (now - lastShift.current < 320) { setCaps(true); setShift(true); }
    else if (caps) { setCaps(false); setShift(false); }
    else setShift((v) => !v);
    lastShift.current = now;
  };
  const ret = () => {
    if (!target) return;
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    if (target.dispatchEvent(ev)) target.blur();
  };
  const suggest = (s: string) => {
    if (!target) return;
    const w = currentWord(target);
    for (let i = 0; i < w.length; i++) document.execCommand('delete');
    insert(target, `${s.replace(/[“”]/g, '')} `);
    after();
  };

  // Every key press keeps focus in the field.
  const keep = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();
  const press = (id: string, fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => { keep(e); setPressed(id); fn(); },
    onPointerUp: () => { setPressed(null); stopRepeat(); },
    onPointerLeave: () => { setPressed((p) => (p === id ? null : p)); stopRepeat(); },
  });

  const hint = target?.enterKeyHint;
  const returnLabel = hint === 'send' ? 'send' : hint === 'done' ? 'done' : hint === 'search' ? 'search' : 'return';
  const up = layer === 'abc' && (shift || caps);
  const sugg = suggestions(target);

  return (
    <div className={`ios-kb${target ? ' up' : ''}`} onMouseDown={keep} role="group" aria-label="Keyboard">
      <div className="kb-suggest">
        {sugg.map((s, i) => <button key={i} {...press(`s${i}`, () => suggest(s))} className={pressed === `s${i}` ? 'down' : ''}>{s}</button>)}
      </div>
      {layer === 'emoji' ? (
        <div className="kb-emoji">
          <small>FREQUENTLY USED</small>
          <div className="kb-emoji-grid">
            {EMOJI.map((e) => <button key={e} {...press(e, () => target && (insert(target, e), after()))}>{e}</button>)}
          </div>
        </div>
      ) : (
        <div className="kb-keys">
          {ROWS[layer].map((row, r) => (
            <div key={r} className={`kb-row r${r}${layer !== 'abc' && r === 2 ? ' sym' : ''}`}>
              {r === 2 && (layer === 'abc'
                ? <button className={`kb-fn shift${shift || caps ? ' on' : ''}${caps ? ' caps' : ''}`} {...press('shift', shiftKey)} aria-label="Shift"><ShiftIcon filled={shift || caps} /></button>
                : <button className="kb-fn wide-sym" {...press('alt', () => setLayer(layer === '123' ? '#+=' : '123'))}>{layer === '123' ? '#+=' : '123'}</button>)}
              {row.map((k) => (
                <button key={k} className={`kb-key${pressed === k ? ' down' : ''}`} {...press(k, () => type(k))}>
                  {up ? k.toUpperCase() : k}
                  {pressed === k && <span className="kb-pop">{up ? k.toUpperCase() : k}</span>}
                </button>
              ))}
              {r === 2 && <button className={`kb-fn back${pressed === 'back' ? ' down' : ''}`} {...press('back', backspace)} aria-label="Delete"><BackIcon /></button>}
            </div>
          ))}
        </div>
      )}
      <div className="kb-row r3">
        <button className="kb-fn mode" {...press('mode', () => setLayer(layer === 'abc' ? '123' : 'abc'))}>{layer === 'abc' ? '123' : 'ABC'}</button>
        <button className={`kb-key space${pressed === 'space' ? ' down' : ''}`} {...press('space', space)}>space</button>
        <button className={`kb-fn ret${returnLabel !== 'return' ? ' blue' : ''}`} {...press('ret', ret)}>{returnLabel}</button>
      </div>
      <div className="kb-bottom">
        <button {...press('emoji', () => setLayer(layer === 'emoji' ? 'abc' : 'emoji'))} aria-label="Emoji" className={layer === 'emoji' ? 'on' : ''}>
          <svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="11.5" /><circle cx="10" cy="11.5" r="1.4" className="f" /><circle cx="18" cy="11.5" r="1.4" className="f" /><path d="M8.5 16.5c1.4 2.4 3.3 3.5 5.5 3.5s4.1-1.1 5.5-3.5" /></svg>
        </button>
        <svg className="mic" viewBox="0 0 20 28" aria-hidden="true"><rect x="6" y="2" width="8" height="15" rx="4" /><path d="M2.5 13.5a7.5 7.5 0 0 0 15 0M10 21v4.5M6 25.5h8" /></svg>
      </div>
    </div>
  );
}

function ShiftIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" className={filled ? 'f' : ''}><path d="M12 3.5 3.5 12.5H8V20h8v-7.5h4.5z" /></svg>;
}
function BackIcon() {
  return <svg viewBox="0 0 28 20"><path d="M9 2h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9L1.5 10z" /><path d="m13 6.5 7 7m0-7-7 7" /></svg>;
}
