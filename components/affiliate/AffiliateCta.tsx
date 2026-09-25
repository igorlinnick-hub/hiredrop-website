"use client";

// The landing's one button, aware of who is pressing it.
//
// Igor, 25.09: joining must be clean whether or not the person already has a
// HireDrop account. A signed-in user sent to a signup form is being asked to
// create something they already own — and the form cannot even tell them so
// until they have typed a password, because Supabase hides "this address is
// taken" by design.
//
// So the button decides before the click: signed in goes straight to the
// affiliate page where the form lives, everyone else to signup. It renders the
// signup href first, so a visitor with no session — the common case, and the
// one the QR code brings — sees the right link with no flicker and no JS.

import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

const SIGNED_OUT = "/signup?affiliate=1";
const SIGNED_IN = "/dashboard/affiliate";

export default function AffiliateCta({ label }: { label: string }) {
  const [href, setHref] = useState(SIGNED_OUT);

  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (alive && data.session) setHref(SIGNED_IN);
      })
      .catch(() => {
        // Auth unreachable — signup still works, and it now names the
        // "you already have an account" case properly.
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Link
      href={href}
      className="mt-7 inline-block rounded-full bg-[#F3EFE7] px-7 py-3.5 text-[15px] font-semibold text-[#14100C] transition hover:bg-white"
    >
      {label}
    </Link>
  );
}
