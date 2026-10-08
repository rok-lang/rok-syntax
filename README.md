# rok-syntax

rok 과 RokON 소스의 토크나이저와 HTML 하이라이터입니다. 키워드, 타입, 문자열, 문자, 숫자, 주석, 속성을 구분하며, f-string 은 구멍 (`{..}`) 안을 코드로 다룹니다 (구멍 안에서 같은 따옴표를 다시 쓰거나 f-string 을 중첩해도 됩니다). [rok-lang.org](https://rok-lang.org) 와 [rokstones.io](https://rokstones.io) 가 코드 블록에 씁니다.

## 사용

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

| 항목 | 설명 |
|------|------|
| `highlight_rok(src: str) -> str`    | rok 소스를 HTML 로. 토큰은 `<span class="..">`, `&` `<` `>` 는 이스케이프. `<pre><code>` 안에 넣습니다 |
| `highlight_rokon(src: str) -> str`  | RokON 소스를 HTML 로. 키워드는 `true` / `false` / `none` 뿐 |
| `tokens(src: str) -> List<Token>`   | rok 소스의 토큰. 모든 토큰의 `text` 를 이으면 원래 소스 |
| `tokens_rokon(src: str) -> List<Token>` | RokON 소스의 토큰 |
| `to_html(toks: List<Token>) -> str` | 토큰을 `highlight_*` 와 같은 HTML 로 |
| `Token { kind: Kind, text: str }`   | 소스의 한 조각 |
| `Kind`                              | `Keyword` `Type` `Str` `Number` `Comment` `Attribute` `Text` |
| `Kind::class(self) -> str`          | 그 토큰의 CSS 클래스: `k` `t` `s` `n` `c` `a`, `Text` 는 `""` (span 없음) |

`Text` 는 식별자, 연산자, 구두점, 공백이며 이어진 것은 한 토큰으로 합칩니다. 대문자로 시작하는 식별자와 기본 타입 이름 (`i32`, `str` ..) 은 `Type` 입니다. 문자 리터럴은 `Str` 입니다.

CSS 예:

```css
.k { color: #a626a4; } .t { color: #c18401; } .s { color: #50a14f; }
.n { color: #986801; } .c { color: #a0a1a7; font-style: italic; } .a { color: #4078f2; }
```

## 개발

```bash
rok test        # 테스트
rok fmt --check
rok doc         # target/doc/ 에 API 문서
```

## publish

아직 rokstones.io 에 publish 하지 않았습니다. 지금은 rok-lang.org 와 rokstones.io 가 path 의존 (`"rok-syntax": Dep::path("../stones/rok-syntax")`) 으로 씁니다. publish 순서는 다음과 같습니다.

1. 이 저장소를 `https://github.com/rok-lang/rok-syntax` 에 push 합니다.
2. `rok publish` 로 인덱스 줄을 미리 보고, [rokstones.io-index](https://github.com/rok-lang/rokstones.io-index) checkout 에서 `rok publish --index <checkout> --commit` 으로 커밋한 뒤 pull request 로 보냅니다.
3. 병합되면 두 사이트의 의존을 `"rok-syntax": "0.1"` 로 바꿉니다.

매니페스트에 아직 `description` / `license` / `repository` 필드가 없어서 `rok.rokon` 머리 주석에 적어 두었습니다. 필드가 생기면 옮깁니다.

## 라이선스

[MIT](LICENSE-MIT) 또는 [Apache-2.0](LICENSE-APACHE) 중 하나를 골라 쓸 수 있습니다.
