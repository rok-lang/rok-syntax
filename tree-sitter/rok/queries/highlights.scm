; Rok highlights. A later pattern wins over an earlier one for the same
; node (tree-sitter-highlight 0.25, Neovim, Helix): general patterns come
; first, specific ones last.

(identifier) @variable

; A capitalized word is a type (docs/token-classes.md, rule 10). Latin,
; Greek and Cyrillic capitals: Neovim's regex has no \p{Lu}.
((identifier) @type
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))

; Operators and punctuation

[
  "+" "-" "*" "/" "%" "%%" "==" "!=" "<" ">" "<=" ">=" "&&" "||" "!" "&" "|" "^"
  "~" "<<" ">>" "=" "+=" "-=" "*=" "/=" "%=" "%%=" "&=" "|=" "^=" "<<=" ">>="
  ".." "..=" "?" "?." "??" "->" "=>" "..." "**"
  ".+" ".-" ".*" "./" ".%" ".%%" ".==" ".!=" ".<" ".>" ".<=" ".>=" ".&&" ".||"
  ".&" ".|" ".^" ".<<" ".>>"
  "×" "⋅" "÷" "∘" "√" "≡" "≠" "≤" "≥" "∈" "∉" "⊂" "⊆" "∪" "∩"
  (operator)
] @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
  "#["
  "#!["
] @punctuation.bracket

(type_arguments
  [
    "<"
    ">"
  ] @punctuation.bracket)

(type_parameters
  [
    "<"
    ">"
  ] @punctuation.bracket)

(bracketed_type
  [
    "<"
    ">"
  ] @punctuation.bracket)

[
  ","
  ";"
  ":"
  "::"
  "."
  "@"
] @punctuation.delimiter

; Keywords

[
  "let"
  "using"
  "any"
] @keyword

[
  "as"
  "is"
  "in"
  "where"
] @keyword.operator

"fn" @keyword.function

[
  "return"
  "yield"
] @keyword.return

[
  "if"
  "else"
  "match"
] @keyword.conditional

[
  "for"
  "while"
  "loop"
  "break"
  "continue"
] @keyword.repeat

[
  "try"
  "catch"
  "finally"
  "throw"
  "throws"
  "rethrows"
] @keyword.exception

[
  "use"
  "mod"
] @keyword.import

[
  "struct"
  "enum"
  "union"
  "trait"
  "impl"
  "type"
] @keyword.type

[
  "pub"
  "const"
  "static"
  "extern"
  "unsafe"
  "async"
  "ref"
  "pkg"
  "sub"
  (mutable_specifier)
] @keyword.modifier

"await" @keyword.coroutine

(closure_modifiers) @keyword.modifier

(function_item
  "yield" @keyword.coroutine)

(function_signature_item
  "yield" @keyword.coroutine)

(yield_block
  "yield" @keyword.coroutine)

(async_block
  "yield" @keyword.coroutine)

(for_expression
  "await" @keyword.coroutine)

; Literals

(string_literal) @string

(byte_string_literal) @string

(raw_string_literal) @string

(format_string) @string

(format_specifier) @string.special

; The `:` that opens a format spec is part of it.
(interpolation
  ":" @string.special)

(interpolation
  [
    "{"
    "}"
  ] @punctuation.special)

(format_specifier
  (interpolation
    [
      "{"
      "${"
      "}"
    ] @punctuation.special))

(escape_sequence) @string.escape

(char_literal) @character

(integer_literal) @number

(float_literal) @number.float

(boolean_literal) @boolean

(none) @constant.builtin

(self) @variable.builtin

; Labels

(label) @label

; Types

(type_identifier) @type

((type_identifier) @type.builtin
  (#match? @type.builtin
    "^(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|int|float|c_char)$"))

(self_type) @variable.builtin

(none_type) @constant.builtin

(never_type) @type.builtin

; Modules

(scoped_identifier
  path: (identifier) @module)

(scoped_type_identifier
  path: (identifier) @module)

(scoped_identifier
  path: (scoped_identifier
    name: (identifier) @module))

(scoped_type_identifier
  path: (scoped_identifier
    name: (identifier) @module))

(scoped_use_list
  path: (identifier) @module)

(use_wildcard
  (identifier) @module)

(mod_item
  name: (identifier) @module)

((scoped_identifier
  path: (identifier) @module.builtin)
  (#match? @module.builtin "^(pkg|sup|rok)$"))

((scoped_type_identifier
  path: (identifier) @module.builtin)
  (#match? @module.builtin "^(pkg|sup|rok)$"))

; `Shape::Circle`, `Option::Some`, `foo::Baz::qux`: a capitalized
; segment is a type or variant.
((scoped_identifier
  name: (identifier) @type)
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))

((scoped_identifier
  path: (identifier) @type)
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))

((scoped_type_identifier
  path: (identifier) @type)
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))

((scoped_identifier
  path: (scoped_identifier
    name: (identifier) @type))
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))

((scoped_type_identifier
  path: (scoped_identifier
    name: (identifier) @type))
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))


(struct_expression
  name: (identifier) @type)

(struct_expression
  name: (scoped_identifier
    name: (identifier) @type))

(struct_pattern
  type: (identifier) @type)

(struct_pattern
  type: (scoped_identifier
    name: (identifier) @type))

(tuple_struct_pattern
  type: (identifier) @type)

(tuple_struct_pattern
  type: (scoped_identifier
    name: (identifier) @type))

; Fields and parameters

(field_identifier) @property

; `true` `false` `none` `self` `Self` stay keywords before `:`
; (docs/token-classes.md, rule 3).
((field_identifier) @boolean
  (#match? @boolean "^(true|false)$"))

((field_identifier) @constant.builtin
  (#eq? @constant.builtin "none"))

((field_identifier) @variable.builtin
  (#match? @variable.builtin "^(self|Self)$"))

(shorthand_field_initializer
  (identifier) @property)

(parameter
  pattern: (identifier) @variable.parameter)

(closure_parameter
  pattern: (identifier) @variable.parameter)

(named_argument
  name: (field_identifier) @variable.parameter)

; Functions

(function_item
  name: (identifier) @function)

(function_signature_item
  name: (identifier) @function)

(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (scoped_identifier
    name: (identifier) @function.call))

(call_expression
  function: (field_expression
    field: (field_identifier) @function.call))

(call_expression
  function: (generic_function
    function: (identifier) @function.call))

(call_expression
  function: (generic_function
    function: (scoped_identifier
      name: (identifier) @function.call)))

(call_expression
  function: (generic_function
    function: (field_expression
      field: (field_identifier) @function.call)))

(broadcast_call_expression
  function: (identifier) @function.call)

; `Some(x)`, `Shape::Circle(r)`: an uppercase callee builds a value.
((call_expression
  function: (identifier) @type)
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))

((call_expression
  function: (scoped_identifier
    name: (identifier) @type))
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))

; Attributes and meta

(attribute
  name: (identifier) @attribute)

(attribute
  name: (scoped_identifier
    name: (identifier) @attribute))

; The whole attribute, as TextMate's meta.attribute; its parts keep
; their own captures inside.
(attribute_item) @attribute

(inner_attribute_item) @attribute

(attribute_item
  [
    "#["
    "]"
  ] @attribute)

(inner_attribute_item
  [
    "#!["
    "]"
  ] @attribute)

(metavariable) @function.macro


(macro_invocation
  macro: (identifier) @function.macro
  "!" @function.macro)

(macro_invocation
  macro: (scoped_identifier
    name: (identifier) @function.macro)
  "!" @function.macro)

(use_macro
  path: (identifier) @function.macro
  "!" @function.macro)

(use_macro
  path: (scoped_identifier
    name: (identifier) @function.macro)
  "!" @function.macro)

; `name(` in a token tree is a call, as TextMate reads it.
(token_tree
  (identifier) @function.call
  .
  (token_tree
    "("))

; Comments

(shebang) @keyword.directive

(line_comment) @comment

(block_comment) @comment

((line_comment) @comment.documentation
  (#match? @comment.documentation "^//([/!]$|[/!][^/])"))

((block_comment) @comment.documentation
  (#match? @comment.documentation "^/(\\*\\*[^*/]|\\*!)"))
