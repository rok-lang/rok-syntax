// Checks the TextMate grammars against the corpus assertions.
//
//   node scripts/test-textmate.mjs              run every corpus file
//   node scripts/test-textmate.mjs FILE..       run some files
//   node scripts/test-textmate.mjs --dump FILE  print each line's tokens
//
// Assertion syntax is vscode-tmgrammar-test's (docs/token-classes.md).
// Every scope a grammar names, and every scope the corpus asserts, must
// have a row in grammars/classes.rokon.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vsctm from "vscode-textmate";
import onig from "vscode-oniguruma";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const grammarFiles = {
  "source.rok": path.join(root, "grammars/rok.tmLanguage.json"),
  "source.rokon": path.join(root, "grammars/rokon.tmLanguage.json"),
};

const wasm = fs.readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm"));
await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
const registry = new vsctm.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (p) => new onig.OnigScanner(p),
    createOnigString: (s) => new onig.OnigString(s),
  }),
  loadGrammar: async (scope) => {
    const f = grammarFiles[scope];
    return f ? vsctm.parseRawGrammar(fs.readFileSync(f, "utf8"), f) : null;
  },
});

// Scope prefix -> class row, from grammars/classes.rokon (one tuple a line).
const classes = new Map();
for (const line of fs.readFileSync(path.join(root, "grammars/classes.rokon"), "utf8").split("\n")) {
  const m = line.match(/^\s*\(\s*"([^"]+)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\s*\),/);
  if (m) classes.set(m[1], { kind: m[2], capture: m[3], lsp: m[4] });
}

// The longest classes.rokon prefix of a scope, language suffix dropped.
function classOf(scope) {
  let s = scope.replace(/\.(rok|rokon)$/, "");
  for (;;) {
    if (classes.has(s)) return s;
    const dot = s.lastIndexOf(".");
    if (dot < 0) return null;
    s = s.slice(0, dot);
  }
}

function grammarScopes(g, acc = new Set()) {
  if (Array.isArray(g)) g.forEach((x) => grammarScopes(x, acc));
  else if (g && typeof g === "object") {
    for (const [k, v] of Object.entries(g)) {
      if ((k === "name" || k === "contentName") && typeof v === "string") acc.add(v);
      else grammarScopes(v, acc);
    }
  }
  return acc;
}

async function tokenize(scope, lines) {
  const g = await registry.loadGrammar(scope);
  let stack = vsctm.INITIAL;
  return lines.map((line) => {
    const r = g.tokenizeLine(line, stack);
    stack = r.ruleStack;
    return r.tokens;
  });
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

async function run(file) {
  const { scope, lines, checks } = parseCorpus(fs.readFileSync(file, "utf8"));
  const toks = await tokenize(scope, lines);
  const fails = [];
  for (const c of checks) {
    for (const s of [...c.scopes, ...c.not]) {
      if (!classOf(s)) fails.push(`${file}:${c.at}: scope ${s} has no row in grammars/classes.rokon`);
    }
    for (const col of c.cols) {
      const t = toks[c.line].find((t) => t.startIndex <= col && col < t.endIndex);
      const have = t ? t.scopes : [];
      const miss = c.scopes.filter((s) => !have.includes(s));
      const bad = c.not.filter((s) => have.includes(s));
      if (miss.length || bad.length) {
        const ch = lines[c.line][col] ?? "";
        fails.push(`${path.relative(root, file)}:${c.at}: col ${col} ${JSON.stringify(ch)}: ` +
          (miss.length ? `missing ${miss.join(" ")}` : "") +
          (bad.length ? ` unexpected ${bad.join(" ")}` : "") + `\n    have ${have.join(" ")}`);
      }
    }
  }
  return { checks: checks.length, fails };
}

async function dump(file) {
  const { scope, lines } = parseCorpus(fs.readFileSync(file, "utf8"));
  const toks = await tokenize(scope, lines);
  lines.forEach((line, i) => {
    console.log(`${i + 1}: ${line}`);
    for (const t of toks[i]) {
      const text = line.slice(t.startIndex, t.endIndex);
      if (text.trim()) console.log(`    ${t.startIndex} ${JSON.stringify(text)} ${t.scopes.slice(1).join(" ")}`);
    }
  });
}

const args = process.argv.slice(2);
if (args[0] === "--dump") {
  for (const f of args.slice(1)) await dump(f);
  process.exit(0);
}

let failed = 0;
// Every scope a grammar names maps to a class.
for (const f of Object.values(grammarFiles)) {
  const g = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const s of grammarScopes([g.patterns, g.repository])) {
    if (!classOf(s)) {
      console.log(`${path.relative(root, f)}: scope ${s} has no row in grammars/classes.rokon`);
      failed++;
    }
  }
}

const dir = path.join(root, "corpus");
const files = args.length
  ? args
  : fs.readdirSync(dir).filter((f) => /\.(rok|rokon)$/.test(f)).sort().map((f) => path.join(dir, f));
let total = 0;

// The shebang is only on a file's first line, where the corpus has its
// header, so it is checked here.
const shebang = [
  [["#!/usr/bin/env rok", "let x = 1;"], 0, "comment.line.shebang.rok"],
  [["#!/usr/bin/env rok", "let x = 1;"], 1, "storage.type.rok"],
  [["#![allow(unused)]"], 0, "meta.attribute.rok"],
  [["let x = 1;", "#!/x"], 1, null],
];
for (const [lines, line, want] of shebang) {
  const t = (await tokenize("source.rok", lines))[line][0].scopes;
  const ok = want ? t.includes(want) : !t.some((s) => s.startsWith("comment"));
  total++;
  if (!ok) {
    console.log(`shebang: ${JSON.stringify(lines)} line ${line + 1}: want ${want ?? "no comment"}, have ${t.join(" ")}`);
    failed++;
  }
}

for (const f of files) {
  const r = await run(f);
  total += r.checks;
  for (const m of r.fails) console.log(m);
  failed += r.fails.length;
  console.log(`${r.fails.length ? "FAIL" : "ok  "} ${path.relative(root, f)} (${r.checks} assertions)`);
}
console.log(`\n${files.length} files, ${total} assertions, ${failed} failures`);
process.exit(failed ? 1 : 0);
