# Token classes

One table ties the four highlighters of Rok together: the TextMate
grammars in `grammars/`, the tree-sitter grammar in `tree-sitter/`, the
Rok library in `src/`, and the semantic tokens of `rokls`. The
machine-readable copy is [`grammars/classes.rokon`](../grammars/classes.rokon);
both test runners read it, and every scope the grammars name must have a
row there.

## Table

A TextMate scope takes the row of its longest listed prefix, without the
`.rok` / `.rokon` suffix: `constant.numeric.hex.rok` takes the
`constant.numeric` row.

| Class | Example | TextMate scope | tree-sitter capture | LSP type | `Kind` |
|-------|---------|----------------|---------------------|----------|--------|
| line comment | `// x` | `comment.line.double-slash` | `@comment` | `comment` | `Comment` |
| block comment (nests) | `/* a /* b */ */` | `comment.block` | `@comment` | `comment` | `Comment` |
| doc comment | `///` `//!` `/** */` `/*! */` | `comment.line.documentation`, `comment.block.documentation` | `@comment.documentation` | `comment` | `Comment` |
| shebang | `#!/usr/bin/env rok` | `comment.line.shebang` | `@keyword.directive` | `comment` | `Comment` |
| string | `"a\n"` | `string.quoted.double` | `@string` | `string` | `Str` |
| raw string | `r#"a"#` | `string.quoted.double.raw` | `@string` | `string` | `Str` |
| byte string | `b"GET"` | `string.quoted.double.byte` | `@string` | `string` | `Str` |
| f-string | `f"x = {x}"`, `f"""..."""` | `string.interpolated`, `string.interpolated.triple` | `@string` | `string` | `Str` |
| string prefix | `f` `r` `b` `c` | `storage.type.string` | `@string` | `string` | `Str` |
| char | `'A'` `'\n'` | `string.quoted.single.char` | `@character` | `string` | `Str` |
| byte char | `c'A'` | `string.quoted.single.byte` | `@character` | `string` | `Str` |
| escape | `\n` `\u{1F600}` `{{` `$$` | `constant.character.escape` | `@string.escape` | `string` | `Str` |
| bad escape | `\q` | `invalid.illegal.escape` | `@error` | | (outer) |
| hole delimiters | `{` `}` `${` | `punctuation.section.interpolation` | `@punctuation.special` | | `Str` |
| hole code | `{a + b}` | `meta.interpolation` | `@embedded` | | `Text` |
| format spec | `:>8` `:.2f` | `constant.other.format-spec` | `@string.special` | `string` | `Str` |
| integer | `42` `0xFF` `0b1` `0o7` | `constant.numeric.decimal`, `.hex`, `.binary`, `.octal` | `@number` | `number` | `Number` |
| float | `1.5e-3` `1.` | `constant.numeric.float` | `@number.float` | `number` | `Number` |
| numeric suffix | `u8` in `0xFFu8`, `kg` in `5kg` | `entity.name.type.numeric` | `@number` | `number` (`decorator` from `rokls` for a `#[literal]` suffix) | `Number` |
| control keyword | `if` `for` `in` `return` `try` `catch` | `keyword.control` | `@keyword` | `keyword` | `Keyword` |
| declaration keyword | `let` `struct` `type` `mod` | `storage.type` | `@keyword` | `keyword` | `Keyword` |
| `fn` | `fn` | `storage.type.function` | `@keyword.function` | `keyword` | `Keyword` |
| `any` | `any Error` | `storage.type.any` | `@keyword` | `keyword` | `Keyword` |
| modifier | `pub` `const` `mut` `async` | `storage.modifier` | `@keyword.modifier` | `keyword` | `Keyword` |
| visibility qualifier | `pkg` in `pub(pkg)` | `storage.modifier.visibility` | `@keyword.modifier` | `keyword` | `Keyword` |
| other keyword | `use` `where` `throws` | `keyword.other` | `@keyword` | `keyword` | `Keyword` |
| path root | `pkg::` `sup::` `rok::` | `keyword.other.path` | `@module.builtin` | `keyword` | `Keyword` |
| word operator | `as` `is` | `keyword.operator.word` | `@keyword.operator` | `keyword` | `Keyword` |
| boolean, none | `true` `false` / `none` | `constant.language.boolean` / `.none` | `@boolean` / `@constant.builtin` | `keyword` | `Keyword` |
| self | `self` `Self` | `variable.language.self` | `@variable.builtin` | `keyword` | `Keyword` |
| primitive type | `i32` `str` `c_char` | `support.type.primitive` | `@type.builtin` | `type` | `Type` |
| type | `Point` `MAX` `Kind::Ident` | `entity.name.type` | `@type` | `type` | `Type` |
| generics | `<` `>` of `List<T>` | `punctuation.definition.generic` in `meta.generic` | `@punctuation.bracket` | | `Text` |
| function name | `add` in `fn add` | `entity.name.function` | `@function` | `function` | `Text` |
| call | `f` in `f(x)`, `x.len()` | `entity.name.function.call` | `@function.call` | `function` | `Text` |
| macro call | `log!` `dep::log!` | `entity.name.function.macro` | `@function.macro` | `macro` | `Macro` |
| template token | `@macro` `@Self` `@field` `@x` | `keyword.other.template` (`@`: `punctuation.definition.template`) | `@function.macro` | `macro` | `Macro` |
| attribute | `#[derive(Debug)]` `#![allow(x)]` | `meta.attribute` (name: `entity.name.function.attribute`) | `@attribute` | `decorator` | `Attribute` |
| namespace | `std` in `std::fs`, `geom` in `mod geom` | `entity.name.namespace` | `@module` | `namespace` | `Text` |
| parameter | `a` in `fn f(a: i32)` | `variable.parameter` | `@variable.parameter` | `parameter` | `Text` |
| member | `type` in `t.type` | `variable.other.member` | `@property` | `property` | `Text` |
| ROKON field | `name` in `name: "x"` | `support.type.property-name` | `@property` | `property` | `Text` |
| label | `'outer` | `entity.name.label` | `@label` | | `Text` |
| identifier | `x` `r#match`, Unicode names | `variable.other` | `@variable` | `variable` | `Text` |
| operator | `+` `==` `..=` `.+` `?.` `->`, Unicode math operators | `keyword.operator.*` | `@operator` | `operator` | `Text` |
| punctuation | `(` `,` `;` `.` `::` `:` | `punctuation.brackets.*`, `punctuation.separator.*`, `punctuation.terminator.*`, `punctuation.accessor` | `@punctuation.bracket`, `@punctuation.delimiter` | | `Text` |

`Kind` is coarser than the scopes: identifiers, operators, punctuation,
labels and names are all `Text`, and an attribute is one `Attribute`
token, its arguments included. Its CSS classes are `k` `t` `s` `n` `c`
`a` `m`; `Text` gets no span.

`rokls` adds semantic tokens only for what no static grammar can know:
`macro` (macro calls), `decorator` (user-defined literal suffixes and
attributes), `keyword` (`#[keyword]` words) and `operator` (`#[infix]`
operators). The LSP column is what an editor should map each class to
when it themes semantic tokens and TextMate scopes alike.

## Keyword rules

Rok's contextual keywords are keywords only in some positions (spec
1.5.4, 1.5.5). All three highlighters use the same lexical rules, which
look at the neighbouring characters only:

1. A word right after `.` (not `..`) is a member name, keywords
   included: `x.type`, `s.match(p)`.
2. The word after `fn` or `mod` is a name: `fn catch(e: str)`.
3. A keyword other than `true` `false` `none` `self` `Self` before a
   single `:` is a name: `struct T { type: Kind; for: str; }`,
   `f(type: 1)`.
4. A contextual keyword (`type` `any` `in` `where` `throws` `rethrows`
   `catch` `finally` `const` `static` `extern` `mut` `union`) before
   `=` (not `==` / `=>`), `,`, `)`, `]` or `.` is a name: `let in = 3`.
5. `type` is a keyword only before a name and `=` `<` `;` or `:`
   (`type Pair = ..`, `type Output;`); `union` only before a name.
6. `pkg` `sup` `rok` are keywords only right before `::`; `pkg` `sub`
   only inside `pub( )`.
7. `name!` is a macro unless `name` is a reserved keyword (`try!` is
   `try` and `!`); `!=` is never a macro.
8. `r#name` is always a name.
9. `'` starts a char literal when an escape or one character and a
   closing `'` follow; otherwise `'name` is a label.
10. A capitalized word is a type; so are the primitive type names.

The words that become keywords in 0.2.0 (`macro` `defer` `dyn` `move`
`gen` `do`) are names.

## Corpus

`corpus/` holds small `.rok` and `.rokon` files with expected scopes, in
the assertion syntax of
[vscode-tmgrammar-test](https://github.com/PanAeon/vscode-tmgrammar-test):

```rok
// SYNTAX TEST "source.rok" "what the file covers"
    let x = r#match(1);
//  ^^^ storage.type.rok
//          ^^^^^^^ entity.name.function.call.rok - keyword.control.rok
// <---- source.rok
```

- The first line names the root scope: `source.rok` or `source.rokon`.
- An assertion line is a `//` comment whose first non-space character is
  `^` or `<`. It checks the closest source line above it.
- `^` marks the columns it is under. `<-` starts at column 0, one `-`
  per column; `<~~--` skips two columns first.
- The scopes after the marks must all be on the token at each column;
  scopes after ` - ` must not be.
- Assertion lines are comments, so they stay in the source the grammars
  see. Columns count UTF-16 units.

How each implementation uses it:

- TextMate: `node scripts/test-textmate.mjs` checks every assertion.
  `--dump FILE` prints each line's tokens and scopes. The files also run
  under `vscode-tmgrammar-test` itself.
- The Rok library: `rok test` (`tests/suite.rok`) maps an assertion's
  scopes to one `Kind` and checks the token at each column. The `Kind`
  is `Attribute` if any scope maps to it; otherwise that of the last
  scope with a `Kind`. Assertions without one are skipped, and so are
  the ` - ` scopes.
- tree-sitter: map each scope to its capture through the table, as
  `rok test` does for `Kind`; tree-sitter's own highlight tests use the
  same `^` / `<-` marks with `@capture` names.

To add a case, write the source line and its assertions, then run both
`npm test` and `rok test`.
