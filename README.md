# rok-syntax

Syntax highlighting for Rok and ROKON, in one place:

| Path | What |
|------|------|
| `grammars/rok.tmLanguage.json`, `grammars/rokon.tmLanguage.json` | TextMate grammars (`source.rok`, `source.rokon`) |
| `tree-sitter/rok/`, `tree-sitter/rokon/` | tree-sitter grammars and queries |
| `src/` | the Rok library: a tokenizer and HTML highlighter |
| `corpus/` | small `.rok` / `.rokon` files with the scopes every highlighter must give |
| `grammars/classes.rokon`, [`docs/token-classes.md`](docs/token-classes.md) | the token classes: TextMate scope, tree-sitter capture, LSP type, library `Kind` |
| `grammars/keywords.rokon` | the keywords of each class |

All three implementations are tested against the same corpus and keep
the same keyword rules ([docs/token-classes.md](docs/token-classes.md));
[`grammars/keywords.rokon`](grammars/keywords.rokon) lists the keywords.

## Editors

- VS Code: [rok.vscode](https://github.com/rok-lang/rok.vscode) ships
  the TextMate grammars.
- Vim and Neovim: [rok.vim](https://github.com/rok-lang/rok.vim) ships
  the queries for Neovim and Vim syntax files made from the keyword
  lists.
- Semantic tokens from `rokls` cover only what no static grammar can
  know (macros, user-defined suffixes, keywords and operators); map them
  with the LSP column of the table.

### TextMate

`grammars/rok.tmLanguage.json` (`source.rok`, for `.rok`) and
`grammars/rokon.tmLanguage.json` (`source.rokon`, for `.rokon`) work in
any TextMate host: VS Code, Shiki, GitHub Linguist, Sublime Text, bat.
Scopes follow the TextMate naming conventions, so stock themes color
them. With Shiki:

```js
import rok from "./rok.tmLanguage.json" with { type: "json" };
const html = await codeToHtml(src, { lang: "rok", langs: [{ ...rok, name: "rok" }], theme: "github-dark" });
```

### tree-sitter

The grammars are `tree-sitter/rok` and `tree-sitter/rokon`; the parsers
in `src/` are generated and checked in, so an editor needs only a C
compiler. Each has `queries/highlights.scm`, `locals.scm`,
`injections.scm`, `folds.scm` and `indents.scm`. Capture names follow
nvim-treesitter (`@keyword.conditional`, `@function.call`,
`@string.escape`).

Neovim, with nvim-treesitter's `master` branch (rok.vim does this for
you and ships the queries):

```lua
local parsers = require("nvim-treesitter.parsers").get_parser_configs()
parsers.rok = {
  install_info = {
    url = "https://github.com/rok-lang/rok-syntax",
    location = "tree-sitter/rok",
    files = { "src/parser.c", "src/scanner.c" },
    branch = "main",
  },
  filetype = "rok",
}
parsers.rokon = {
  install_info = {
    url = "https://github.com/rok-lang/rok-syntax",
    location = "tree-sitter/rokon",
    files = { "src/parser.c", "src/scanner.c" },
    branch = "main",
  },
  filetype = "rokon",
}
```

Then `:TSInstall rok rokon`. Without rok.vim, copy
`tree-sitter/rok/queries/*.scm` to `queries/rok/` and
`tree-sitter/rokon/queries/*.scm` to `queries/rokon/` on your
`runtimepath`, and start highlighting with `vim.treesitter.start()` in
a `FileType rok,rokon` autocommand.

Helix, in `languages.toml`:

```toml
[[language]]
name = "rok"
scope = "source.rok"
file-types = ["rok"]
roots = ["rok.rokon"]
comment-token = "//"
block-comment-tokens = { start = "/*", end = "*/" }
indent = { tab-width = 4, unit = "    " }
language-servers = ["rokls"]

[[grammar]]
name = "rok"
source = { git = "https://github.com/rok-lang/rok-syntax", rev = "COMMIT", subpath = "tree-sitter/rok" }

[language-server.rokls]
command = "rokls"
```

Add the same `[[language]]` and `[[grammar]]` for `rokon` (file type
`rokon`, subpath `tree-sitter/rokon`, no language server), run
`hx --grammar fetch && hx --grammar build`, and copy the queries to
`~/.config/helix/runtime/queries/rok/` and `.../queries/rokon/`. Helix
themes color most captures by prefix (`keyword.*`, `type.*`,
`string.*`, `function.*`); a few nvim-treesitter names (`@boolean`,
`@number`, `@character`, `@module`, `@property`) need theme entries.

Zed: a Zed extension names the grammar in its `extension.toml` and
carries the queries in `languages/rok/` with a `config.toml`
(`name = "Rok"`, `grammar = "rok"`, `path_suffixes = ["rok"]`):

```toml
[grammars.rok]
repository = "https://github.com/rok-lang/rok-syntax"
rev = "COMMIT"
path = "tree-sitter/rok"
```

## The Rok library

[docs.rok-lang.org](https://docs.rok-lang.org) and
[rokstones.io](https://rokstones.io) use it for code blocks.

```rokon
Package {
    deps: { "rok-syntax": "0.2" },
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
npm ci && npm test   # TextMate and tree-sitter grammars against corpus/
rok test             # the library, against the same corpus
rok bench            # benchmarks
rok fmt --check
rok doc              # API docs in target/doc/
```

`npm run test:textmate` and `npm run test:tree-sitter` run one runner;
`--dump FILE` on either script prints the scopes or captures of each
line, which helps when writing corpus assertions.

The tree-sitter grammars (tree-sitter CLI 0.27, from `npm ci`):

```bash
cd tree-sitter/rok
../../node_modules/.bin/tree-sitter generate      # after editing grammar.js
../../node_modules/.bin/tree-sitter test --config-path test/config.json
node ../scripts/smoke.mjs --grammar rok --docs ../../../docs/learn \
    --cases ../../../rok/compiler/rokc/tests/cases
```

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
