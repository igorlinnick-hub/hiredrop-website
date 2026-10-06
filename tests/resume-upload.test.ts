// Original resume uploads: a fresh name each time, older uploads pruned safely.
// node --test tests/resume-upload.test.ts

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  STALE_AFTER_MS,
  freshResumePath,
  staleOriginals,
  uploadOriginalResume,
  type ResumeBucket,
  type ResumeProfile,
} from "../lib/resume/upload.ts";

const UID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const NOW = Date.parse("2026-10-06T12:00:00Z");
const OLD = new Date(NOW - 3 * 24 * 3600 * 1000).toISOString();
const YOUNG = new Date(NOW - 60 * 1000).toISOString();

test("each upload gets a name nobody has fetched yet", () => {
  const a = freshResumePath(UID);
  const b = freshResumePath(UID);
  assert.notEqual(a, b);
  assert.match(a, new RegExp(`^${UID}/resume-[0-9a-f]{12}\\.pdf$`));
});

const FRESH = `${UID}/resume-ffffffffffff.pdf`;
const freshItem = { name: "resume-ffffffffffff.pdf", updated_at: new Date(NOW).toISOString() };

test("prune keeps the new file, the one it replaced, young files, and every other kind", () => {
  const previous = `${UID}/resume-aaaaaaaaaaaa.pdf`;
  const stale = staleOriginals(
    UID,
    [
      freshItem,
      { name: "resume-aaaaaaaaaaaa.pdf", updated_at: OLD }, // replaced just now
      { name: "resume-bbbbbbbbbbbb.pdf", updated_at: OLD }, // replaced earlier
      { name: "resume.pdf", updated_at: OLD }, // legacy name
      { name: "resume-cccccccccccc.pdf", updated_at: YOUNG }, // another tab's upload
      { name: "resume_ats.pdf", updated_at: OLD },
      { name: "resume_skills-dddddddddddd.pdf", updated_at: OLD },
      { name: "Jane_Doe_Resume.pdf", updated_at: OLD },
      { name: "resume-eeeeeeeeeeee.pdf", updated_at: null }, // age unknown
    ],
    FRESH,
    previous,
  );
  assert.deepEqual(stale.sort(), [`${UID}/resume-bbbbbbbbbbbb.pdf`, `${UID}/resume.pdf`]);
});

test("no path on the profile: the legacy file was the current one and survives", () => {
  const items = [freshItem, { name: "resume.pdf", updated_at: OLD }];
  assert.deepEqual(staleOriginals(UID, items, FRESH, null), []);
});

test("a foreign previous path protects nothing of its own and is never pruned", () => {
  const items = [freshItem, { name: "resume.pdf", updated_at: OLD }];
  assert.deepEqual(staleOriginals(UID, items, FRESH, "someone-else/resume-aaaaaaaaaaaa.pdf"), []);
});

test("age is measured from the fresh upload's storage stamp, not the device clock", () => {
  const justOver = new Date(NOW - STALE_AFTER_MS - 1000).toISOString();
  const justUnder = new Date(NOW - STALE_AFTER_MS + 1000).toISOString();
  const items = [
    freshItem,
    { name: "resume-bbbbbbbbbbbb.pdf", updated_at: justOver },
    { name: "resume-cccccccccccc.pdf", updated_at: justUnder },
  ];
  assert.deepEqual(staleOriginals(UID, items, FRESH, null), [`${UID}/resume-bbbbbbbbbbbb.pdf`]);
  // The fresh upload isn't in the listing: no reference clock, prune nothing.
  assert.deepEqual(staleOriginals(UID, items.slice(1), FRESH, null), []);
});

function fakeStore(initial: Record<string, string>, dbCurrent: string | null) {
  const objects = new Map(Object.entries(initial)); // name -> updated_at
  const log: string[] = [];
  const state = { db: dbCurrent, saveOk: true, uploadOk: true, removeThrows: false };
  const bucket: ResumeBucket = {
    async upload(path, _file, options) {
      log.push(`upload ${path} upsert=${options?.upsert}`);
      if (!state.uploadOk) return { error: new Error("denied") };
      objects.set(path.split("/")[1], new Date().toISOString());
      return { error: null };
    },
    async list() {
      log.push("list");
      return { data: [...objects].map(([name, updated_at]) => ({ name, updated_at })) };
    },
    async remove(paths) {
      log.push(`remove ${paths.join(",")}`);
      if (state.removeThrows) throw new Error("storage down");
      for (const p of paths) objects.delete(p.split("/")[1]);
      return {};
    },
  };
  const profile: ResumeProfile = {
    async readCurrent() {
      log.push("read");
      return state.db;
    },
    async save(path) {
      log.push(`save ${path}`);
      if (state.saveOk) state.db = path;
      return state.saveOk;
    },
  };
  return { bucket, profile, objects, log, state };
}

test("upload: read → upload (no upsert) → save → prune, keeping the DB's previous file", async () => {
  // The tab may hold anything; the DB says the current file is `aaaa`.
  const s = fakeStore(
    { "resume-aaaaaaaaaaaa.pdf": OLD, "resume-bbbbbbbbbbbb.pdf": OLD },
    `${UID}/resume-aaaaaaaaaaaa.pdf`,
  );
  const path = await uploadOriginalResume(s.bucket, s.profile, UID, new Blob(["%PDF-"]));
  assert.ok(path && path.startsWith(`${UID}/resume-`));
  assert.equal(s.state.db, path);
  assert.deepEqual(s.log, [
    "read",
    `upload ${path} upsert=undefined`,
    `save ${path}`,
    "list",
    `remove ${UID}/resume-bbbbbbbbbbbb.pdf`,
  ]);
  assert.ok(s.objects.has("resume-aaaaaaaaaaaa.pdf"));
});

test("upload: a failed profile write removes the new file and leaves the old one served", async () => {
  const s = fakeStore({ "resume-aaaaaaaaaaaa.pdf": OLD }, `${UID}/resume-aaaaaaaaaaaa.pdf`);
  s.state.saveOk = false;
  assert.equal(await uploadOriginalResume(s.bucket, s.profile, UID, new Blob(["%PDF-"])), null);
  assert.deepEqual([...s.objects.keys()], ["resume-aaaaaaaaaaaa.pdf"]);
  assert.equal(s.state.db, `${UID}/resume-aaaaaaaaaaaa.pdf`);
});

test("upload: a failed upload deletes nothing", async () => {
  const s = fakeStore({ "resume-bbbbbbbbbbbb.pdf": OLD }, null);
  s.state.uploadOk = false;
  assert.equal(await uploadOriginalResume(s.bucket, s.profile, UID, new Blob(["%PDF-"])), null);
  assert.ok(s.objects.has("resume-bbbbbbbbbbbb.pdf"));
  assert.ok(!s.log.some((l) => l.startsWith("remove")));
});

test("upload: a failing prune never blocks the upload", async () => {
  const s = fakeStore({ "resume-bbbbbbbbbbbb.pdf": OLD }, null);
  s.state.removeThrows = true;
  const path = await uploadOriginalResume(s.bucket, s.profile, UID, new Blob(["%PDF-"]));
  assert.ok(path);
  assert.equal(s.state.db, path);
});
