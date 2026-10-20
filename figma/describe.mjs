// Compact, readable dump of a raw frame: geometry relative to the frame, paint, text style.
// node figma/describe.mjs <frameId> [maxDepth]
import fs from 'node:fs';
const [id, maxDepth = 9] = process.argv.slice(2);
const root = JSON.parse(fs.readFileSync(`figma/raw/frames/${id.replace(':', '-')}.json`, 'utf8'));
const ox = root.absoluteTransform[0][2], oy = root.absoluteTransform[1][2];
const hex = (c, a = 1) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('') + (a < 1 ? `@${Math.round(a * 100)}` : '');
const paint = (ps) => (Array.isArray(ps) ? ps.filter((p) => p.visible !== false).map((p) => p.type === 'SOLID' ? hex(p.color, p.opacity) : p.type === 'IMAGE' ? `img:${p.imageHash.slice(0, 8)}` : p.type.toLowerCase()).join(',') : '');
const walk = (n, d) => {
  if (d > maxDepth) return;
  const t = n.absoluteTransform; const x = Math.round(t[0][2] - ox), y = Math.round(t[1][2] - oy);
  let s = `${'  '.repeat(d)}${n.name} [${n.type}] ${x},${y} ${Math.round(n.width)}x${Math.round(n.height)}`;
  if (n.visible === false) s += ' HIDDEN';
  const f = paint(n.fills); if (f && n.type !== 'TEXT') s += ` fill=${f}`;
  const k = paint(n.strokes); if (k) s += ` stroke=${k}/${n.strokeWeight}${n.strokeAlign?.[0]}`;
  if (n.cornerRadius && n.cornerRadius !== 'MIXED') s += ` r=${n.cornerRadius}`;
  if (n.cornerRadius === 'MIXED') s += ` r=${[n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius].join('/')}`;
  if (n.opacity < 1) s += ` op=${n.opacity.toFixed(2)}`;
  for (const e of (n.effects || []).filter((e) => e.visible !== false)) s += ` ${e.type === 'DROP_SHADOW' ? 'shadow' : e.type.toLowerCase()}(${e.offset ? e.offset.x + ',' + e.offset.y + ' ' : ''}${e.radius}${e.spread ? ' ' + e.spread : ''}${e.color ? ' ' + hex(e.color, e.color.a) : ''})`;
  if (n.type === 'TEXT') {
    const seg = n.segments[0];
    s += ` "${n.characters.replace(/\n/g, '⏎').slice(0, 60)}" ${seg.fontName.family} ${seg.fontName.style} ${seg.fontSize}/${seg.lineHeight.unit === 'AUTO' ? 'auto' : seg.lineHeight.value + (seg.lineHeight.unit === 'PERCENT' ? '%' : '')}${seg.letterSpacing.value ? ' ls' + seg.letterSpacing.value + (seg.letterSpacing.unit === 'PERCENT' ? '%' : '') : ''} ${paint(seg.fills)} ${n.textAlignHorizontal[0]}${n.segments.length > 1 ? ' +' + (n.segments.length - 1) + 'seg' : ''}`;
  }
  if (n.svg) s += ' SVG';
  if (n.reactions?.length) s += ` ⚡${n.reactions.map((r) => r.trigger.type[3]).join('')}`;
  console.log(s);
  if (!n.svg) (n.children || []).forEach((c) => walk(c, d + 1));
};
console.log(`${root.name} ${root.width}x${root.height} fill=${paint(root.fills)}`);
(root.children || []).forEach((c) => walk(c, 1));
