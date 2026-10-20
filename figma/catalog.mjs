// Lists every vector island and image fill with the layer names that use it,
// so screens can pick the right Figma asset by meaning.
import fs from 'node:fs';
import path from 'node:path';
const RAW = 'figma/raw';
const svg = new Map(), img = new Map();
const add = (m, k, name, w, h, frame) => { const e = m.get(k) || { names: new Map(), w, h, frames: new Set() }; e.names.set(name, (e.names.get(name) || 0) + 1); e.frames.add(frame); m.set(k, e); };
for (const f of fs.readdirSync(path.join(RAW, 'frames'))) {
  const root = JSON.parse(fs.readFileSync(path.join(RAW, 'frames', f), 'utf8'));
  const walk = (n, trail) => {
    const label = `${trail.slice(-2).join('/')}/${n.name}`;
    if (n.svg) add(svg, n.svg.h, label, n.svg.w, n.svg.h2, root.id);
    if (Array.isArray(n.fills)) for (const p of n.fills) if (p.type === 'IMAGE' && p.visible !== false) add(img, p.imageHash, label, Math.round(n.width), Math.round(n.height), root.id);
    (n.children || []).forEach((c) => walk(c, [...trail, n.name]));
  };
  walk(root, []);
}
const fmt = (m) => [...m].sort((a, b) => b[1].frames.size - a[1].frames.size).map(([k, e]) => `${k.slice(0, 16)} ${String(e.w).slice(0, 6)}x${String(e.h).slice(0, 6)} frames=${e.frames.size} :: ${[...e.names.keys()].slice(0, 3).join(' | ')}`).join('\n');
fs.writeFileSync('figma/raw/catalog.txt', `# SVG islands\n${fmt(svg)}\n\n# Images\n${fmt(img)}\n`);
console.log(svg.size, 'svgs', img.size, 'images');
