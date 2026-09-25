/**
 * Did this signup actually create an account, or did Supabase just pretend?
 *
 * When email confirmation is on and the address is already registered,
 * `signUp` does not error. It returns a user with an EMPTY identities array and
 * no session — an obfuscated response, so the form cannot be used to enumerate
 * who has an account.
 *
 * Told apart wrongly, the person is shown "check your email" for a message that
 * will never be sent. That is the state Igor hit scanning his own QR code.
 */
export function isObfuscatedExistingUser(result: {
  user?: { identities?: unknown[] | null } | null;
  session?: unknown | null;
}): boolean {
  if (!result.user) return false;
  if (result.session) return false;
  return (result.user.identities?.length ?? 0) === 0;
}
