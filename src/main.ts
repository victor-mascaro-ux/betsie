import '@fontsource/passion-one/400.css';
import '@fontsource/passion-one/700.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
import interNormal from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import interItalic from '@fontsource-variable/inter/files/inter-latin-wght-italic.woff2?url';
import './style.css';
import { Player } from './player';
import { loadFrame, preloadAssets, renderFrame, type SceneIndex } from './scene';

// SF Pro is Apple's system font: Apple devices render it natively. Everywhere
// else Inter stands in, scaled per weight band to SF Pro Text's advance widths
// (measured against Figma's own text boxes).
const bands: [string, number][] = [['100 549', 98.8], ['550 749', 101.3], ['750 900', 103.2]];
const fallback = document.createElement('style');
fallback.textContent = bands.map(([weight, adjust]) => `
@font-face { font-family: "Inter SF"; src: url(${interNormal}) format("woff2"); font-weight: ${weight}; font-style: normal; size-adjust: ${adjust}%; }
@font-face { font-family: "Inter SF"; src: url(${interItalic}) format("woff2"); font-weight: ${weight}; font-style: italic; size-adjust: ${adjust}%; }`).join('');
document.head.append(fallback);

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const frameHash = (id: string) => `#${id.replace(':', '-')}`;
const idFromHash = () => location.hash.slice(1).replace('-', ':');

// ?frame=<id> renders one frame alone at 1x, without timers (used for visual diffs).
const still = async (id: string) => {
  document.body.className = 'still';
  const frame = await loadFrame(id);
  await Promise.all([document.fonts.ready, preloadAssets(frame.ch)]);
  const r = renderFrame(frame);
  document.body.replaceChildren(r.root);
  document.body.dataset.ready = '1';
};

const boot = async () => {
  const solo = new URLSearchParams(location.search).get('frame');
  if (solo) return still(solo.replace('-', ':'));
  const index: SceneIndex = await fetch('scene/index.json').then((r) => r.json());
  const stage = $('#stage');
  const scaler = $('#scaler');
  const view = $('#view');
  const flows = $('#flows');
  const frameName = $('#frame-name');
  let flow = index.starts[0].id;

  // Desktop shows the device frame around the screen; phones get the screen alone.
  const BEZEL = 16;
  const fit = () => {
    const f = index.frames[flow];
    const phone = window.innerWidth < 640;
    document.body.classList.toggle('phone', phone);
    const b = phone ? 0 : BEZEL;
    const w = (f?.w || 430) + b * 2, h = (f?.h || 932) + b * 2;
    const pad = 40;
    const k = phone
      ? Math.min(window.innerWidth / w, window.innerHeight / h)
      : Math.min(1, (view.clientWidth - pad * 2) / w, (view.clientHeight - pad * 2) / h);
    scaler.style.width = `${w}px`;
    scaler.style.height = `${h}px`;
    scaler.style.transform = phone ? `translateX(-50%) scale(${k})` : `translate(-50%, -50%) scale(${k})`;
  };

  const player = new Player(stage, $('#hints'), (id) => {
    history.replaceState(null, '', frameHash(id));
    frameName.textContent = index.frames[id]?.n || '';
  });
  (window as unknown as { player: Player }).player = player;

  const renderFlows = () => {
    flows.replaceChildren(...index.starts.map((s) => {
      const b = document.createElement('button');
      b.className = `flow${s.id === flow ? ' on' : ''}`;
      b.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 1.8v8.4L10 6z" fill="currentColor"/></svg>';
      b.append(s.name);
      b.onclick = () => startFlow(s.id);
      return b;
    }));
  };

  const startFlow = (id: string) => {
    flow = id;
    renderFlows();
    fit();
    document.body.classList.remove('menu');
    player.start(id);
  };

  $('#restart').onclick = () => startFlow(flow);
  $('#menu').onclick = () => document.body.classList.toggle('menu');
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'r' || e.key === 'R') startFlow(flow);
    if (e.key === 'ArrowLeft' || e.key === 'Backspace') player.back();
  });

  await document.fonts.ready;
  const deep = idFromHash();
  renderFlows();
  fit();
  if (deep && index.frames[deep]) player.start(deep);
  else startFlow(flow);
};

boot();
