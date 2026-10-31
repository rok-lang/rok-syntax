# rok-syntax

Syntax highlighting for Rok and ROKON, in one place:

| Path | What |
|------|------|
| `grammars/rok.tmLanguage.json`, `grammars/rokon.tmLanguage.json` | TextMate grammars (`source.rok`, `source.rokon`) |
| `tree-sitter/` | tree-sitter grammar and highlight queries |
| `src/` | the Rok library: a tokenizer and HTML highlighter |
| `corpus/` | small `.rok` / `.rokon` files with the scopes every highlighter must give |
| `grammars/classes.rokon`, [`docs/token-classes.md`](docs/token-classes.md) | the token classes: TextMate scope, tree-sitter capture, LSP type, library `Kind` |

All three implementations are tested against the same corpus and keep
the same keyword rules ([docs/token-classes.md](docs/token-classes.md)).

## Editors

- VS Code ([rok.vscode](https://github.com/rok-lang/rok.vscode)), Shiki,
  GitHub Linguist and other TextMate hosts: take
  `grammars/rok.tmLanguage.json` for `.rok` and
  `grammars/rokon.tmLanguage.json` for `.rokon`. Scopes follow the
  TextMate naming conventions, so stock themes color them.
- Neovim, Helix, Zed and other tree-sitter hosts: build `tree-sitter/`
  and use its `queries/`.
- Vim ([rok.vim](https://github.com/rok-lang/rok.vim)) has its own
  syntax files.
- Semantic tokens from `rokls` cover only what no static grammar can
  know (macros, user-defined suffixes, keywords and operators); map them
  with the LSP column of the table.

## The Rok library

[docs.rok-lang.org](https://docs.rok-lang.org) and
[rokstones.io](https://rokstones.io) use it for code blocks.

```rokon
Package {
    deps: { "rok-syntax": "0.1" },
}
```

```rok
let html = rok_syntax::highlight_rok("let x: i32 = f\"{y:>8}\";");
println(f"<pre><code>{html}</code></pre>");

for t in rok_syntax::tokens("fn main() {}") {
    println(f"{t.kind:?} {t.text:?}");
}
```

| Item | Description |
|------|-------------|
| `highlight_rok(src: str) -> str`    | Rok source to HTML. Tokens become `<span class="..">`; `&` `<` `>` are escaped. Put the result inside `<pre><code>` |
| `highlight_rokon(src: str) -> str`  | ROKON source to HTML. The only keywords are `true` / `false` / `none`; a name before `:` is a field |
| `tokens(src: str) -> List<Token>`   | Tokens of Rok source. Concatenating every token's `text` gives back the source |
| `tokens_rokon(src: str) -> List<Token>` | Tokens of ROKON source |
| `to_html(toks: List<Token>) -> str` | Tokens to the same HTML as `highlight_*` |
| `Token { kind: Kind, text: str }`   | A piece of the source |
| `Kind`                              | `Keyword` `Type` `Str` `Number` `Comment` `Attribute` `Text` `Macro` |
| `Kind::class(self) -> str`          | The token's CSS class: `k` `t` `s` `n` `c` `a` `m`; `""` for `Text` (no span) |

`Macro` (`m`) marks macro calls (`log!`) and meta template tokens
(`@macro`, `@Self`); a stylesheet without an `m` rule shows them as
plain text.

## Development

```bash
npm ci && npm test   # TextMate grammars against corpus/
rok test             # the library, against the same corpus
rok bench            # benchmarks
rok fmt --check
rok doc              # API docs in target/doc/
```

`node scripts/test-textmate.mjs --dump FILE` prints the scopes of each
line, which helps when writing corpus assertions.

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
