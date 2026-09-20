import SkillsPreviewClient from "./SkillsPreviewClient";

export const metadata = { title: "List your skills — preview" };

// Logged-out look at the "List your skills" dialog. `?dark=1` flips the shell —
// both themes have to be reviewable here. The flag is read on the server (as in
// /preview/checklist) so the first paint already carries the right theme; reading
// window.location during render mismatched hydration.
export default async function SkillsModalPreview(
  { searchParams }: { searchParams: Promise<{ dark?: string }> }
) {
  const { dark } = await searchParams;
  return <SkillsPreviewClient dark={!!dark} />;
}
