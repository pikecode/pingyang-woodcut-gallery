export const INTRO_KEY = "pingyang-intro-seen";

export function shouldShowOpeningIntro() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (new URLSearchParams(window.location.search).get("intro") === "1") return true;
  try {
    const navigation = performance.getEntriesByType?.("navigation")?.[0];
    if (navigation?.type === "reload") window.sessionStorage.removeItem(INTRO_KEY);
    return window.sessionStorage.getItem(INTRO_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markOpeningIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Storage can be unavailable in privacy-restricted webviews.
  }
}
