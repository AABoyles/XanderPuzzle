/**
 * The two bundled faces placards are drawn in (public/fonts, both SIL Open Font License): Allerta Stencil for the
 * facility's placards and Caveat for the Margin's notes. They ship with the build, so the offline cache has them.
 */
export const STENCIL_FONT = '"Shiftbound Stencil", "Arial Narrow", sans-serif';
export const MARGIN_FONT = '"Shiftbound Margin", "Segoe Print", cursive';

let ready: Promise<void> | undefined;
let loaded = false;

/** Starts loading the fonts. Call once at startup, before the first chamber is built. */
export function loadFonts(): Promise<void> {
  if (ready) return ready;
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
    loaded = true;
    return (ready = Promise.resolve());
  }
  const faces = [
    new FontFace('Shiftbound Stencil', 'url(fonts/allerta-stencil.woff2)'),
    new FontFace('Shiftbound Margin', 'url(fonts/caveat.woff2)'),
  ];
  ready = Promise.all(faces.map((f) => f.load().then((face) => document.fonts.add(face))))
    .then(() => {
      loaded = true;
    })
    .catch((e) => {
      // Placards fall back to system fonts.
      console.warn('Placard fonts failed to load', e);
      loaded = true;
    });
  return ready;
}

/** Calls `redraw` once the fonts are in, if text was drawn before they were. */
export function afterFontsLoad(redraw: () => void): void {
  if (loaded || !ready) return;
  void ready.then(redraw);
}
