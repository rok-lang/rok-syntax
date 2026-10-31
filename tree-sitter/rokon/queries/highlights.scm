; ROKON highlights. A later pattern wins over an earlier one.

(identifier) @variable

(struct
  name: (identifier) @type)

(call
  name: (identifier) @type)

(path
  path: (identifier) @module)

; A capitalized segment is a type: `Mode::Fast`.
((path
  path: (identifier) @type)
  (#match? @type "^[A-ZÀ-ÖØ-ÞΑ-ΩА-Я]"))

(path
  name: (identifier) @type)

(pair
  key: (identifier) @property)

(named_argument
  name: (field_identifier) @property)

(string) @string

(raw_string_literal) @string

(escape_sequence) @string.escape

(char) @character

(integer) @number

(float) @number.float

(integer
  "-" @operator)

(float
  "-" @operator)

(boolean) @boolean

(none) @constant.builtin

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  ":"
  "::"
] @punctuation.delimiter

(line_comment) @comment

(block_comment) @comment
