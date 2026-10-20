import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Where screens render things that cover the whole app (pickers, sheets). */
export const OverlayContext = createContext<HTMLElement | null>(null);

export function Overlay({ children }: { children: ReactNode }) {
  const el = useContext(OverlayContext);
  return el ? createPortal(children, el) : null;
}
