; Scopes

[
  (source_file)
  (block)
  (declaration_list)
  (function_item)
  (closure_expression)
  (match_arm)
  (for_expression)
  (while_expression)
  (if_expression)
  (using_expression)
  (catch_clause)
] @local.scope

; Definitions

(function_item
  name: (identifier) @local.definition.function)

(parameter
  pattern: (identifier) @local.definition.parameter)

(closure_parameter
  pattern: (identifier) @local.definition.parameter)

(let_declaration
  pattern: (identifier) @local.definition.var)

(let_condition
  pattern: (identifier) @local.definition.var)

(using_binding
  pattern: (identifier) @local.definition.var)

(for_expression
  pattern: (identifier) @local.definition.var)

(tuple_pattern
  (identifier) @local.definition.var)

(rest_pattern
  (identifier) @local.definition.var)

(tuple_struct_pattern
  (identifier) @local.definition.var)

(field_pattern
  name: (field_identifier) @local.definition.var
  !pattern)

(field_pattern
  pattern: (identifier) @local.definition.var)

(captured_pattern
  (identifier) @local.definition.var)

(type_check_pattern
  name: (identifier) @local.definition.var)

(match_pattern
  (identifier) @local.definition.var)

(or_pattern
  (identifier) @local.definition.var)

(catch_clause
  pattern: (identifier) @local.definition.var)

(const_item
  name: (identifier) @local.definition.constant)

(static_item
  name: (identifier) @local.definition.constant)

(type_parameter
  name: (type_identifier) @local.definition.type)

(struct_item
  name: (type_identifier) @local.definition.type)

(enum_item
  name: (type_identifier) @local.definition.type)

(union_item
  name: (type_identifier) @local.definition.type)

(trait_item
  name: (type_identifier) @local.definition.type)

(type_item
  name: (type_identifier) @local.definition.type)

(mod_item
  name: (identifier) @local.definition.namespace)

; References

(identifier) @local.reference

(type_identifier) @local.reference
