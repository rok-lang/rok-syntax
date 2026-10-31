[
  (block)
  (declaration_list)
  (field_declaration_list)
  (ordered_field_declaration_list)
  (enum_variant_list)
  (field_initializer_list)
  (match_block)
  (use_list)
  (arguments)
  (parameters)
  (type_parameters)
  (type_arguments)
  (array_expression)
  (set_expression)
  (dict_expression)
  (tuple_expression)
  (tuple_pattern)
  (struct_pattern)
  (token_tree)
  (where_clause)
] @indent.begin

(match_arm
  value: (_) @indent.begin)

(binary_expression) @indent.begin

(field_expression) @indent.begin

[
  "}"
  ")"
  "]"
] @indent.end @indent.branch

(else_clause
  "else" @indent.branch)

[
  (line_comment)
  (string_literal)
  (raw_string_literal)
  (format_string)
] @indent.auto

(block_comment) @indent.auto
