type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

export function canFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as FsEl;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null;
  return (
    (!!mm && (mm('(display-mode: fullscreen)').matches || mm('(display-mode: standalone)').matches)) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export async function toggleFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  const d = document as FsDoc;
  try {
    if (isFullscreen()) {
      await (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
      return;
    }
    const el = document.documentElement as FsEl;
    await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
  } catch {
    return;
  }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o?.lock?.('landscape');
  } catch {
    // Orientation lock is unsupported or refused (iOS, desktop); ignore.
  }
}

/** Subscribe to fullscreen changes; returns an unsubscribe function. */
export function onFullscreenChange(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('fullscreenchange', cb);
  document.addEventListener('webkitfullscreenchange', cb);
  return () => {
    document.removeEventListener('fullscreenchange', cb);
    document.removeEventListener('webkitfullscreenchange', cb);
  };
}
