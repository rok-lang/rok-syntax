// The corpus format and grammars/classes.rokon, shared by the runners.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Scope prefix -> class row, from grammars/classes.rokon (one tuple a line).
export const classes = new Map();
for (const line of fs.readFileSync(path.join(root, "grammars/classes.rokon"), "utf8").split("\n")) {
  const m = line.match(/^\s*\(\s*"([^"]+)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\s*\),/);
  if (m) classes.set(m[1], { kind: m[2], capture: m[3], lsp: m[4] });
}

// The longest classes.rokon prefix of a scope, language suffix dropped.
export function classOf(scope) {
  let s = scope.replace(/\.(rok|rokon)$/, "");
  for (;;) {
    if (classes.has(s)) return s;
    const dot = s.lastIndexOf(".");
    if (dot < 0) return null;
    s = s.slice(0, dot);
  }
}

// Parses an assertion line `// ^^ a b - c` or `// <~~-- a`; null if
// the line is not one.
function parseAssertion(line, token) {
  const at = line.indexOf(token);
  if (at < 0 || line.slice(0, at).trim() !== "") return null;
  const rest = line.slice(at + token.length);
  const lead = rest.match(/^\s*/)[0].length;
  const body = rest.slice(lead);
  const cols = [];
  let tail;
  if (body.startsWith("<")) {
    const m = body.match(/^<(~*)(-+)/);
    if (!m) return null;
    for (let i = 0; i < m[2].length; i++) cols.push(m[1].length + i);
    tail = body.slice(m[0].length);
  } else if (body.startsWith("^")) {
    const m = body.match(/^[\^\s]*\^/)[0];
    const base = at + token.length + lead;
    for (let i = 0; i < m.length; i++) if (m[i] === "^") cols.push(base + i);
    tail = body.slice(m.length);
  } else {
    return null;
  }
  const [pos, neg = ""] = tail.split(/\s-\s|^-\s/);
  const words = (s) => s.trim().split(/\s+/).filter(Boolean);
  return { cols, scopes: words(pos), not: words(neg) };
}

// Source lines with their assertions, from vscode-tmgrammar-test syntax.
export function parseCorpus(text) {
  const lines = text.split(/\r?\n/);
  const head = lines[0].match(/^(\S+)\s+SYNTAX TEST\s+"([^"]+)"/);
  if (!head) throw new Error('first line must be `// SYNTAX TEST "source.rok"`');
  const [, token, scope] = head;
  const checks = [];
  let src = 0;
  lines.forEach((line, i) => {
    if (i === 0) return;
    const a = parseAssertion(line, token);
    if (a) checks.push({ ...a, line: src, at: i + 1 });
    else src = i;
  });
  return { scope, lines, checks };
}

// Corpus files: the arguments, or every file in corpus/.
export function corpusFiles(args) {
  if (args.length) return args;
  const dir = path.join(root, "corpus");
  return fs.readdirSync(dir).filter((f) => /\.(rok|rokon)$/.test(f)).sort().map((f) => path.join(dir, f));
}

// Keyword lists, from grammars/keywords.rokon (one tuple a line):
// [{ lang, scope, words }].
export const keywords = [];
for (const line of fs.readFileSync(path.join(root, "grammars/keywords.rokon"), "utf8").split("\n")) {
  const m = line.match(/^\s*\(\s*"([^"]+)",\s*"([^"]+)",\s*\[([^\]]*)\]\s*\),/);
  if (m) keywords.push({ lang: m[1], scope: m[2], words: [...m[3].matchAll(/"([^"]+)"/g)].map((w) => w[1]) });
}
