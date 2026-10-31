; Rok highlights. A later pattern wins over an earlier one for the same
; node (tree-sitter-highlight 0.25, Neovim, Helix): general patterns come
; first, specific ones last.

(identifier) @variable

; Path roots `pkg::`, `sup::`, `rok::` (spec 5.7)
((identifier) @module.builtin
  (#match? @module.builtin "^(pkg|sup|rok)$"))

((identifier) @constant
  (#match? @constant "^[A-Z][A-Z0-9_]+$"))

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
  "ref"
  "pkg"
  "sub"
  (mutable_specifier)
] @keyword.modifier

[
  "async"
  "await"
] @keyword.coroutine

(closure_modifiers) @keyword.coroutine

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

(try_expression
  operator: _ @keyword.exception)

; Literals

(string_literal) @string

(byte_string_literal) @string

(raw_string_literal) @string

(format_string) @string.special

(format_string
  (string_content) @string)

(format_specifier) @string.special

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
    "^(i8|i16|i32|i64|isize|u8|u16|u32|u64|usize|f32|f64|bool|char|str|int|float|c_char|c_int|c_uint|c_long|c_ulong|c_void)$"))

(self_type) @type.builtin

(none_type) @type.builtin

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

; `Shape::Circle`, `Ordering::Less`: an uppercase last segment is a type
; or variant.
((scoped_identifier
  name: (identifier) @type)
  (#match? @type "^[A-Z]"))

((scoped_identifier
  name: (identifier) @constant)
  (#match? @constant "^[A-Z][A-Z0-9_]+$"))

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

; Constants

(const_item
  name: (identifier) @constant)

(static_item
  name: (identifier) @constant)

(enum_variant
  name: (identifier) @constant)

(const_parameter
  name: (identifier) @constant)

; Fields and parameters

(field_identifier) @property

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
    field: (field_identifier) @function.method.call))

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
      field: (field_identifier) @function.method.call)))

(broadcast_call_expression
  function: (identifier) @function.call)

; `Some(x)`, `Shape::Circle(r)`: an uppercase callee builds a value.
((call_expression
  function: (identifier) @type)
  (#match? @type "^[A-Z]"))

((call_expression
  function: (scoped_identifier
    name: (identifier) @type))
  (#match? @type "^[A-Z]"))

; Attributes and meta

(attribute
  name: (identifier) @attribute)

(attribute
  name: (scoped_identifier
    name: (identifier) @attribute))

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

(meta_block
  kind: (metavariable) @keyword.directive)

(macro_invocation
  macro: (identifier) @function.macro
  "!" @function.macro)

(macro_invocation
  macro: (scoped_identifier
    name: (identifier) @function.macro)
  "!" @function.macro)

(use_macro
  path: (identifier) @function.macro)

(use_macro
  path: (scoped_identifier
    name: (identifier) @function.macro))

; Comments

(shebang) @keyword.directive

(line_comment) @comment

(block_comment) @comment

((line_comment) @comment.documentation
  (#match? @comment.documentation "^//([/!]$|[/!][^/])"))

((block_comment) @comment.documentation
  (#match? @comment.documentation "^/(\\*\\*[^*/]|\\*!)"))
