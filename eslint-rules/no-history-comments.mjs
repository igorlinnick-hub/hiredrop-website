// A comment explains why the code is the way it is now. How it got here — dates,
// PR numbers, who asked, chat quotes — belongs in the commit and the PR, where
// `git blame` leads. See "Code standards" in AGENTS.md.

const MARKERS = [
  { what: "a date", re: /\b(?:20\d\d-)?(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/ },
  {
    what: "a PR or issue number",
    re: /(?:\b(?:PR|web|HireDrop|jobflow|backend|ext|site|issue)\s*#\d+|\(#\d+\))/i,
  },
  { what: "a person's name", re: /\bIgor\b/i },
  { what: "non-English text", re: /[А-Яа-яЁё]/ },
];

const DIRECTIVE = /^\s*(?:eslint|global|exported|@ts-|\/ <reference)/;

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow history (dates, PR numbers, names) in code comments" },
    schema: [],
    messages: {
      history:
        "Comment carries history ({{what}}). Say why the code is this way now; put the history in the commit/PR.",
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (DIRECTIVE.test(comment.value)) continue;
          const hit = MARKERS.find((m) => m.re.test(comment.value));
          if (hit) context.report({ loc: comment.loc, messageId: "history", data: { what: hit.what } });
        }
      },
    };
  },
};

export default { meta: { name: "local" }, rules: { "no-history-comments": rule } };
