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

## 0.1.0

First release.
