import '@fontsource/passion-one/400.css';
import '@fontsource/passion-one/700.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
import interNormal from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import interItalic from '@fontsource-variable/inter/files/inter-latin-wght-italic.woff2?url';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/shell.css';

// SF Pro is Apple's system font: Apple devices render it natively. Everywhere
// else Inter stands in, scaled per weight band to SF Pro Text's advance widths.
const bands: [string, number][] = [['100 549', 98.8], ['550 749', 101.3], ['750 900', 103.2]];
const fallback = document.createElement('style');
fallback.textContent = bands.map(([weight, adjust]) => `
@font-face { font-family: "Inter SF"; src: url(${interNormal}) format("woff2"); font-weight: ${weight}; font-style: normal; size-adjust: ${adjust}%; }
@font-face { font-family: "Inter SF"; src: url(${interItalic}) format("woff2"); font-weight: ${weight}; font-style: italic; size-adjust: ${adjust}%; }`).join('');
document.head.append(fallback);

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
