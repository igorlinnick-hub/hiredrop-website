import ResumeDropPreviewClient from "./ResumeDropPreviewClient";

export const metadata = { title: "Resume drag & drop — preview" };

// Logged-out look at both resume drop targets. `?dark=1` flips the shell — the flag is
// read on the server (as in /preview/skills) so the first paint carries the right theme.
export default async function ResumeDropPreview(
  { searchParams }: { searchParams: Promise<{ dark?: string }> }
) {
  const { dark } = await searchParams;
  return <ResumeDropPreviewClient dark={!!dark} />;
}
