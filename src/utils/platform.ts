declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export function isWeb(): boolean {
  return !isDesktop();
}
