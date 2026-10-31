#!/usr/bin/env node
// Parse smoke test: every ```rok (or ```rokon) block of Markdown docs and
// every .rok file of a compiler test corpus, counting files with ERROR or
// MISSING nodes.
//
//   node scripts/smoke.mjs --grammar rok --docs ../docs/learn \
//       --cases ../rok/compiler/rokc/tests/cases [--rokc path/to/rokc] [-v]
//
// A case whose header has `// expect-error:` is skipped when rokc reports
// a lexical or parse error (E001 / E002) for it: such files are meant not
// to parse. Without --rokc every `expect-error` case is skipped.
// --skip-list FILE names the cases to skip instead (one file name a line);
// --write-skip-list FILE saves the list --rokc found.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const grammar = opt('--grammar') ?? 'rok';
const docs = opt('--docs');
const cases = opt('--cases');
const rokc = opt('--rokc');
const verbose = args.includes('-v');
const skipList = opt('--skip-list');
const writeSkip = opt('--write-skip-list');
const skipNames = skipList
  ? new Set(fs.readFileSync(skipList, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean))
  : null;
const skippedNames = [];

const here = path.dirname(new URL(import.meta.url).pathname);
const gdir = path.join(here, '..', grammar);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `ts-${grammar}-`));
const fence = grammar === 'rok' ? /^```rok(\s+(norun|build))?\s*$/ : /^```rokon\s*$/;

const files = [];

if (docs) {
  for (const md of fs.readdirSync(docs).filter((f) => f.endsWith('.md')).sort()) {
    const lines = fs.readFileSync(path.join(docs, md), 'utf8').split('\n');
    let block = null;
    let n = 0;
    for (const line of lines) {
      if (block === null && fence.test(line)) {
        block = [];
      } else if (block !== null && /^```\s*$/.test(line)) {
        n += 1;
        const out = path.join(tmp, `${md.replace(/\.md$/, '')}-${n}.${grammar}`);
        fs.writeFileSync(out, block.join('\n') + '\n');
        files.push({ kind: 'docs', file: out, label: `${md} block ${n}` });
        block = null;
      } else if (block !== null) {
        block.push(line);
      }
    }
  }
}

let skipped = 0;
if (cases) {
  for (const f of fs.readdirSync(cases).filter((f) => f.endsWith(`.${grammar}`)).sort()) {
    const full = path.join(cases, f);
    const src = fs.readFileSync(full, 'utf8');
    const head = src.split('\n').filter((l) => l.startsWith('//')).join('\n');
    const skip = skipNames
      ? skipNames.has(f)
      : /expect-error/.test(head) && parseFails(full);
    if (skip) {
      skipped += 1;
      skippedNames.push(f);
      continue;
    }
    files.push({ kind: 'cases', file: full, label: f });
  }
}

function parseFails(file) {
  if (!rokc) {
    return true;
  }
  const dir = fs.mkdtempSync(path.join(tmp, 'rokc-'));
  fs.copyFileSync(file, path.join(dir, `x.${grammar}`));
  const r = spawnSync(rokc, ['emit', '--emit=source', `x.${grammar}`], { cwd: dir, encoding: 'utf8' });
  return /error\[E00[12]\]/.test((r.stdout ?? '') + (r.stderr ?? ''));
}

const bad = new Map();
const cli = [
  path.join(gdir, 'node_modules', '.bin', 'tree-sitter'),
  path.join(here, '..', '..', 'node_modules', '.bin', 'tree-sitter'),
].find((f) => fs.existsSync(f)) ?? 'tree-sitter';
for (let i = 0; i < files.length; i += 200) {
  const batch = files.slice(i, i + 200);
  const r = spawnSync(cli, ['parse', '-q', ...batch.map((f) => f.file)], {
    cwd: gdir,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  for (const line of (r.stdout + r.stderr).split('\n')) {
    const m = line.match(/^(\S+)\s+Parse:.*\((ERROR|MISSING)/);
    if (m) {
      bad.set(m[1], line.trim());
    }
  }
}

for (const kind of ['docs', 'cases']) {
  const all = files.filter((f) => f.kind === kind);
  if (all.length === 0) {
    continue;
  }
  const failed = all.filter((f) => bad.has(f.file));
  console.log(`${kind}: ${all.length} files, ${failed.length} with ERROR/MISSING`);
  if (verbose) {
    for (const f of failed) {
      console.log(`  ${f.label}: ${bad.get(f.file).replace(/^.*Parse:\s+[\d.]+ ms\s+\d+ bytes\/ms\s+/, '')}`);
    }
  }
}
if (writeSkip) {
  fs.writeFileSync(writeSkip, skippedNames.join('\n') + '\n');
}
if (cases) {
  console.log(`cases skipped (expected parse errors): ${skipped}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
