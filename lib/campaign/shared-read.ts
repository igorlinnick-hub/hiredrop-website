// One answer shared by every panel that asks the same question.
//
// Several dashboard panels poll the same endpoint on their own clocks. Each
// keeps its clock; `read(token, maxAgeMs)` just stops them from asking twice:
//   - a value younger than maxAgeMs is returned as is, no request;
//   - a request already in flight for this token is joined, not repeated;
//   - otherwise one request goes out and its answer is kept for the next caller;
//   - maxAgeMs <= 0 always sends its own request (right after Start/Stop).
// A failure is not cached: every waiting caller gets the rejection and keeps
// its own last-known state, exactly as with its own fetch. The cache is per
// access token, so a different session never reads another one's answer.
//
// No imports on purpose: `node --test` loads this file directly
// (tests/shared-read.test.ts).

export type SharedRead<T> = (token: string, maxAgeMs: number) => Promise<T>;

export function createSharedRead<T>(
  fetcher: (token: string) => Promise<T>,
  now: () => number = () => Date.now(),
): SharedRead<T> {
  let last: { token: string; at: number; value: T } | null = null;
  let inflight: { token: string; promise: Promise<T> } | null = null;
  // Requests can finish out of order (a forced read overtakes an older one):
  // only the newest-started answer may become the cached one.
  let started = 0;
  let cachedSeq = 0;

  return (token, maxAgeMs) => {
    // maxAgeMs <= 0 = "after a click": neither a cached answer nor a request
    // that left before the click will do.
    if (maxAgeMs > 0) {
      if (last && last.token === token && now() - last.at <= maxAgeMs) {
        return Promise.resolve(last.value);
      }
      if (inflight && inflight.token === token) return inflight.promise;
    }

    const seq = ++started;
    const promise = fetcher(token).then((value) => {
      if (seq > cachedSeq) {
        cachedSeq = seq;
        last = { token, at: now(), value };
      }
      return value;
    });
    inflight = { token, promise };
    const settle = () => {
      if (inflight?.promise === promise) inflight = null;
    };
    promise.then(settle, settle);
    return promise;
  };
}
