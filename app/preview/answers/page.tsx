import AnswersPreviewClient from "./AnswersPreviewClient";

export const metadata = { title: "Employer answers — preview" };

// `?dark=1` flips the dashboard half — both themes have to be reviewable here.
export default async function AnswersPreview(
  { searchParams }: { searchParams: Promise<{ dark?: string }> }
) {
  const { dark } = await searchParams;
  return <AnswersPreviewClient dark={!!dark} />;
}
