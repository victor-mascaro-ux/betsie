// Turns the raw Figma dump (figma/raw, written by extract.js + receiver.mjs)
// into the compact scene the player renders (public/scene).
//
//   node figma/build-scene.mjs
//
// Every layer keeps its exact Figma geometry, fills, strokes, effects and text
// styling, precomputed as CSS. Vector art arrives as Figma-exported SVGs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'figma', 'raw');
const OUT = path.join(ROOT, 'public', 'scene');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const fileId = (id) => id.replace(':', '-');
const r2 = (v) => Math.round(v * 100) / 100;
const px = (v) => `${r2(v)}px`;

// ---------- affine helpers: [a, b, c, d, e, f] like CSS matrix() ----------
const fromFigma = (t) => [t[0][0], t[1][0], t[0][1], t[1][1], t[0][2], t[1][2]];
const mul = (A, B) => [
  A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
];
const inv = (M) => {
  const [a, b, c, d, e, f] = M; const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
};
const isTranslate = (M) => Math.abs(M[0] - 1) < 1e-4 && Math.abs(M[1]) < 1e-4 && Math.abs(M[2]) < 1e-4 && Math.abs(M[3] - 1) < 1e-4;

// ---------- colours ----------
const hex2 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
const rgba = (c, alpha = 1) => {
  const a = (c.a ?? 1) * alpha;
  if (a >= 0.999) return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${Math.round(a * 1000) / 1000})`;
};
const visible = (arr) => (Array.isArray(arr) ? arr.filter((p) => p.visible !== false) : []);

// ---------- images: track the largest size each one is drawn at ----------
const imageMeta = new Map(readJson(path.join(RAW, 'images.json')).map((i) => Array.isArray(i)
  ? [i[0], { ext: i[1], w: i[2], h: i[3] }] : [i.h, { ext: i.ext, w: i.w, h: i.hgt }]));
const imageNeed = new Map(); // hash -> px width needed at 2x
const needImage = (hash, drawnWidth) => {
  const want = Math.ceil(drawnWidth * 2);
  imageNeed.set(hash, Math.max(imageNeed.get(hash) || 0, want));
};
const imageUrl = (hash) => {
  const m = imageMeta.get(hash);
  return `scene/img/${hash.slice(0, 16)}.${m && m.ext === 'gif' ? 'gif' : 'webp'}`;
};

// ---------- paints -> CSS background layers ----------
const linearCss = (fill, w, h) => {
  const T = fill.gradientTransform; // node(0..1) -> gradient space
  const A = T[0][0] / w, B = T[0][1] / h, C = T[0][2];
  const mag = Math.hypot(A, B);
  const stops = fill.gradientStops;
  if (mag < 1e-9) return { layer: `linear-gradient(${rgba(stops[0].color, fill.opacity)}, ${rgba(stops[0].color, fill.opacity)})` };
  const ux = A / mag, uy = B / mag;
  const deg = (Math.atan2(ux, -uy) * 180) / Math.PI;
  const L = Math.abs(w * ux) + Math.abs(h * uy);
  const gc = A * (w / 2) + B * (h / 2) + C;
  const s = stops.map((st) => `${rgba(st.color, fill.opacity)} ${r2((0.5 + (st.position - gc) / (L * mag)) * 100)}%`);
  return { layer: `linear-gradient(${r2(deg)}deg, ${s.join(', ')})` };
};
const radialCss = (fill, w, h) => {
  const Ti = inv(fromFigma(fill.gradientTransform));
  const ap = (u, v) => [(Ti[0] * u + Ti[2] * v + Ti[4]) * w, (Ti[1] * u + Ti[3] * v + Ti[5]) * h];
  const c = ap(0.5, 0.5), h1 = ap(1, 0.5), h2 = ap(0.5, 1);
  const v1 = [h1[0] - c[0], h1[1] - c[1]], v2 = [h2[0] - c[0], h2[1] - c[1]];
  const horiz1 = Math.abs(v1[0]) >= Math.abs(v1[1]);
  const rx = Math.hypot(...(horiz1 ? v1 : v2)), ry = Math.hypot(...(horiz1 ? v2 : v1));
  const s = fill.gradientStops.map((st) => `${rgba(st.color, fill.opacity)} ${r2(st.position * 100)}%`);
  return { layer: `radial-gradient(ellipse ${px(rx)} ${px(ry)} at ${px(c[0])} ${px(c[1])}, ${s.join(', ')})` };
};
const imageCss = (fill, w, h) => {
  const meta = imageMeta.get(fill.imageHash) || { w, h };
  const url = `url("${imageUrl(fill.imageHash)}")`;
  if (fill.scaleMode === 'CROP' && fill.imageTransform) {
    const t = fill.imageTransform; const sx = t[0][0], sy = t[1][1], tx = t[0][2], ty = t[1][2];
    const bw = w / sx, bh = h / sy;
    needImage(fill.imageHash, bw);
    return { layer: `${url} ${px(-tx * bw)} ${px(-ty * bh)} / ${px(bw)} ${px(bh)} no-repeat` };
  }
  if (fill.scaleMode === 'TILE') {
    const k = fill.scalingFactor || 1;
    needImage(fill.imageHash, meta.w * k);
    return { layer: `${url} 0 0 / ${px(meta.w * k)} ${px(meta.h * k)} repeat` };
  }
  const fit = fill.scaleMode === 'FIT';
  const s = fit ? Math.min(w / meta.w, h / meta.h) : Math.max(w / meta.w, h / meta.h);
  needImage(fill.imageHash, meta.w * s);
  return { layer: `${url} center / ${fit ? 'contain' : 'cover'} no-repeat` };
};
const paintLayer = (fill, w, h) => {
  if (fill.type === 'SOLID') { const c = rgba(fill.color, fill.opacity); return { layer: `linear-gradient(${c}, ${c})`, solid: c }; }
  if (fill.type === 'GRADIENT_LINEAR') return linearCss(fill, w, h);
  if (fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_DIAMOND') return radialCss(fill, w, h);
  if (fill.type === 'GRADIENT_ANGULAR') {
    const s = fill.gradientStops.map((st) => `${rgba(st.color, fill.opacity)} ${r2(st.position * 360)}deg`);
    return { layer: `conic-gradient(${s.join(', ')})` };
  }
  if (fill.type === 'IMAGE') return imageCss(fill, w, h);
  return null;
};
const BLEND = { MULTIPLY: 'multiply', SCREEN: 'screen', OVERLAY: 'overlay', DARKEN: 'darken', LIGHTEN: 'lighten', COLOR_DODGE: 'color-dodge', COLOR_BURN: 'color-burn', HARD_LIGHT: 'hard-light', SOFT_LIGHT: 'soft-light', DIFFERENCE: 'difference', EXCLUSION: 'exclusion', HUE: 'hue', SATURATION: 'saturation', COLOR: 'color', LUMINOSITY: 'luminosity', LINEAR_BURN: 'color-burn', LINEAR_DODGE: 'color-dodge' };

// Returns { css, bg (animatable solid), layers (separate divs when needed) }
const fillsToCss = (fills, w, h) => {
  const vis = visible(fills);
  if (!vis.length) return {};
  const needLayers = vis.some((f) => (f.type === 'IMAGE' && (f.opacity ?? 1) < 0.999) || (f.blendMode && f.blendMode !== 'NORMAL' && f.blendMode !== 'PASS_THROUGH'));
  if (needLayers) {
    const layers = vis.map((f) => {
      const p = paintLayer(f, w, h); if (!p) return null;
      let css = `background:${p.layer.replace(/^linear-gradient\((#[0-9a-f]+|rgba\([^)]*\)), \1\)$/, '$1')};`;
      if (f.type === 'IMAGE' && (f.opacity ?? 1) < 0.999) css += `opacity:${r2(f.opacity)};`;
      if (f.blendMode && BLEND[f.blendMode]) css += `mix-blend-mode:${BLEND[f.blendMode]};`;
      return css;
    }).filter(Boolean);
    return { layers };
  }
  if (vis.length === 1 && vis[0].type === 'SOLID') { const c = rgba(vis[0].color, vis[0].opacity); return { bg: c }; }
  const parts = vis.map((f) => paintLayer(f, w, h)).filter(Boolean).reverse(); // CSS: first = top
  return { css: `background:${parts.map((p) => p.layer).join(', ')};` };
};

// ---------- corner radius ----------
const radii = (n) => {
  if (n.type === 'ELLIPSE') return '50%';
  const tl = n.cornerRadius === 'MIXED' ? n.topLeftRadius : n.cornerRadius;
  if (n.cornerRadius !== 'MIXED') return tl ? px(tl) : '';
  const c = [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius];
  return c.some((v) => v) ? c.map(px).join(' ') : '';
};
const growRadius = (n, by) => {
  if (n.type === 'ELLIPSE') return '50%';
  const c = n.cornerRadius === 'MIXED' ? [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius] : [n.cornerRadius || 0];
  if (!c.some((v) => v)) return '';
  return c.map((v) => px(v ? v + by : 0)).join(' ');
};

// ---------- strokes -> overlay div ----------
const strokeCss = (n) => {
  const s = visible(n.strokes).filter((p) => p.type === 'SOLID' || p.gradientStops).pop();
  if (!s) return '';
  const color = s.type === 'SOLID' ? rgba(s.color, s.opacity) : rgba(s.gradientStops[0].color, s.opacity);
  const perSide = n.strokeWeight === 'MIXED' || ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'].some((k) => n[k] !== undefined && n[k] !== n.strokeWeight);
  const ws = perSide ? [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight].map((v) => v || 0) : [n.strokeWeight, n.strokeWeight, n.strokeWeight, n.strokeWeight];
  if (!ws.some((v) => v > 0)) return '';
  const align = n.strokeAlign || 'INSIDE';
  const k = align === 'INSIDE' ? 0 : align === 'CENTER' ? 0.5 : 1;
  const style = n.dashPattern && n.dashPattern.length ? 'dashed' : 'solid';
  const inset = ws.map((v) => px(-v * k)).join(' ');
  const rad = k ? growRadius(n, ws[0] * k) : radii(n);
  return `inset:${inset};border-style:${style};border-color:${color};border-width:${ws.map(px).join(' ')};${rad ? `border-radius:${rad};` : ''}`;
};

// ---------- effects ----------
const effectsCss = (n, hasFill) => {
  const fx = visible(n.effects);
  if (!fx.length) return '';
  const box = []; const drops = []; let css = '';
  for (const e of fx) {
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      const c = rgba(e.color);
      const sh = `${px(e.offset.x)} ${px(e.offset.y)} ${px(e.radius)} ${px(e.spread || 0)} ${c}`;
      if (e.type === 'INNER_SHADOW') box.push(`inset ${sh}`);
      else if (hasFill) box.push(sh);
      else drops.push(`drop-shadow(${px(e.offset.x)} ${px(e.offset.y)} ${px(e.radius)} ${c})`);
    } else if (e.type === 'BACKGROUND_BLUR' && n.type !== 'TEXT') {
      css += `backdrop-filter:blur(${px(e.radius / 2)});-webkit-backdrop-filter:blur(${px(e.radius / 2)});`;
    } else if (e.type === 'LAYER_BLUR') {
      drops.push(`blur(${px(e.radius / 2)})`);
    }
  }
  if (box.length) css += `box-shadow:${box.reverse().join(', ')};`;
  if (drops.length) css += `filter:${drops.join(' ')};`;
  return css;
};

// ---------- text ----------
const FONT_STACK = {
  'SF Pro Text': 'var(--sf-text)', 'SF Pro': 'var(--sf)', 'SF Pro Display': 'var(--sf-display)',
  Roboto: 'Roboto, var(--sf)', 'Passion One': "'Passion One', var(--sf)",
};
const attr = (css) => css.replace(/"/g, "'");
const WEIGHTS = [['thin', 100], ['ultralight', 200], ['extralight', 200], ['light', 300], ['medium', 500], ['semibold', 600], ['demibold', 600], ['extrabold', 800], ['bold', 700], ['heavy', 800], ['black', 900]];
const weightOf = (style) => { const s = style.toLowerCase().replace(/[\s-]/g, ''); for (const [k, w] of WEIGHTS) if (s.includes(k)) return w; return 400; };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lineHeight = (lh, size) => lh.unit === 'PIXELS' ? px(lh.value) : lh.unit === 'PERCENT' ? px((lh.value / 100) * size) : 'normal';
const letterSpacing = (ls, size) => (!ls || !ls.value) ? '' : ls.unit === 'PIXELS' ? px(ls.value) : px((ls.value / 100) * size);
const CASE = { UPPER: 'uppercase', LOWER: 'lowercase', TITLE: 'capitalize', SMALL_CAPS: 'small-caps', SMALL_CAPS_FORCED: 'small-caps' };

const runCss = (seg) => {
  const fam = seg.fontName.family;
  const fill = visible(seg.fills).filter((f) => f.type === 'SOLID').pop();
  let css = `font-family:${FONT_STACK[fam] || `"${fam}", var(--sf)`};font-size:${px(seg.fontSize)};font-weight:${weightOf(seg.fontName.style)};line-height:${lineHeight(seg.lineHeight, seg.fontSize)};`;
  if (/italic|oblique/i.test(seg.fontName.style)) css += 'font-style:italic;';
  const ls = letterSpacing(seg.letterSpacing, seg.fontSize); if (ls) css += `letter-spacing:${ls};`;
  css += `color:${fill ? rgba(fill.color, fill.opacity) : 'transparent'};`;
  if (seg.textDecoration === 'UNDERLINE') css += 'text-decoration:underline;';
  if (seg.textDecoration === 'STRIKETHROUGH') css += 'text-decoration:line-through;';
  const tc = CASE[seg.textCase];
  if (tc === 'small-caps') css += 'font-variant-caps:small-caps;'; else if (tc) css += `text-transform:${tc};`;
  return css;
};

const textHtml = (n) => {
  const segs = (n.segments || []).slice().sort((a, b) => a.start - b.start);
  const paras = [{ runs: [], seg: segs[0] }];
  for (const seg of segs) {
    const parts = seg.characters.split('\n');
    parts.forEach((t, i) => {
      if (i > 0) paras.push({ runs: [], seg });
      const p = paras[paras.length - 1];
      if (!p.runs.length && t === '' && i < parts.length - 1) p.seg = seg;
      if (t) { if (!p.runs.length) p.seg = seg; p.runs.push({ t, seg }); }
    });
  }
  if (paras.length > 1 && !paras[paras.length - 1].runs.length && n.characters.endsWith('\n')) {
    // Figma keeps the trailing empty line; so does pre-wrap + an empty paragraph.
  }
  const truncate = n.textTruncation === 'ENDING';
  return paras.map((p, i) => {
    const s = p.seg || segs[0];
    const list = s.listOptions && s.listOptions.type !== 'NONE' ? s.listOptions.type : null;
    const indent = s.indentation || 0;
    let css = `font-size:${px(s.fontSize)};line-height:${lineHeight(s.lineHeight, s.fontSize)};`;
    if (n.paragraphSpacing && i < paras.length - 1) css += `margin-bottom:${px(n.paragraphSpacing)};`;
    if (n.paragraphIndent && !list) css += `text-indent:${px(n.paragraphIndent)};`;
    if (truncate && !(n.maxLines > 1)) css += 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    let html = p.runs.map((r) => `<span style="${attr(runCss(r.seg))}">${esc(r.t).replace(/\u2028/g, '<br>')}</span>`).join('');
    if (!html) html = `<span style="${attr(runCss(s))}">\u200b</span>`;
    if (list) {
      const ind = s.fontSize * 1.5 * Math.max(1, indent);
      css += `padding-left:${px(ind)};position:relative;`;
      const marker = list === 'ORDERED' ? `${i + 1}.` : '•';
      html = `<span class="li" style="${attr(runCss(s))}left:${px(ind - s.fontSize * 1.05)}">${marker}</span>${html}`;
    }
    return `<p style="${attr(css)}">${html}</p>`;
  }).join('');
};

// ---------- node conversion ----------
const textBoxCss = (n) => {
  const va = { TOP: 'flex-start', CENTER: 'center', BOTTOM: 'flex-end' }[n.textAlignVertical] || 'flex-start';
  const ha = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' }[n.textAlignHorizontal] || 'left';
  let css = `justify-content:${va};text-align:${ha};`;
  if (n.textAutoResize === 'WIDTH_AND_HEIGHT') css += 'white-space:pre;';
  if (n.textTruncation === 'ENDING' && n.maxLines > 1) css += `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n.maxLines};overflow:hidden;`;
  return css;
};

const reactionsOf = (n) => {
  const out = [];
  for (const r of n.reactions || []) {
    const tg = { ON_CLICK: 'click', AFTER_TIMEOUT: 'timeout', ON_DRAG: 'drag', ON_HOVER: 'hover', ON_PRESS: 'press', MOUSE_ENTER: 'enter', MOUSE_LEAVE: 'leave' }[r.trigger && r.trigger.type];
    if (!tg) continue;
    const acts = (r.actions || (r.action ? [r.action] : [])).filter((a) => a && a.type === 'NODE' && a.destinationId);
    if (!acts.length) {
      if ((r.actions || []).some((a) => a && a.type === 'BACK')) out.push({ tg, back: 1 });
      continue;
    }
    for (const a of acts) {
      const t = a.transition;
      const tr = t ? { k: t.type, ms: Math.round(t.duration * 1000), e: t.easing ? t.easing.type : 'LINEAR' } : null;
      if (t && t.easing && t.easing.easingFunctionCubicBezier) tr.bz = t.easing.easingFunctionCubicBezier;
      out.push({ tg, ms: tg === 'timeout' ? Math.round((r.trigger.timeout || 0) * 1000) : undefined, nav: a.navigation, d: a.destinationId, tr });
    }
  }
  return out.length ? out : undefined;
};

const geom = (o, M, w, h) => {
  if (isTranslate(M)) o.g = [r2(M[4]), r2(M[5]), r2(w), r2(h)];
  else { o.g = [0, 0, r2(w), r2(h)]; o.m = M.map((v, i) => (i < 4 ? Math.round(v * 1e5) / 1e5 : r2(v))); }
};

const usedSvgs = new Set();
let fixScroll = 0;

const conv = (n, parentAbs) => {
  const abs = fromFigma(n.absoluteTransform);
  const o = { n: n.name };
  if (n.visible === false) {
    geom(o, mul(inv(parentAbs), abs), n.width, n.height); o.h = 1;
    if (n.type === 'TEXT') o.t = 'x';
    return o;
  }
  const re = reactionsOf(n); if (re) o.re = re;
  const blend = n.blendMode && BLEND[n.blendMode];

  if (n.svg) {
    const M = mul(inv(parentAbs), [1, 0, 0, 1, n.svg.x, n.svg.y]);
    geom(o, M, n.svg.w, n.svg.h2);
    o.t = 'i'; o.src = `scene/svg/${n.svg.h}.svg`; usedSvgs.add(n.svg.h);
    if (blend) o.s = `mix-blend-mode:${blend};`;
    return o;
  }

  geom(o, mul(inv(parentAbs), abs), n.width, n.height);
  if (n.opacity !== undefined && n.opacity < 0.999) o.o = r2(n.opacity);
  let css = blend ? `mix-blend-mode:${blend};` : '';

  if (n.type === 'TEXT') {
    o.t = 'x';
    o.s = css + textBoxCss(n) + effectsCss(n, false);
    o.x = textHtml(n);
    return o;
  }

  const fills = fillsToCss(n.type === 'GROUP' ? [] : n.fills, n.width, n.height);
  if (fills.bg) o.bg = fills.bg;
  if (fills.css) css += fills.css;
  if (fills.layers) o.fl = fills.layers;
  const rad = radii(n);
  if (rad) o.r = rad;
  css += effectsCss(n, !!(fills.bg || fills.css || fills.layers));
  const st = n.type === 'GROUP' ? '' : strokeCss(n);
  if (st) o.k = st;
  const clips = n.clipsContent && n.type !== 'GROUP';
  const scroll = n.overflowDirection && n.overflowDirection !== 'NONE' ? n.overflowDirection : null;
  if (scroll) { o.sc = scroll === 'HORIZONTAL' ? 'x' : scroll === 'VERTICAL' ? 'y' : 'xy'; fixScroll++; }
  else if (clips) o.c = 1;
  if (n.fillGeometry && n.fillGeometry.length) {
    const rule = n.fillGeometry[0].windingRule === 'EVENODD' ? 'evenodd, ' : '';
    css += `clip-path:path(${rule}'${n.fillGeometry.map((g) => g.data).join(' ')}');`;
  }
  if (css) o.s = css;

  if (n.children && n.children.length) o.ch = convChildren(n.children, abs, n);
  return o;
};

// Masks clip every later sibling; wrap those siblings in a clipping layer.
const convChildren = (children, parentAbs, parent) => {
  const out = [];
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.isMask && c.visible !== false) {
      const rest = convChildren(children.slice(i + 1), parentAbs, parent);
      const wrap = { w: 1, g: [0, 0, r2(parent.width), r2(parent.height)], ch: rest };
      const M = mul(inv(parentAbs), fromFigma(c.absoluteTransform));
      if (!c.svg && isTranslate(M) && (c.type === 'ELLIPSE' || c.type === 'RECTANGLE' || c.type === 'FRAME')) {
        const [x, y, w, h] = [M[4], M[5], c.width, c.height];
        wrap.s = c.type === 'ELLIPSE'
          ? `clip-path:ellipse(${px(w / 2)} ${px(h / 2)} at ${px(x + w / 2)} ${px(y + h / 2)});`
          : `clip-path:inset(${px(y)} ${px(parent.width - x - w)} ${px(parent.height - y - h)} ${px(x)}${radii(c) ? ` round ${radii(c)}` : ''});`;
      } else if (c.svg) {
        const S = mul(inv(parentAbs), [1, 0, 0, 1, c.svg.x, c.svg.y]);
        usedSvgs.add(c.svg.h);
        const mode = c.maskType === 'LUMINANCE' ? 'luminance' : 'alpha';
        wrap.s = `-webkit-mask:url("scene/svg/${c.svg.h}.svg") ${px(S[4])} ${px(S[5])} / ${px(c.svg.w)} ${px(c.svg.h2)} no-repeat;mask:url("scene/svg/${c.svg.h}.svg") ${px(S[4])} ${px(S[5])} / ${px(c.svg.w)} ${px(c.svg.h2)} no-repeat;mask-mode:${mode};`;
      } else {
        const [x, y] = [M[4], M[5]];
        wrap.s = `clip-path:inset(${px(y)} ${px(parent.width - x - c.width)} ${px(parent.height - y - c.height)} ${px(x)});`;
      }
      out.push(wrap);
      break;
    }
    out.push(conv(c, parentAbs));
  }
  return out;
};

// ---------- reachability ----------
const graph = readJson(path.join(RAW, 'graph.json'));
const raw = new Map();
for (const f of fs.readdirSync(path.join(RAW, 'frames'))) { const j = readJson(path.join(RAW, 'frames', f)); raw.set(j.id, j); }
const links = (n, out = []) => { for (const r of n.reactions || []) for (const a of r.actions || []) if (a && a.destinationId) out.push(a.destinationId); (n.children || []).forEach((c) => links(c, out)); return out; };
const reach = new Set(); const queue = graph.starts.map((s) => s.nodeId);
queue.forEach((id) => reach.add(id));
while (queue.length) { const id = queue.shift(); const f = raw.get(id); if (!f) continue; for (const d of links(f)) if (raw.has(d) && !reach.has(d)) { reach.add(d); queue.push(d); } }

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ['frames', 'svg', 'img']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const index = { starts: graph.starts.map((s) => ({ id: s.nodeId, name: s.name })), frames: {} };
let bytes = 0;
for (const id of reach) {
  const f = raw.get(id);
  const abs = fromFigma(f.absoluteTransform);
  const fills = fillsToCss(f.fills, f.width, f.height);
  const scene = {
    id, n: f.name, w: r2(f.width), h: r2(f.height), bg: fills.bg || null, s: fills.css || '',
    re: reactionsOf(f), c: f.clipsContent ? 1 : 0,
    ch: convChildren(f.children || [], abs, f),
  };
  const json = JSON.stringify(scene);
  bytes += json.length;
  fs.writeFileSync(path.join(OUT, 'frames', `${fileId(id)}.json`), json);
  index.frames[id] = { n: f.name, w: scene.w, h: scene.h };
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));

for (const h of usedSvgs) fs.copyFileSync(path.join(RAW, 'svg', `${h}.svg`), path.join(OUT, 'svg', `${h}.svg`));

let imgBytes = 0;
for (const [hash, need] of imageNeed) {
  const meta = imageMeta.get(hash);
  const src = path.join(RAW, 'images', `${hash}.${meta.ext}`);
  const dst = path.join(OUT, imageUrl(hash).replace(/^scene\//, ''));
  if (meta.ext === 'gif') fs.copyFileSync(src, dst);
  else {
    const width = Math.min(meta.w, Math.max(need, 8));
    await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 100, effort: 5 }).toFile(dst);
  }
  imgBytes += fs.statSync(dst).size;
}

console.log(`frames ${reach.size} (${(bytes / 1e6).toFixed(1)} MB json), svgs ${usedSvgs.size}, images ${imageNeed.size} (${(imgBytes / 1e6).toFixed(1)} MB), scroll frames ${fixScroll}`);
