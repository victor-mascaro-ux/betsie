// Scene data (built by figma/build-scene.mjs) and the DOM renderer.
// Every Figma layer becomes one absolutely positioned element at its exact
// Figma geometry; styles arrive precomputed as CSS.

export type Trigger = 'click' | 'timeout' | 'drag' | 'hover' | 'press' | 'enter' | 'leave';

export interface Transition {
  k: string; // SMART_ANIMATE | DISSOLVE | SCROLL_ANIMATE | MOVE_IN ...
  ms: number;
  e: string; // easing type
  bz?: { x1: number; y1: number; x2: number; y2: number };
}

export interface Reaction {
  tg: Trigger;
  ms?: number;
  nav?: string;
  d?: string;
  tr?: Transition | null;
  back?: 1;
}

export interface SNode {
  n?: string; // layer name (Smart Animate matches on it)
  t?: 'x' | 'i'; // text | image (Figma-exported SVG)
  g: [number, number, number, number]; // x, y, w, h in the parent's space
  m?: number[]; // full matrix when rotated / flipped
  o?: number; // opacity
  h?: 1; // hidden
  s?: string; // static CSS
  bg?: string; // solid fill (animatable)
  r?: string; // border-radius
  fl?: string[]; // fill layers that need their own element
  k?: string; // stroke overlay CSS
  c?: 1; // clips content
  sc?: 'x' | 'y' | 'xy'; // scrolls
  x?: string; // text HTML
  src?: string; // image source
  re?: Reaction[];
  ch?: SNode[];
  w?: 1; // mask wrapper (not a Figma layer)
  // runtime
  key?: string;
}

export interface SFrame {
  id: string;
  n: string;
  w: number;
  h: number;
  bg: string | null;
  s: string;
  re?: Reaction[];
  c: 0 | 1;
  ch: SNode[];
}

export interface SceneIndex {
  starts: { id: string; name: string }[];
  frames: Record<string, { n: string; w: number; h: number }>;
}

export interface Entry {
  node: SNode;
  el: HTMLElement | null; // null when hidden
  box: HTMLElement | null; // where children live
  parentKey: string | null;
}

export interface Rendered {
  frame: SFrame;
  root: HTMLElement;
  map: Map<string, Entry>;
  reactions: WeakMap<Element, Reaction[]>;
  nodes: WeakMap<Element, SNode>;
}

const fileOf = (id: string) => `scene/frames/${id.replace(':', '-')}.json`;
const cache = new Map<string, Promise<SFrame>>();

export const loadFrame = (id: string): Promise<SFrame> => {
  let p = cache.get(id);
  if (!p) {
    p = fetch(fileOf(id)).then((r) => {
      if (!r.ok) throw new Error(`frame ${id}: ${r.status}`);
      return r.json() as Promise<SFrame>;
    }).then((f) => { assignKeys(f.ch, ''); return f; });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
};

// Smart Animate pairs layers by name path; repeated names pair by order.
const assignKeys = (nodes: SNode[], parent: string) => {
  const seen = new Map<string, number>();
  const visit = (list: SNode[]) => {
    for (const n of list) {
      if (n.w) { visit(n.ch || []); continue; }
      const name = n.n || '';
      const i = seen.get(name) || 0;
      seen.set(name, i + 1);
      n.key = `${parent}/${name}#${i}`;
      if (n.ch) assignKeys(n.ch, n.key);
    }
  };
  visit(nodes);
};

export const geomCss = (n: SNode) => {
  const [x, y, w, h] = n.g;
  let css = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
  if (n.m) css += `transform:matrix(${n.m.join(',')});`;
  return css;
};

const nodeCss = (n: SNode) => {
  let css = geomCss(n);
  if (n.o !== undefined) css += `opacity:${n.o};`;
  if (n.bg) css += `background-color:${n.bg};`;
  if (n.r) css += `border-radius:${n.r};`;
  if (n.s) css += n.s;
  return css;
};

const preloaded = new Set<string>();
export const preloadAssets = (nodes: SNode[]) => {
  const urls: string[] = [];
  const walk = (list: SNode[]) => {
    for (const n of list) {
      if (n.h) continue;
      if (n.src) urls.push(n.src);
      for (const css of [n.s, ...(n.fl || [])]) {
        if (!css) continue;
        for (const m of css.matchAll(/url\("([^"]+)"\)/g)) urls.push(m[1]);
      }
      if (n.ch) walk(n.ch);
    }
  };
  walk(nodes);
  return Promise.all(urls.filter((u) => !preloaded.has(u)).map((u) => {
    preloaded.add(u);
    const img = new Image();
    img.src = u;
    return img.decode().catch(() => undefined);
  }));
};

export const renderNode = (n: SNode, r: Omit<Rendered, 'root'>, parentKey: string | null): HTMLElement | null => {
  if (n.w) {
    const wrap = document.createElement('div');
    wrap.className = 'n mk';
    wrap.style.cssText = geomCss(n) + (n.s || '');
    for (const c of n.ch || []) { const el = renderNode(c, r, parentKey); if (el) wrap.append(el); }
    return wrap;
  }
  if (n.h) {
    r.map.set(n.key!, { node: n, el: null, box: null, parentKey });
    return null;
  }
  let el: HTMLElement;
  let box: HTMLElement | null = null;
  if (n.t === 'i') {
    const img = document.createElement('img');
    img.src = n.src!;
    img.alt = '';
    img.draggable = false;
    img.className = 'n';
    el = img;
  } else {
    el = document.createElement('div');
    el.className = n.t === 'x' ? 'n t' : 'n';
  }
  el.style.cssText = nodeCss(n);
  if (n.t === 'x') el.innerHTML = n.x || '';
  if (n.fl) for (const css of n.fl) {
    const layer = document.createElement('div');
    layer.className = 'fl';
    layer.style.cssText = css;
    el.append(layer);
  }
  if (n.ch && n.ch.length) {
    box = el;
    if (n.c || n.sc) {
      box = document.createElement('div');
      box.className = n.sc ? `cl sc-${n.sc}` : 'cl';
      el.append(box);
    }
    for (const c of n.ch) { const child = renderNode(c, r, n.key!); if (child) box.append(child); }
  }
  if (n.k) {
    const st = document.createElement('div');
    st.className = 'st';
    st.style.cssText = n.k;
    el.append(st);
  }
  if (n.re) {
    r.reactions.set(el, n.re);
    if (n.re.some((x) => x.tg === 'click' || x.tg === 'drag')) el.classList.add('hs');
  }
  r.map.set(n.key!, { node: n, el, box, parentKey });
  r.nodes.set(el, n);
  return el;
};

export const renderFrame = (frame: SFrame): Rendered => {
  const root = document.createElement('div');
  root.className = 'frame';
  root.style.cssText = `width:${frame.w}px;height:${frame.h}px;${frame.bg ? `background-color:${frame.bg};` : ''}${frame.c ? 'overflow:hidden;' : ''}`;
  if (frame.s) {
    // Image / gradient fills of the frame get their own layer so transitions can fade them.
    const paint = document.createElement('div');
    paint.className = 'fl paint';
    paint.style.cssText = frame.s;
    root.append(paint);
  }
  const r: Rendered = { frame, root, map: new Map(), reactions: new WeakMap(), nodes: new WeakMap() };
  r.map.set('', { node: { g: [0, 0, frame.w, frame.h], ch: frame.ch, key: '' }, el: root, box: root, parentKey: null });
  for (const c of frame.ch) { const el = renderNode(c, r, ''); if (el) root.append(el); }
  if (frame.re) r.reactions.set(root, frame.re);
  return r;
};
