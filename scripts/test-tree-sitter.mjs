// Checks the tree-sitter highlight queries against the corpus.
//
//   node scripts/test-tree-sitter.mjs              run every corpus file
//   node scripts/test-tree-sitter.mjs FILE..       run some files
//   node scripts/test-tree-sitter.mjs --dump FILE  print each line's captures
//
// Each asserted TextMate scope maps to its tree-sitter capture through
// grammars/classes.rokon. Some capture over the column, in the nest
// `tree-sitter highlight` gives, must be the capture of one of the
// assertion's scopes or a refinement of it
// (`keyword.repeat` for `keyword`); `@property` also stands for
// `@variable`. Scopes after `-` must not match. Scopes whose capture is
// "" are not checked, nor are lines below a `// tree-sitter: skip, why`
// line (text that is not Rok, kept for the lexical highlighters); every
// other line must parse without errors. Every capture in highlights.scm
// must be a classes.rokon capture or a refinement of one.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { root, classes, classOf, parseCorpus, corpusFiles, keywords } from "./corpus.mjs";

const grammars = {
  "source.rok": path.join(root, "tree-sitter/rok"),
  "source.rokon": path.join(root, "tree-sitter/rokon"),
};

const cli = process.env.TREE_SITTER ??
  [path.join(root, "node_modules/.bin/tree-sitter")].find((f) => fs.existsSync(f)) ??
  "tree-sitter";

const known = new Set([...classes.values()].map((c) => c.capture).filter(Boolean));

const refines = (have, want) => have === want || have.startsWith(want + ".");

// A capture matches the expected one if it refines it. TextMate knows
// only that a word is a name (`variable`) where the tree knows it is a
// field (`property`).
const matches = (have, want) => refines(have, want) || (want === "variable" && have === "property");

// Capture names in a query file, strings and comments skipped.
function queryCaptures(file) {
  const src = fs.readFileSync(file, "utf8");
  const out = new Set();
  for (const m of src.matchAll(/"(?:[^"\\]|\\.)*"|;[^\n]*|@([\w.]+)/g)) if (m[1]) out.add(m[1]);
  return out;
}

// The highlighter only emits names its theme lists, so the theme lists
// every capture the queries use.
const used = new Set();
const usedBy = {};
for (const dir of Object.values(grammars)) {
  usedBy[dir] = queryCaptures(path.join(dir, "queries/highlights.scm"));
  for (const c of usedBy[dir]) used.add(c);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rok-syntax-ts-"));
const config = path.join(tmp, "config.json");
fs.writeFileSync(config, JSON.stringify({
  "parser-directories": [],
  theme: Object.fromEntries([...new Set([...used, ...known])].sort().map((c) => [c, "#808080"])),
}));

const unescape = (s) => s.replace(/&(quot|amp|lt|gt|#39|#x27);/g, (_, e) =>
  ({ quot: '"', amp: "&", lt: "<", gt: ">", "#39": "'", "#x27": "'" })[e]);

// The captures over each column of each line, outermost first, from
// `tree-sitter highlight --html`.
function highlight(scope, file) {
  const html = execFileSync(cli, [
    "highlight", "--html", "--layout", "fragment", "--style", "minimal",
    "-p", grammars[scope], "--config-path", config, file,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
  const body = html.slice(html.indexOf("<code>") + 6, html.lastIndexOf("</code>"));
  const out = [[]];
  const stack = [];
  for (const m of body.matchAll(/<span class='([^']*)'>|<\/span>|([^<]+)/g)) {
    if (m[1] !== undefined) stack.push(m[1].replace(/ /g, "."));
    else if (m[2] === undefined) stack.pop();
    else {
      for (const ch of unescape(m[2])) {
        if (ch === "\n") out.push([]);
        else {
          for (let i = 0; i < ch.length; i++) out.at(-1).push([...stack]);
        }
      }
    }
  }
  return out;
}

// Rows (0-based) of ERROR and MISSING nodes, from `tree-sitter parse`.
function parseErrors(scope, file) {
  let out;
  try {
    out = execFileSync(cli, ["parse", "-p", grammars[scope], "--config-path", config, file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
  } catch (e) {
    out = e.stdout ?? "";
  }
  return [...out.matchAll(/\((?:ERROR|MISSING)[^\[]*\[(\d+), \d+\]/g)].map((m) => Number(m[1]));
}

// The grammars know each word of grammars/keywords.rokon, highlights.scm
// names each keyword token, and its primitive type list is the list.
function checkKeywords() {
  const fails = [];
  for (const [scope, dir] of Object.entries(grammars)) {
    const lang = scope.slice("source.".length);
    const strings = new Set();
    const walk = (x) => {
      if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === "object") {
        if (x.type === "STRING") strings.add(x.value);
        Object.values(x).forEach(walk);
      }
    };
    walk(JSON.parse(fs.readFileSync(path.join(dir, "src/grammar.json"), "utf8")).rules);
    const hl = fs.readFileSync(path.join(dir, "queries/highlights.scm"), "utf8");
    // A word the queries name: a "token", a node, or a #match? regex.
    const bool = ["(boolean_literal)", "(boolean)"];
    const nodes = { mut: ["(mutable_specifier)"], true: bool, false: bool, none: ["(none)"],
      self: ["(self)"], Self: ["(self_type)"] };
    const named = (w) => hl.includes(`"${w}"`) || (nodes[w] ?? []).some((n) => hl.includes(n)) ||
      [...hl.matchAll(/#match\? @[\w.]+\s+"([^"]*)"/g)].some((m) => new RegExp(`[(|^]${w}[|)$]`).test(m[1]));
    for (const { scope: s, words } of keywords.filter((k) => k.lang === lang)) {
      if (s === "support.type.primitive") {
        const m = hl.match(/@type\.builtin\s+"\^\(([\w|]+)\)\$"/);
        const have = m ? m[1].split("|") : [];
        if (have.join(" ") !== words.join(" ")) fails.push(`${lang}/queries/highlights.scm: primitive types are not keywords.rokon's`);
      } else {
        for (const w of words) {
          if (!strings.has(w) && s !== "keyword.other.path") fails.push(`${lang}/grammar.js: no '${w}' token (${s})`);
          if (!named(w)) fails.push(`${lang}/queries/highlights.scm: nothing captures ${w} (${s})`);
        }
      }
    }
  }
  return fails;
}

function capture(scope) {
  const c = classOf(scope);
  return c ? classes.get(c).capture : null;
}

function run(file) {
  const { scope, lines, checks } = parseCorpus(fs.readFileSync(file, "utf8"));
  const caps = highlight(scope, file);
  const fails = [];
  const rel = path.relative(root, file);
  let n = 0;
  let skipped = 0;
  const skip = (i) => /^\S+ tree-sitter: skip\b/.test(lines[i - 1] ?? "");
  for (const row of new Set(parseErrors(scope, file))) {
    if (!skip(row)) fails.push(`${rel}:${row + 1}: not Rok: mark it \`// tree-sitter: skip, why\` or fix it`);
  }
  for (const c of checks) {
    if (skip(c.line)) {
      skipped++;
      continue;
    }
    const want = c.scopes.map(capture);
    const not = c.not.map(capture);
    if ([...want, ...not].includes(null)) {
      fails.push(`${rel}:${c.at}: a scope has no row in grammars/classes.rokon`);
      continue;
    }
    const pos = want.filter(Boolean);
    const neg = not.filter((x) => x && !pos.some((p) => refines(p, x)));
    if (!pos.length && !neg.length) continue;
    n++;
    for (const col of c.cols) {
      const have = caps[c.line]?.[col] ?? [];
      const okPos = !pos.length || pos.some((w) => have.some((h) => matches(h, w)));
      const okNeg = !neg.some((x) => have.some((h) => refines(h, x)));
      if (!okPos || !okNeg) {
        fails.push(`${rel}:${c.at}: col ${col} ${JSON.stringify(lines[c.line][col] ?? "")}: ` +
          (okPos ? "" : `want @${pos.join(" or @")}`) + (okNeg ? "" : ` not @${neg.join(" @")}`) +
          `, have ${have.length ? have.map((h) => "@" + h).join(" ") : "nothing"}`);
      }
    }
  }
  return { checks: n, skipped, fails };
}

function dump(file) {
  const { scope, lines } = parseCorpus(fs.readFileSync(file, "utf8"));
  const caps = highlight(scope, file);
  lines.forEach((line, i) => {
    console.log(`${i + 1}: ${line}`);
    let start = 0;
    for (let col = 1; col <= line.length; col++) {
      const key = (c) => (caps[i][c] ?? []).join(" ");
      if (col === line.length || key(col) !== key(start)) {
        const text = line.slice(start, col);
        if (text.trim() && key(start)) console.log(`    ${start} ${JSON.stringify(text)} @${caps[i][start].join(" @")}`);
        start = col;
      }
    }
  });
}

const args = process.argv.slice(2);
try {
  if (args[0] === "--dump") {
    for (const f of args.slice(1)) dump(f);
    process.exit(0);
  }

  let failed = 0;
  for (const c of [...used].sort()) {
    if (![...known].some((k) => refines(c, k))) {
      console.log(`highlights.scm: @${c} is not a grammars/classes.rokon capture or a refinement of one`);
      failed++;
    }
  }

  // `tree-sitter test` reads test/config.json: a capture its theme
  // lacks is never checked.
  for (const [dir, caps] of Object.entries(usedBy)) {
    const cfg = path.join(dir, "test/config.json");
    const theme = JSON.parse(fs.readFileSync(cfg, "utf8")).theme ?? {};
    for (const c of [...caps].sort()) {
      if (!(c in theme)) {
        console.log(`${path.relative(root, cfg)}: theme lacks @${c}`);
        failed++;
      }
    }
  }

  for (const m of checkKeywords()) {
    console.log(m);
    failed++;
  }

  const files = corpusFiles(args);
  let total = 0;
  let skipped = 0;
  for (const f of files) {
    const r = run(f);
    total += r.checks;
    skipped += r.skipped;
    for (const m of r.fails) console.log(m);
    failed += r.fails.length;
    console.log(`${r.fails.length ? "FAIL" : "ok  "} ${path.relative(root, f)} (${r.checks} assertions)`);
  }
  console.log(`\n${files.length} files, ${total} assertions, ${skipped} skipped, ${failed} failures`);
  process.exitCode = failed ? 1 : 0;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
