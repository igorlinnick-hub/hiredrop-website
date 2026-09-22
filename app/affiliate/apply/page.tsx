import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import ApplyForm from "@/components/affiliate/ApplyForm";
import AffiliateHero from "@/components/affiliate/AffiliateHero";

// Deliberately not in PUBLIC_PAGES and not indexed: this is a form, not a page
// that should compete in search. /affiliate is the page Google reads; this is
// where its button — and the QR on the printed card — leads.
export const metadata = {
  title: "Apply for an affiliate link — HireDrop",
  robots: { index: false, follow: true },
};

export default async function AffiliateApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;

  return (
    <>
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <AffiliateHero
            compact
            eyebrow="HireDrop affiliate program"
            title={
              <>
                Tell us who you&apos;d <em className="italic">share it with</em>.
              </>
            }
            body="30% of every payment your referrals make, for as long as they stay. Paid monthly by PayPal. We read every application ourselves — a real answer, not an autoresponder."
          />

          <div className="mt-10">
            <ApplyForm source={(src || "").slice(0, 60)} />
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ["30%", "Of every payment, every month"],
              ["60 days", "Your link keeps counting"],
              ["By hand", "Reviewed by a person"],
            ].map(([big, small]) => (
              <div key={big} className="bg-white rounded-[14px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 text-center">
                <p className="text-2xl font-bold text-accent">{big}</p>
                <p className="text-xs text-gray-500 mt-1">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
