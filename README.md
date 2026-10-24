# rok-syntax

A tokenizer and HTML highlighter for rok and ROKON source. It distinguishes keywords, types, strings, numbers, comments, and attributes, and treats the inside of f-string holes (`{..}`) as code (reusing the same quote or nesting f-strings inside a hole is fine). [docs.rok-lang.org](https://docs.rok-lang.org) and [rokstones.io](https://rokstones.io) use it for code blocks.

## Usage

```rokon
Package {
    deps: { "rok-syntax": "0.1" },
}
```

```rok
let html = rok_syntax::highlight_rok("let x: i32 = f\"{y:>8}\";");
// <span class="k">let</span> x: <span class="t">i32</span> = <span class="s">f"{</span>y<span class="s">:&gt;8</span><span class="s">}"</span>;
println(f"<pre><code>{html}</code></pre>");

for t in rok_syntax::tokens("fn main() {}") {
    println(f"{t.kind:?} {t.text:?}");
}
```

## API

| Item | Description |
|------|-------------|
| `highlight_rok(src: str) -> str`    | rok source to HTML. Tokens become `<span class="..">`; `&` `<` `>` are escaped. Put the result inside `<pre><code>` |
| `highlight_rokon(src: str) -> str`  | ROKON source to HTML. The only keywords are `true` / `false` / `none` |
| `tokens(src: str) -> List<Token>`   | Tokens of rok source. Concatenating every token's `text` gives back the source |
| `tokens_rokon(src: str) -> List<Token>` | Tokens of ROKON source |
| `to_html(toks: List<Token>) -> str` | Tokens to the same HTML as `highlight_*` |
| `Token { kind: Kind, text: str }`   | A piece of the source |
| `Kind`                              | `Keyword` `Type` `Str` `Number` `Comment` `Attribute` `Text` |
| `Kind::class(self) -> str`          | The token's CSS class: `k` `t` `s` `n` `c` `a`; `""` for `Text` (no span) |

`Text` is identifiers, operators, punctuation, and whitespace; adjacent pieces merge into one token. Identifiers starting with an uppercase letter and primitive type names (`i32`, `str` ..) are `Type`. Character literals are `Str`.

Example CSS:

```css
.k { color: #a626a4; } .t { color: #c18401; } .s { color: #50a14f; }
.n { color: #986801; } .c { color: #a0a1a7; font-style: italic; } .a { color: #4078f2; }
```

## Development

```bash
rok test        # tests
rok bench       # benchmarks
rok fmt --check
rok doc         # API docs in target/doc/
```

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
