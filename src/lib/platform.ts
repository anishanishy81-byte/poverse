export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform) {
    try {
      return Boolean(cap.isNativePlatform());
    } catch {
      return Boolean(cap?.platform);
    }
  }
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any)?.standalone);
  return Boolean(cap?.platform) || Boolean(isStandalone);
};
