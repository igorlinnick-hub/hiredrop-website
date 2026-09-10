// Renders one JSON-LD block. Server component — the payload must be in the HTML
// Google fetches, not injected later by the client.
//
// JSON.stringify output is escaped for the one case that can break out of a
// <script> element: a literal "</script" inside a string value.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
