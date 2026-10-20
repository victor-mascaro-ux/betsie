import { friendsOf, fullName } from '../data/people';
import { useAppState } from '../data/store';
import { headToHead, record } from '../data/stats';
import type { PersonId } from '../data/types';
import { usePhone } from '../os/context';
import type { Nav } from './BetsieApp';
import { Photo, TitleBar } from './chrome';

export function Friends({ onBet }: { nav: Nav; onBet: (vs: PersonId) => void }) {
  const { me } = usePhone();
  const s = useAppState();
  return (
    <div className="screen friends">
      <TitleBar title="YOUR BESTIES" />
      <div className="friend-list">
        {friendsOf(me).map((p, i) => {
          const h = headToHead(s, me, p);
          const r = record(s, p);
          return (
            <div className="friend-row" key={p} style={{ animationDelay: `${i * 30}ms` }}>
              <Photo id={p} size={50} ring={1} />
              <span className="fr-name">
                <b>{fullName(p)}</b>
                <small>{r.w} - {r.l} overall · you’re {h.a} - {h.b}</small>
              </span>
              <button className="select tap" onClick={() => onBet(p)}>BET</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
