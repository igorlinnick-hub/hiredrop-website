// Supabase answers signUp for an ALREADY REGISTERED address with a
// successful-looking result that carries no identities — deliberately, so this
// form cannot be used to find out who has an account. Read it wrong and the
// person is sent to wait for an email that will never be sent.
//
// This pins the detection rule itself: node --test tests/signup-existing-email.test.ts

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isObfuscatedExistingUser } from "../lib/auth/signup-result.ts";

test("no identities and no session means the address is taken", () => {
  assert.equal(
    isObfuscatedExistingUser({ user: { identities: [] }, session: null }),
    true,
  );
});

test("a genuinely new signup awaiting confirmation is NOT that", () => {
  // A real new user comes back with one identity and no session yet.
  assert.equal(
    isObfuscatedExistingUser({ user: { identities: [{ id: "x" }] }, session: null }),
    false,
  );
});

test("a signup that produced a session is never that", () => {
  // Confirmation off: identities may be absent from the payload entirely, and
  // a session proves the account is theirs.
  assert.equal(
    isObfuscatedExistingUser({ user: { identities: [] }, session: { access_token: "t" } }),
    false,
  );
});

test("a failed signup (no user at all) is not misread as an existing one", () => {
  assert.equal(isObfuscatedExistingUser({ user: null, session: null }), false);
});
