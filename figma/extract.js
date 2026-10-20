// Page-side extractor. Paste into the browser console of the Betsie Figma file
// (figma.com/design/..., editor open) while `node figma/receiver.mjs <outDir>`
// is running. It only reads the file — nothing in Figma is changed.
//
//   await __bx.graph()            // frames + prototype starts
//   await __bx.frames(0, 25)      // scene trees + vector islands, in batches
//   await __bx.images()           // original image fills, by hash
//   await __bx.refs(0, 201)       // 1x reference renders for diffing
(() => {
  const PORT = 47821;
  const post = async (p, body) => {
    const r = await fetch(`http://127.0.0.1:${PORT}/save?p=${encodeURIComponent(p)}`, { method: 'POST', body });
    if (!r.ok) throw new Error('post failed ' + p);
  };

  // Shapes Figma draws best itself: exported once as SVG ("islands").
  const VEC = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'LINE', 'POLYGON']);
  const SHAPE = new Set([...VEC, 'GROUP', 'FRAME', 'INSTANCE', 'COMPONENT', 'ELLIPSE', 'RECTANGLE']);
  const isArc = (n) => n.type === 'ELLIPSE' && n.arcData &&
    (n.arcData.innerRadius > 0 || Math.abs(n.arcData.endingAngle - n.arcData.startingAngle - 2 * Math.PI) > 1e-3);
  const visibleFills = (n) => { try { return Array.isArray(n.fills) ? n.fills.filter((f) => f.visible !== false) : []; } catch (e) { return []; } };
  const normalBlend = (n) => !n.blendMode || n.blendMode === 'PASS_THROUGH' || n.blendMode === 'NORMAL';
  // SF Symbols live in SF Pro's private-use area; only Figma can draw them.
  const cp = (c) => String.fromCodePoint(c);
  const PUA = new RegExp(`[${cp(0xe000)}-${cp(0xf8ff)}${cp(0xf0000)}-${cp(0x10fffd)}]`, 'u');
  const isGlyph = (n) => n.type === 'TEXT' && PUA.test(n.characters || '');

  const analyze = (n, memo) => {
    const drawn = VEC.has(n.type) || isArc(n) || isGlyph(n);
    let ok = (SHAPE.has(n.type) || isGlyph(n)) && !visibleFills(n).some((f) => f.type === 'IMAGE') &&
      (drawn || !(n.effects || []).some((e) => e.visible !== false && e.type === 'BACKGROUND_BLUR'));
    let hasVec = drawn;
    if ('children' in n) for (const c of n.children) {
      if (c.visible === false) continue;
      const r = analyze(c, memo);
      ok = ok && r.okUp; hasVec = hasVec || r.hasVec;
    }
    const res = { ok, hasVec, okUp: ok && !(n.reactions && n.reactions.length) && normalBlend(n) };
    memo.set(n.id, res);
    return res;
  };

  const PROPS = ['visible', 'opacity', 'blendMode', 'isMask', 'maskType', 'width', 'height', 'absoluteTransform',
    'fills', 'strokes', 'strokeWeight', 'strokeAlign', 'strokeTopWeight', 'strokeBottomWeight', 'strokeLeftWeight',
    'strokeRightWeight', 'dashPattern', 'effects', 'cornerRadius', 'topLeftRadius', 'topRightRadius',
    'bottomLeftRadius', 'bottomRightRadius', 'clipsContent', 'overflowDirection', 'numberOfFixedChildren',
    'layoutPositioning', 'reactions', 'textAlignHorizontal', 'textAlignVertical', 'textAutoResize',
    'paragraphSpacing', 'paragraphIndent', 'textTruncation', 'maxLines', 'characters', 'listSpacing'];

  const svgSeen = new Set();
  const sha1 = async (s) => {
    const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  };

  const exportIsland = async (n) => {
    const rb = n.absoluteRenderBounds;
    if (!rb) return null;
    let svg = await n.exportAsync({ format: 'SVG_STRING', svgIdAttribute: false });
    // Internal ids carry the node id; strip it so identical icons dedupe.
    svg = svg.replace(/\b((?:filter|clip|paint|pattern|mask|image)\d+(?:_[a-z]+)?)_\d+_\d+/g, '$1');
    const h = await sha1(svg);
    if (!svgSeen.has(h)) { svgSeen.add(h); await post(`svg/${h}.svg`, svg); }
    const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
    return { h, x: rb.x, y: rb.y, w: m ? +m[1] : rb.width, h2: m ? +m[2] : rb.height };
  };

  const ser = async (n, memo, top) => {
    const o = { id: n.id, name: n.name, type: n.type };
    for (const k of PROPS) {
      try { const v = n[k]; if (v === figma.mixed) o[k] = 'MIXED'; else if (v !== undefined) o[k] = v; } catch (e) { /* not on this type */ }
    }
    if (n.type === 'TEXT') {
      o.segments = n.getStyledTextSegments(['fontName', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
        'fills', 'textDecoration', 'textCase', 'hyperlink', 'listOptions', 'indentation']);
    }
    if (n.type === 'INSTANCE') { try { o.main = n.mainComponent && n.mainComponent.name; } catch (e) { /* detached */ } }
    if (n.visible === false) return o;
    const a = memo.get(n.id);
    if (!top && a && a.ok && a.hasVec) {
      try { o.svg = await exportIsland(n); } catch (e) { o.svgErr = String(e.message || e); }
      if (o.svg) return o;
    }
    // A vector drawn as HTML (e.g. a photo in a circle path) clips to its outline.
    if (VEC.has(n.type)) { try { o.fillGeometry = n.fillGeometry; } catch (e) { /* none */ } }
    if ('children' in n) { o.children = []; for (const c of n.children) o.children.push(await ser(c, memo, false)); }
    return o;
  };

  window.__bx = {
    async graph() {
      const p = figma.currentPage;
      const frames = p.children.map((f) => ({ id: f.id, name: f.name, w: f.width, h: f.height, x: f.x, y: f.y }));
      await post('graph.json', JSON.stringify({ starts: p.flowStartingPoints, frames }));
      return frames.length;
    },
    async frames(from, count) {
      const list = figma.currentPage.children.slice(from, from + count);
      for (const f of list) {
        const memo = new Map(); analyze(f, memo);
        const tree = await ser(f, memo, true);
        await post(`frames/${f.id.replace(':', '-')}.json`, JSON.stringify(tree));
      }
      return `${from + list.length}/${figma.currentPage.children.length} frames, ${svgSeen.size} svgs`;
    },
    async images() {
      const hashes = new Set();
      const walk = (n) => { visibleFills(n).forEach((f) => f.type === 'IMAGE' && f.imageHash && hashes.add(f.imageHash)); if ('children' in n) n.children.forEach(walk); };
      figma.currentPage.children.forEach(walk);
      const out = [];
      for (const h of hashes) {
        const img = figma.getImageByHash(h); const b = await img.getBytesAsync(); const s = await img.getSizeAsync();
        const ext = b[0] === 0x89 ? 'png' : b[0] === 0xff ? 'jpg' : b[0] === 0x47 ? 'gif' : 'webp';
        await post(`images/${h}.${ext}`, b); out.push({ h, ext, w: s.width, hgt: s.height });
      }
      await post('images.json', JSON.stringify(out));
      return out.length;
    },
    async refs(from, count) {
      const list = figma.currentPage.children.slice(from, from + count);
      for (const f of list) await post(`ref/${f.id.replace(':', '-')}.png`, await f.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } }));
      return list.length;
    },
  };
  return 'ready';
})();
