/**
 * Receives Content-Security-Policy-Report-Only violations (next.config.ts) and
 * writes one `[csp]` line per violation to the runtime log. Nothing is stored:
 * the log is where a missed origin shows up before the policy is enforced.
 *
 * The policy uses `report-uri` (application/csp-report, {"csp-report": {...}});
 * the `report-to` shape ([{type: "csp-violation", body: {...}}]) is read too,
 * so switching the policy over later needs no change here.
 *
 * Anyone can POST here, so the body is capped, lines are capped, and URLs lose
 * their query string — a blocked URL can carry a token, and the log line must not.
 */
const MAX_BODY = 16_000;
const MAX_LINES = 10;

type Violation = {
  page: string;
  directive: string;
  blocked: string;
  source: string;
};

function clean(u: unknown): string {
  const s = typeof u === "string" ? u : "";
  if (!s) return "-";
  try {
    const url = new URL(s);
    return url.origin === "null" ? url.protocol : url.origin + url.pathname;
  } catch {
    return s.slice(0, 80); // 'inline', 'eval', 'data', ...
  }
}

function fromLegacy(r: Record<string, unknown>): Violation {
  return {
    page: clean(r["document-uri"]),
    directive: String(r["effective-directive"] || r["violated-directive"] || "-"),
    blocked: clean(r["blocked-uri"]),
    source: clean(r["source-file"]),
  };
}

function fromReportTo(r: Record<string, unknown>): Violation {
  return {
    page: clean(r.documentURL),
    directive: String(r.effectiveDirective || "-"),
    blocked: clean(r.blockedURL),
    source: clean(r.sourceFile),
  };
}

export async function POST(request: Request) {
  const text = (await request.text()).slice(0, MAX_BODY);
  let found: Violation[] = [];
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      found = json
        .filter((x) => x?.type === "csp-violation" && x.body)
        .map((x) => fromReportTo(x.body));
    } else if (json?.["csp-report"]) {
      found = [fromLegacy(json["csp-report"])];
    }
  } catch {
    // Not JSON — not a report.
  }

  for (const v of found.slice(0, MAX_LINES)) {
    // Browser extensions inject into every page; their hits say nothing about
    // the site's own origins.
    if (/^(chrome|moz|safari-web)-extension:/.test(v.blocked) || /-extension:/.test(v.source)) continue;
    console.warn(`[csp] ${v.directive} blocked=${v.blocked} page=${v.page} src=${v.source}`);
  }
  return new Response(null, { status: 204 });
}
