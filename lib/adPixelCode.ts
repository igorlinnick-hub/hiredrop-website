// Base code of the Meta Pixel and the Google Ads tag — the only place the
// site names where those scripts live. Imported solely by
// components/AdPixelRuntime.tsx, which is itself loaded lazily and only when
// an ad id is configured and the visitor has not opted out. Rules and
// helpers: lib/adPixels.ts.
//
// No imports on purpose: `node --test` loads this file directly.

/**
 * Meta's standard base code, plus three settings that keep it to what we
 * report explicitly:
 *   - autoConfig off: no automatic button-click / page-metadata events;
 *   - disablePushState: no automatic PageView on client-side navigation —
 *     otherwise a click from the landing into /dashboard would report the
 *     dashboard URL. AdPixelRuntime sends PageView itself, public pages only;
 *   - no PageView here: AdPixelRuntime decides.
 * `pixelId` is digits only (validated in lib/adPixels.ts).
 */
export function metaBaseCode(pixelId: string): string {
  return [
    "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
    "n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;",
    "n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;",
    "t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,",
    "document,'script','https://connect.facebook.net/en_US/fbevents.js');",
    "fbq.disablePushState=true;",
    `fbq('set','autoConfig',false,'${pixelId}');`,
    `fbq('init','${pixelId}');`,
  ].join("");
}

/** gtag bootstrap. Page views are sent by AdPixelRuntime (public pages
 *  only), so config must not send its own. `adsId` is AW-<digits>. */
export function gtagInitCode(adsId: string): string {
  return [
    "window.dataLayer=window.dataLayer||[];",
    "window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};",
    "gtag('js',new Date());",
    `gtag('config','${adsId}',{send_page_view:false});`,
  ].join("");
}

export function gtagSrc(adsId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId)}`;
}
