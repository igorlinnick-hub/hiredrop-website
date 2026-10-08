// Whose saved onboarding progress is it? The wizard keeps a snapshot in localStorage
// (hd_onboarding_v1) so the extension step's reload loses nothing. A browser can be
// shared, and the snapshot holds the name, phone and search settings that finish()
// saves as the signed-in account's profile — so the next person to sign in must never
// resume someone else's wizard. Snapshots carry the uid of the account that wrote them.

/** The saved snapshot if it belongs to the signed-in account, else null (drop it).
 *
 *  One written before the uid was stored is kept only when its email is this account's:
 *  the wizard fills that field from the sign-in, so a snapshot the account wrote itself
 *  carries its own address and another account's carries theirs. Someone mid-wizard when
 *  the uid arrived (the extension step reloads the tab) keeps their answers; one who
 *  edited the email starts over once — safer than adopting a stranger's. */
export function ownSnapshot<T extends { uid?: unknown; profile?: { email?: unknown } }>(
  saved: T | null,
  user: { id: string; email?: string | null },
): T | null {
  if (!saved || typeof saved !== "object") return null;
  if (saved.uid !== undefined) return saved.uid === user.id ? saved : null;
  const email = saved.profile?.email;
  const mine = (user.email || "").trim().toLowerCase();
  return typeof email === "string" && mine !== "" && email.trim().toLowerCase() === mine ? saved : null;
}
