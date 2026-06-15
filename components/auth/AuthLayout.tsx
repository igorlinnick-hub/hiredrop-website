import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-text">{title}</h1>
          <p className="mt-2 text-sm text-text2">{subtitle}</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-text2">
          {footerText}{" "}
          <Link href={footerLinkHref} className="text-accent hover:text-accent2 font-medium">
            {footerLinkText}
          </Link>
        </p>
      </div>
    </div>
  );
}
