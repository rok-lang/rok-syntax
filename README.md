# rok-syntax

A tokenizer and HTML highlighter for Rok and ROKON source. It distinguishes
keywords, types, strings, numbers, comments, and attributes.
[docs.rok-lang.org](https://docs.rok-lang.org) and [rokstones.io](https://rokstones.io)
use it for code blocks.

## Usage

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

## API

| Item | Description |
|------|-------------|
| `highlight_rok(src: str) -> str`    | Rok source to HTML. Tokens become `<span class="..">`; `&` `<` `>` are escaped. Put the result inside `<pre><code>` |
| `highlight_rokon(src: str) -> str`  | ROKON source to HTML. The only keywords are `true` / `false` / `none` |
| `tokens(src: str) -> List<Token>`   | Tokens of Rok source. Concatenating every token's `text` gives back the source |
| `tokens_rokon(src: str) -> List<Token>` | Tokens of ROKON source |
| `to_html(toks: List<Token>) -> str` | Tokens to the same HTML as `highlight_*` |
| `Token { kind: Kind, text: str }`   | A piece of the source |
| `Kind`                              | `Keyword` `Type` `Str` `Number` `Comment` `Attribute` `Text` |
| `Kind::class(self) -> str`          | The token's CSS class: `k` `t` `s` `n` `c` `a`; `""` for `Text` (no span) |

## Development

```bash
rok test        # tests
rok bench       # benchmarks
rok fmt --check
rok doc         # API docs in target/doc/
```

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
