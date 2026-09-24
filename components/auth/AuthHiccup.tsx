"use client";

/**
 * Shown when the auth service could not be reached — NOT when the person is
 * signed out. The difference is the whole point: their session is very likely
 * still fine, and a login screen here would tell them a lie and make them
 * re-enter a password they never lost (Igor, 09-24, coming back from Stripe).
 *
 * One honest sentence and one button that retries.
 */

export default function AuthHiccup() {
  return (
    <div className="hd-dash-root app-ui min-h-screen bg-background flex items-center justify-center p-6">
      <div className="hd-sheet max-w-md w-full p-7 text-center">
        <p className="hd-eyebrow">Couldn’t reach the sign-in service</p>
        <h1 className="hd-hist-display mt-3 !text-[30px]">
          You’re still <em className="italic">signed in</em>.
        </h1>
        <p className="hd-hist-sub mt-3 leading-relaxed">
          We couldn’t check your session just now — that’s on our side, not yours.
          Nothing was logged out.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
