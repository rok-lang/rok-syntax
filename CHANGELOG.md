# Changelog

All notable changes to this stone. Versions follow semver, independent of the Rok toolchain.

## 0.2.0 (unreleased)

Needs Rok 0.2.

### Added

- Rok 0.2 syntax: `macro`, `defer`, `dyn`, `move`, `gen` and `do` are reserved keywords
  (`Kind::Keyword`, TextMate `keyword.other.reserved`, tree-sitter `@keyword`); names after
  `.`, before `:`, in struct literals and `r#name` stay names.
- Labeled return `return@each`: `@each` is a label; `return @x` keeps the template token.
- tree-sitter: Rust operator precedence (`∘` above `*`), and a statement's trailing-closure
  call ends at its `}`.
- Membership `x in xs` and `x !in xs` (`!in` a word operator; a range on the right needs no
  parentheses), chained comparisons, tuple assignment `(a, b) = (b, a)`, `for ref x in xs`.
- `using x = e;` statements; a struct literal may end a binding (`using r = R { x: 1 };`).
- Patterns in fn and closure parameters (`(a, b): (i32, i32)`, `P { x, y }: P`, `|(k, v)|`).
- `some Tr` parameter and return types (`storage.type.some`, `@keyword`; `Kind::Keyword` only
  after `:` or `->`).
- Byte chars `b'0'`; `**`, `.**`, `**=`; in-place broadcast `.=`, `.+=`, `.-=`, `.*=`, `./=`,
  `.%=`, `.**=`; `.??`; `try? f() ?? d` is `(try? f()) ?? d`.
- tree-sitter: multi-axis index parts (`a[1:, ::2, .., 0]`), `[move x]` capture lists.

## 0.1.0

First release.
