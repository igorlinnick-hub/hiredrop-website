import { useSyncExternalStore } from "react";

/**
 * Is this a phone or a tablet? HireDrop applies through a Chrome extension on a
 * computer, so on these devices there is nothing to install: setup can be finished
 * here, but the launch happens on desktop.
 *
 * One rule, two callers: the dashboard's hand-off banner
 * (components/dashboard/MobileHandoff) and the onboarding Connect step
 * (components/onboarding/StepConnectExtension). If they disagreed, a phone could be
 * let through onboarding and then not be told on the dashboard where to go next.
 *
 * iPadOS Safari reports itself as "Macintosh" — the touch-point check catches it,
 * since a real Mac reports none.
 */
export function isPhoneOrTablet(userAgent: string, maxTouchPoints: number): boolean {
  return /Android|iPhone|iPod/i.test(userAgent) || (/iPad|Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

// The user agent never changes while the page is open, so there is nothing to subscribe to.
const noSubscribe = () => () => {};

function deviceSnapshot(): boolean {
  return isPhoneOrTablet(navigator.userAgent, navigator.maxTouchPoints);
}

/**
 * The same answer inside a component. It is false on the server and during hydration,
 * so the markup matches; React re-renders with the real answer right after mount.
 * Read through useSyncExternalStore rather than set in an effect, like
 * components/AdPixels does with the browser.
 */
export function useIsPhoneOrTablet(): boolean {
  return useSyncExternalStore(noSubscribe, deviceSnapshot, () => false);
}
