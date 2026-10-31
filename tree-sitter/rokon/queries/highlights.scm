; ROKON highlights. A later pattern wins over an earlier one.

(identifier) @variable

(struct
  name: (identifier) @type)

(call
  name: (identifier) @type)

(path
  path: (identifier) @module)

(path
  name: (identifier) @type)

(pair
  key: (identifier) @property)

(named_argument
  name: (field_identifier) @variable.parameter)

(string) @string

(raw_string_literal) @string

(escape_sequence) @string.escape

(char) @character

(integer) @number

(float) @number.float

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
