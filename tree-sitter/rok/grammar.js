/**
 * @file Rok grammar for tree-sitter
 * @license MIT OR Apache-2.0
 *
 * Follows the Rok language reference (refs-lang chapters 1 to 6) and the
 * rokc parser. The tree is for highlighting, folding, indents and locals:
 * desugarings the compiler does (let-else, using, if-let) stay as written.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Binding power, weakest first (spec 3.2.3, shifted to stay positive).
const PREC = {
  closure: -1,
  assign: 1,
  catch: 2,
  try: 3,
  range: 4,
  coalesce: 5,
  or: 6,
  and: 7,
  compare: 8,
  bitor: 9,
  bitand: 10,
  additive: 11,
  multiplicative: 12,
  compose: 13,
  shift: 14,
  cast: 15,
  unary: 16,
  postfix: 17,
  call: 18,
  field: 19,
};

const BINARY = [
  [PREC.coalesce, ['??'], 'right'],
  [PREC.or, ['||', '.||']],
  [PREC.and, ['&&', '.&&']],
  [PREC.compare, ['==', '!=', '<', '>', '<=', '>=', '≡', '≠', '≤', '≥', '∈', '∉', '⊂', '⊆',
    '.==', '.!=', '.<', '.>', '.<=', '.>=']],
  [PREC.bitor, ['|', '.|']],
  [PREC.bitand, ['&', '^', '.&', '.^']],
  [PREC.additive, ['+', '-', '∪', '.+', '.-']],
  [PREC.multiplicative, ['*', '/', '%', '%%', '×', '⋅', '÷', '∩', '.*', './', '.%', '.%%']],
  [PREC.compose, ['∘']],
  [PREC.shift, ['<<', '>>', '.<<', '.>>']],
];

const COMPOUND_ASSIGN = ['+=', '-=', '*=', '/=', '%=', '%%=', '&=', '|=', '^=', '<<=', '>>='];

// Identifier characters (spec 1.4.1): UAX #31 plus `_`, the math profile,
// primes and emoji.
const MATH = '\\u{2202}\\u{2207}\\u{221E}\\u{2211}\\u{220F}\\u{222B}' +
  '\\u{1D6C1}\\u{1D6DB}\\u{1D6FB}\\u{1D715}\\u{1D735}\\u{1D74F}\\u{1D76F}' +
  '\\u{1D789}\\u{1D7A9}\\u{1D7C3}';
const IDENT_START = `\\p{XID_Start}_${MATH}\\p{Extended_Pictographic}\\u{1F1E6}-\\u{1F1FF}`;
const IDENT_CONTINUE = `\\p{XID_Continue}${MATH}\\p{Extended_Pictographic}` +
  '\\u{2032}-\\u{2034}\\u{2057}\\u{00B2}\\u{00B3}\\u{00B9}\\u{2070}-\\u{207E}' +
  '\\u{2080}-\\u{208E}\\u{200D}\\u{FE0E}\\u{FE0F}\\u{1F3FB}-\\u{1F3FF}' +
  '\\u{1F1E6}-\\u{1F1FF}\\u{E0020}-\\u{E007F}';
const IDENT = `[${IDENT_START}][${IDENT_CONTINUE}]*`;

// Registered extension operators (spec 1.10.4): runs of math and arrow
// symbols that are not fixed tokens or identifier characters.
const EXT_OP = '[\\u{2190}-\\u{21FF}\\u{2200}\\u{2201}\\u{2203}-\\u{2206}' +
  '\\u{220A}-\\u{220E}\\u{2210}\\u{2212}-\\u{2217}\\u{2219}\\u{221B}-\\u{221D}' +
  '\\u{221F}-\\u{2228}\\u{222C}-\\u{225F}\\u{2262}\\u{2263}\\u{2266}-\\u{2281}' +
  '\\u{2283}\\u{2284}\\u{2285}\\u{2287}-\\u{22C4}\\u{22C6}-\\u{22FF}' +
  '\\u{2A00}-\\u{2AFF}\\u{27C0}-\\u{27EF}\\u{2980}-\\u{29FF}\\u{00B0}]+';

// Keywords, as written in token trees.
const KEYWORDS = [
  'let', 'fn', 'if', 'else', 'match', 'while', 'loop', 'for', 'return', 'break',
  'continue', 'try', 'throw', 'async', 'await', 'yield', 'unsafe', 'using',
  'struct', 'enum', 'trait', 'impl', 'pub', 'mod', 'use', 'as', 'is', 'ref',
];

const PUNCTUATION = [
  '+', '-', '*', '/', '%', '%%', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!',
  '&', '|', '^', '~', '<<', '>>', '=', '+=', '-=', '*=', '/=', '%=', '%%=', '&=',
  '|=', '^=', '<<=', '>>=', '..', '..=', ':', '::', '.', '?.', '??', '?', '->',
  '=>', ',', ';', '#', '$', '...', '×', '⋅', '÷', '∘', '√', '≡', '≠', '≤', '≥',
  '∈', '∉', '⊂', '⊆', '∪', '∩',
];

module.exports = grammar({
  name: 'rok',

  extras: $ => [/\s/, $.line_comment, $.block_comment],

  externals: $ => [
    $.string_content,
    $._fstring_content,
    $._fstring_triple_content,
    $._format_spec_text,
    $.raw_string_literal,
    $.block_comment,
    $._error_sentinel,
  ],

  word: $ => $.identifier,

  supertypes: $ => [
    $._expression,
    $._type,
    $._pattern,
    $._literal,
  ],

  inline: $ => [
    $._path,
    $._field_identifier,
    $._type_identifier,
    $._expression_ending_with_block,
  ],

  conflicts: $ => [
    [$.scoped_identifier, $.scoped_type_identifier],
    [$._pattern_atom, $.struct_pattern],
    [$._expression, $._trailing_call],
  ],

  rules: {
    source_file: $ => seq(
      optional($.shebang),
      repeat($._statement),
      optional($._tail),
    ),

    shebang: _ => token(prec(-1, /#!([^\[\n][^\n]*)?/)),

    // Statements

    _statement: $ => choice(
      $.expression_statement,
      $.let_declaration,
      $.empty_statement,
      $._item,
    ),

    _item: $ => choice(
      $.attribute_item,
      $.inner_attribute_item,
      $.function_item,
      $.function_signature_item,
      $.struct_item,
      $.union_item,
      $.enum_item,
      $.trait_item,
      $.impl_item,
      $.mod_item,
      $.use_declaration,
      $.const_item,
      $.static_item,
      $.type_item,
      $.extern_block,
      $.meta_block,
    ),

    empty_statement: _ => ';',

    expression_statement: $ => choice(
      seq($._expression, ';'),
      prec(1, $._expression_ending_with_block),
      prec(-1, alias($._trailing_call, $.call_expression)),
      prec(-1, $.macro_invocation),
    ),

    // The last statement before `}` may drop its `;` (spec 1.3.4).
    _tail: $ => choice(
      $._expression,
      alias($._let_tail, $.let_declaration),
    ),

    let_declaration: $ => seq($._let_body, ';'),

    _let_tail: $ => $._let_body,

    _let_body: $ => seq(
      'let',
      field('pattern', $._pattern),
      optional(seq(':', field('type', $._type))),
      optional(seq('=', field('value', $._expression))),
      optional(seq('else', field('alternative', $.block))),
    ),

    // Attributes (spec 6.1)

    attribute_item: $ => seq('#[', $.attribute, ']'),

    inner_attribute_item: $ => seq('#![', $.attribute, ']'),

    attribute: $ => prec.right(seq(
      field('name', $._path),
      optional(choice(
        seq('=', field('value', $._attr_value)),
        field('arguments', $.attribute_arguments),
      )),
    )),

    attribute_arguments: $ => seq('(', repeat($._attr_token), ')'),

    _attr_value: $ => choice($._literal, $.negative_literal),

    // Arguments are mostly nested attributes and literals; `#[literal(..)]`
    // patterns and ranges are token runs.
    _attr_token: $ => choice(
      $.attribute,
      $._literal,
      alias($._attr_group, $.token_tree),
      ',', '-', '..', '..=', '%', '*', '+', '?', '=', ':',
    ),

    _attr_group: $ => choice(
      seq('{', repeat($._attr_token), '}'),
      seq('[', repeat($._attr_token), ']'),
    ),

    // Items

    visibility_modifier: $ => prec.right(seq(
      'pub',
      optional(seq('(', choice('pkg', 'sub', $.identifier), ')')),
    )),

    function_item: $ => seq(
      $._function_head,
      field('body', $.block),
    ),

    function_signature_item: $ => seq($._function_head, ';'),

    _function_head: $ => seq(
      optional($.visibility_modifier),
      optional('const'),
      optional(seq('extern', field('abi', $.string_literal))),
      optional('unsafe'),
      optional('async'),
      optional('yield'),
      'fn',
      field('name', $.identifier),
      optional(field('type_parameters', $.type_parameters)),
      field('parameters', $.parameters),
      optional($.throws_clause),
      optional(seq('->', field('return_type', $._type))),
      optional($.throws_clause),
      optional($.where_clause),
    ),

    parameters: $ => seq(
      '(',
      sepBy(',', seq(
        repeat($.attribute_item),
        choice($.self_parameter, $.parameter, $.variadic_parameter),
      )),
      optional(','),
      ')',
    ),

    self_parameter: $ => seq(
      optional('ref'),
      $.self,
      optional(seq(':', field('type', $._type))),
    ),

    parameter: $ => seq(
      optional('ref'),
      field('pattern', $.identifier),
      optional(seq(':', optional('...'), field('type', $._type))),
      optional(seq('=', field('default', $._expression))),
    ),

    variadic_parameter: _ => '...',

    throws_clause: $ => choice(
      prec.right(seq('throws', optional(seq('(', field('type', $._type), ')')))),
      'rethrows',
    ),

    where_clause: $ => prec.right(seq(
      'where',
      sepBy1(',', $.where_predicate),
      optional(','),
    )),

    where_predicate: $ => seq(
      field('left', $._type),
      ':',
      field('bounds', $.trait_bounds),
    ),

    trait_bounds: $ => prec.right(sepBy1('+', $._type)),

    type_parameters: $ => seq(
      '<',
      sepBy1(',', seq(
        repeat($.attribute_item),
        choice($.type_parameter, $.const_parameter),
      )),
      optional(','),
      '>',
    ),

    type_parameter: $ => seq(
      field('name', $._type_identifier),
      optional(seq(':', field('bounds', $.trait_bounds))),
      optional(seq('=', field('default_type', $._type))),
    ),

    const_parameter: $ => seq(
      'const',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(seq('=', field('value', $._const_value))),
    ),

    struct_item: $ => seq(
      optional($.visibility_modifier),
      'struct',
      field('name', $._type_identifier),
      optional(field('type_parameters', $.type_parameters)),
      choice(
        seq(optional($.where_clause), field('body', $.field_declaration_list)),
        seq(field('body', $.ordered_field_declaration_list), optional($.where_clause), ';'),
        seq(optional($.where_clause), ';'),
      ),
    ),

    union_item: $ => seq(
      optional($.visibility_modifier),
      'union',
      field('name', $._type_identifier),
      optional(field('type_parameters', $.type_parameters)),
      optional($.where_clause),
      field('body', $.field_declaration_list),
    ),

    // The last field may drop its `;`.
    field_declaration_list: $ => seq(
      '{',
      repeat(choice($.attribute_item, seq($.field_declaration, choice(';', ',')))),
      optional($.field_declaration),
      '}',
    ),

    field_declaration: $ => seq(
      optional($.visibility_modifier),
      field('name', $._field_identifier),
      ':',
      field('type', $._type),
      optional(seq('=', field('default', $._expression))),
    ),

    ordered_field_declaration_list: $ => seq(
      '(',
      sepBy(',', seq(
        repeat($.attribute_item),
        optional($.visibility_modifier),
        field('type', $._type),
      )),
      optional(','),
      ')',
    ),

    enum_item: $ => seq(
      optional($.visibility_modifier),
      'enum',
      field('name', $._type_identifier),
      optional(field('type_parameters', $.type_parameters)),
      optional($.where_clause),
      field('body', $.enum_variant_list),
    ),

    enum_variant_list: $ => seq(
      '{',
      sepBy(',', seq(repeat($.attribute_item), $.enum_variant)),
      optional(','),
      '}',
    ),

    enum_variant: $ => seq(
      optional($.visibility_modifier),
      field('name', $.identifier),
      optional(choice(
        field('body', choice($.field_declaration_list, $.ordered_field_declaration_list)),
        seq('=', field('value', $._expression)),
      )),
    ),

    trait_item: $ => seq(
      optional($.visibility_modifier),
      optional('unsafe'),
      'trait',
      field('name', $._type_identifier),
      optional(field('type_parameters', $.type_parameters)),
      optional(seq(':', field('bounds', $.trait_bounds))),
      optional($.where_clause),
      field('body', $.declaration_list),
    ),

    impl_item: $ => seq(
      optional($.visibility_modifier),
      optional('unsafe'),
      'impl',
      optional(field('type_parameters', $.type_parameters)),
      optional(seq(
        optional('!'),
        field('trait', $._type),
        'for',
      )),
      field('type', $._type),
      optional($.where_clause),
      field('body', $.declaration_list),
    ),

    declaration_list: $ => seq(
      '{',
      repeat($._statement),
      optional($._tail),
      '}',
    ),

    mod_item: $ => seq(
      optional($.visibility_modifier),
      'mod',
      field('name', $.identifier),
      choice(';', field('body', $.declaration_list)),
    ),

    const_item: $ => seq(
      optional($.visibility_modifier),
      'const',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(seq('=', field('value', $._expression))),
      ';',
    ),

    static_item: $ => seq(
      optional($.visibility_modifier),
      'static',
      optional($.mutable_specifier),
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(seq('=', field('value', $._expression))),
      ';',
    ),

    mutable_specifier: _ => 'mut',

    // `type Name<G> = T;`, and an associated type in a trait.
    type_item: $ => seq(
      optional($.visibility_modifier),
      'type',
      field('name', $._type_identifier),
      optional(field('type_parameters', $.type_parameters)),
      optional(seq(':', field('bounds', $.trait_bounds))),
      optional($.where_clause),
      optional(seq('=', field('type', $._type))),
      optional($.where_clause),
      ';',
    ),

    extern_block: $ => seq(
      'extern',
      optional(field('abi', $.string_literal)),
      field('body', $.declaration_list),
    ),

    use_declaration: $ => seq(
      optional($.visibility_modifier),
      'use',
      field('argument', $._use_clause),
      ';',
    ),

    _use_clause: $ => choice(
      $._path,
      $.use_as_clause,
      $.use_list,
      $.scoped_use_list,
      $.use_wildcard,
      $.use_macro,
    ),

    use_as_clause: $ => seq(field('path', $._path), 'as', field('alias', $.identifier)),

    use_list: $ => seq('{', sepBy(',', $._use_clause), optional(','), '}'),

    scoped_use_list: $ => seq(
      optional(field('path', $._path)),
      '::',
      field('list', $.use_list),
    ),

    use_wildcard: $ => seq(
      optional(seq($._path, '::')),
      choice('*', '**'),
    ),

    // `use dep::name!;` (spec 6.8.11)
    use_macro: $ => seq(field('path', $._path), token.immediate('!')),

    // Meta blocks (spec 6.8): `@derive { .. }`, `@attribute { .. }`,
    // `@macro { (matcher) => { template } .. }`.
    meta_block: $ => seq(
      optional($.visibility_modifier),
      '@',
      choice(
        seq(field('kind', alias('macro', $.identifier)), field('body', $.macro_rules)),
        seq(field('kind', $.identifier), field('body', alias($._brace_tree, $.token_tree))),
      ),
    ),

    macro_rules: $ => seq('{', repeat($.macro_rule), '}'),

    macro_rule: $ => seq(
      field('left', alias($._paren_tree, $.token_tree)),
      '=>',
      field('right', alias($._brace_tree, $.token_tree)),
      optional(choice(';', ',')),
    ),

    macro_invocation: $ => seq(
      field('macro', choice($.identifier, $.scoped_identifier)),
      token.immediate('!'),
      field('arguments', $.token_tree),
    ),

    token_tree: $ => choice($._paren_tree, $._bracket_tree, $._brace_tree),
    _paren_tree: $ => seq('(', repeat($._tt), ')'),
    _bracket_tree: $ => seq('[', repeat($._tt), ']'),
    _brace_tree: $ => seq('{', repeat($._tt), '}'),

    _tt: $ => choice(
      $.token_tree,
      $.metavariable,
      $.identifier,
      $.label,
      $._literal,
      $.self,
      $.self_type,
      ...KEYWORDS,
      ...PUNCTUATION,
      '@',
    ),

    // Template tokens: `@x`, `@Self`, `@for_fields` (spec 6.9).
    metavariable: _ => token(seq('@', new RegExp(IDENT, 'u'))),

    // Types (spec 2.1)

    _type: $ => choice($._type_atom, $.sum_type),

    sum_type: $ => prec.right(1, seq($._type_atom, repeat1(seq('|', $._type_atom)))),

    _type_atom: $ => choice($.optional_type, $._base_type),

    optional_type: $ => prec(1, seq(field('type', $._type_atom), choice('?', '??'))),

    _base_type: $ => choice(
      $._type_identifier,
      $.scoped_type_identifier,
      $.generic_type,
      $.self_type,
      alias('none', $.none_type),
      $.never_type,
      $.function_type,
      $.unit_type,
      $.tuple_type,
      $.parenthesized_type,
      $.array_type,
      $.any_type,
      $.macro_invocation,
    ),

    _type_identifier: $ => alias($.identifier, $.type_identifier),

    never_type: _ => '!',

    scoped_type_identifier: $ => prec(1, seq(
      field('path', choice($._path, $.generic_type, $.bracketed_type)),
      '::',
      field('name', $._type_identifier),
    )),

    generic_type: $ => prec(1, seq(
      field('type', choice($._type_identifier, $.scoped_type_identifier, $.self_type)),
      field('type_arguments', $.type_arguments),
    )),

    type_arguments: $ => seq(
      token(prec(1, '<')),
      sepBy1(',', choice($._type, $.type_binding, $._const_value)),
      optional(','),
      '>',
    ),

    type_binding: $ => seq(field('name', $._type_identifier), '=', field('type', $._type)),

    _const_value: $ => choice(
      $.integer_literal,
      $.float_literal,
      $.char_literal,
      $.string_literal,
      $.boolean_literal,
      $.negative_literal,
      $.block,
    ),

    negative_literal: $ => seq('-', choice($.integer_literal, $.float_literal)),

    function_type: $ => prec.right(seq(
      optional('unsafe'),
      optional(seq('extern', field('abi', $.string_literal))),
      'fn',
      field('parameters', alias($._type_list, $.parameters)),
      optional($.throws_clause),
      optional(seq('->', field('return_type', $._type_atom))),
      repeat(seq('+', field('bound', choice($._type_identifier, $.scoped_type_identifier)))),
    )),

    _type_list: $ => seq('(', sepBy(',', $._type), optional(','), ')'),

    unit_type: _ => seq('(', ')'),

    tuple_type: $ => seq('(', $._type, ',', sepBy(',', $._type), optional(','), ')'),

    parenthesized_type: $ => seq('(', $._type, ')'),

    array_type: $ => seq(
      '[',
      field('element', $._type),
      ';',
      field('length', $._expression),
      ']',
    ),

    any_type: $ => prec.right(seq(
      'any',
      optional(choice(
        field('trait', choice($._type_identifier, $.scoped_type_identifier, $.generic_type)),
        seq('(', sepBy1('+', field('trait', choice(
          $._type_identifier, $.scoped_type_identifier, $.generic_type,
        ))), ')'),
      )),
    )),

    bracketed_type: $ => seq('<', field('type', $._type), 'as', field('trait', $._type), '>'),

    self_type: _ => 'Self',

    // Expressions (spec 3)

    _expression: $ => choice(
      $.assignment_expression,
      $.compound_assignment_expr,
      $.binary_expression,
      $.unary_expression,
      $.await_expression,
      $.cast_expression,
      $.type_test_expression,
      $.range_expression,
      $.try_expression,
      $.catch_expression,
      $.propagate_expression,
      $.return_expression,
      $.break_expression,
      $.continue_expression,
      $.throw_expression,
      $.yield_expression,
      $.closure_expression,
      $.call_expression,
      alias($._trailing_call, $.call_expression),
      $.broadcast_call_expression,
      $.field_expression,
      $.index_expression,
      $.struct_expression,
      $.macro_invocation,
      $.generic_function,
      alias($._generic_method, $.generic_function),
      $.tuple_expression,
      $.unit_expression,
      $.parenthesized_expression,
      $.array_expression,
      $.set_expression,
      $.dict_expression,
      $.identifier,
      $.scoped_identifier,
      $.self,
      $.self_type,
      $._literal,
      $._expression_ending_with_block,
    ),

    _expression_ending_with_block: $ => choice(
      $.block,
      $.unsafe_block,
      $.async_block,
      $.yield_block,
      $.if_expression,
      $.match_expression,
      $.loop_expression,
      $.while_expression,
      $.for_expression,
      $.using_expression,
    ),

    _literal: $ => choice(
      $.string_literal,
      $.raw_string_literal,
      $.byte_string_literal,
      $.format_string,
      $.char_literal,
      $.integer_literal,
      $.float_literal,
      $.boolean_literal,
      $.none,
    ),

    assignment_expression: $ => prec.right(PREC.assign, seq(
      field('left', $._expression),
      '=',
      field('right', $._expression),
    )),

    compound_assignment_expr: $ => prec.right(PREC.assign, seq(
      field('left', $._expression),
      field('operator', choice(...COMPOUND_ASSIGN)),
      field('right', $._expression),
    )),

    binary_expression: $ => choice(
      ...BINARY.map(([precedence, operators, assoc]) => {
        const p = assoc === 'right' ? prec.right : prec.left;
        const op = operators.length === 1 ? operators[0] : choice(...operators);
        return p(precedence, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression),
        ));
      }),
      prec.left(PREC.additive, seq(
        field('left', $._expression),
        field('operator', alias($._ext_operator, $.operator)),
        field('right', $._expression),
      )),
    ),

    _ext_operator: _ => token(new RegExp(EXT_OP, 'u')),

    unary_expression: $ => prec(PREC.unary, seq(
      field('operator', choice('-', '!', '~', '√', alias($._ext_operator, $.operator))),
      field('argument', $._expression),
    )),

    await_expression: $ => prec(PREC.unary, seq('await', field('argument', $._expression))),

    cast_expression: $ => prec.left(PREC.cast, seq(
      field('value', $._expression),
      'as',
      field('type', $._cast_type),
    )),

    // `x is T` (spec 2.2.5)
    type_test_expression: $ => prec.left(PREC.cast, seq(
      field('value', $._expression),
      'is',
      field('type', $._cast_type),
    )),

    // A cast type takes no sum and no `??` (that is coalescing).
    _cast_type: $ => choice(
      $._base_type,
      alias($._cast_optional, $.optional_type),
    ),

    _cast_optional: $ => seq(field('type', $._cast_type), '?'),

    range_expression: $ => prec.left(PREC.range, choice(
      seq(field('start', $._expression), choice('..', '..='), field('end', $._expression)),
      seq(field('start', $._expression), '..'),
      seq(choice('..', '..='), field('end', $._expression)),
      '..',
    )),

    // `try e`, `try? e`, `try! e` (spec 3.14.3): the operand runs to a
    // `catch` / `finally`, `;`, a closing bracket or a comma.
    try_expression: $ => prec.right(PREC.try, seq(
      'try',
      optional(field('operator', choice(token.immediate('?'), token.immediate('!')))),
      field('argument', $._expression),
    )),

    catch_expression: $ => prec.left(PREC.catch, choice(
      seq(field('value', $._expression), repeat1($.catch_clause), optional($.finally_clause)),
      seq(field('value', $._expression), $.finally_clause),
    )),

    catch_clause: $ => seq(
      'catch',
      optional(field('pattern', $._pattern)),
      field('body', $.block),
    ),

    finally_clause: $ => seq('finally', field('body', $.block)),

    // Postfix `?`: early return of `none` (spec 3.14.10).
    propagate_expression: $ => prec(PREC.postfix, seq(field('argument', $._expression), '?')),

    return_expression: $ => choice(
      prec.left(seq('return', field('value', $._expression))),
      prec(-1, 'return'),
    ),

    break_expression: $ => prec.left(seq(
      'break',
      optional($.label),
      optional(field('value', $._expression)),
    )),

    continue_expression: $ => prec.left(seq('continue', optional($.label))),

    throw_expression: $ => prec.left(seq('throw', field('value', $._expression))),

    yield_expression: $ => choice(
      prec.left(seq('yield', field('value', $._expression))),
      prec(-1, 'yield'),
    ),

    closure_expression: $ => prec(PREC.closure, seq(
      optional($.closure_modifiers),
      optional(field('captures', $.capture_list)),
      field('parameters', $.closure_parameters),
      optional(seq('->', field('return_type', $._type))),
      field('body', $._expression),
    )),

    closure_modifiers: _ => prec(1, choice('async', seq('async', 'yield'), 'yield')),

    // `[ref total, n]`: the compiler reads `[` as a capture list only when
    // `ref` comes first.
    capture_list: $ => seq(
      '[',
      'ref',
      $._capture_name,
      repeat(seq(',', optional('ref'), $._capture_name)),
      optional(','),
      ']',
    ),

    _capture_name: $ => choice($.identifier, $.self),

    closure_parameters: $ => choice(
      '||',
      seq('|', sepBy(',', $.closure_parameter), optional(','), '|'),
    ),

    closure_parameter: $ => seq(
      optional('ref'),
      field('pattern', choice($.identifier, $.self)),
      optional(seq(':', field('type', $._type_atom))),
    ),

    call_expression: $ => prec(PREC.call, seq(
      field('function', $._expression),
      field('arguments', $.arguments),
    )),

    // Trailing closures (spec 4.8): `f(a) { .. }`, `f(a) |x| ..`,
    // `retry { .. }`, `xs.map |x| { .. }`. In the head of `if` / `while` /
    // `match` / `for` / `using` the block is the body instead.
    _trailing_call: $ => choice(
      prec.dynamic(1, prec(PREC.call - 1, seq(
        field('function', $._expression),
        field('arguments', $.arguments),
        field('closure', choice($.block, $.closure_expression)),
      ))),
      prec.dynamic(1, prec(-1, seq(
        field('function', choice($.identifier, $.scoped_identifier, $.generic_function)),
        field('closure', $.block),
      ))),
      prec.dynamic(1, prec(0, seq(
        field('function', choice(
          $.identifier, $.scoped_identifier, $.generic_function, $.field_expression,
          alias($._generic_method, $.generic_function),
        )),
        field('closure', alias($._block_closure, $.closure_expression)),
      ))),
    ),

    _block_closure: $ => seq(
      field('parameters', $.closure_parameters),
      optional(seq('->', field('return_type', $._type))),
      field('body', $.block),
    ),

    arguments: $ => seq(
      '(',
      sepBy(',', choice(
        $._expression,
        $.named_argument,
        $.ref_argument,
        $.spread_argument,
      )),
      optional(','),
      ')',
    ),

    named_argument: $ => seq(field('name', $._field_identifier), ':', field('value', $._expression)),

    ref_argument: $ => seq('ref', field('value', $._expression)),

    spread_argument: $ => prec(1, seq('..', field('value', $._expression))),

    // `f.(xs)` (spec 3.3)
    broadcast_call_expression: $ => prec(PREC.call, seq(
      field('function', $._expression),
      '.',
      field('arguments', $.arguments),
    )),

    field_expression: $ => prec(PREC.field, seq(
      field('value', $._expression),
      choice('.', '?.'),
      field('field', choice($._field_identifier, $.integer_literal)),
    )),

    index_expression: $ => prec(PREC.postfix, seq(
      field('value', $._expression),
      '[',
      choice(sepBy1(',', field('index', $._expression)), field('index', $.slice)),
      optional(','),
      ']',
    )),

    // `a[lo:hi:step]`, `a[::2]` (spec 3.6.3)
    slice: $ => choice(
      seq(
        optional(field('start', $._expression)),
        ':',
        optional(field('end', $._expression)),
        optional(seq(':', optional(field('step', $._expression)))),
      ),
      seq(optional(field('start', $._expression)), '::', optional(field('step', $._expression))),
    ),

    generic_function: $ => prec(1, seq(
      field('function', choice($.identifier, $.scoped_identifier)),
      '::',
      field('type_arguments', $.type_arguments),
    )),

    // `x.parse::<i32>()`
    _generic_method: $ => prec(PREC.field, seq(
      field('function', $.field_expression),
      '::',
      field('type_arguments', $.type_arguments),
    )),

    struct_expression: $ => prec(-1, seq(
      field('name', choice($.identifier, $.scoped_identifier, $.self_type, $.generic_function)),
      field('body', $.field_initializer_list),
    )),

    field_initializer_list: $ => prec(1, seq(
      '{',
      sepBy(',', choice(
        $.shorthand_field_initializer,
        $.field_initializer,
        $.base_field_initializer,
      )),
      optional(','),
      '}',
    )),

    shorthand_field_initializer: $ => prec(1, $.identifier),

    field_initializer: $ => seq(
      field('field', $._field_identifier),
      ':',
      field('value', $._expression),
    ),

    base_field_initializer: $ => seq('..', $._expression),

    unit_expression: _ => seq('(', ')'),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_expression: $ => seq(
      '(',
      $._expression,
      ',',
      sepBy(',', $._expression),
      optional(','),
      ')',
    ),

    array_expression: $ => seq(
      '[',
      choice(
        seq(sepBy(',', $._expression), optional(',')),
        seq(field('value', $._expression), ';', field('length', $._expression)),
      ),
      ']',
    ),

    // `{a, b}` (a comma after the first element) and `{k: v}` (spec 2.x
    // collection literals); `{}` is a block.
    set_expression: $ => seq(
      '{',
      $._expression,
      ',',
      sepBy(',', $._expression),
      optional(','),
      '}',
    ),

    dict_expression: $ => seq(
      '{',
      sepBy1(',', $.dict_entry),
      optional(','),
      '}',
    ),

    dict_entry: $ => seq(field('key', $._expression), ':', field('value', $._expression)),

    scoped_identifier: $ => prec(1, seq(
      field('path', choice(
        $._path,
        $.generic_function,
        $.bracketed_type,
        $.generic_type,
      )),
      '::',
      field('name', $.identifier),
    )),

    _path: $ => choice($.identifier, $.scoped_identifier, $.self_type),

    // Block-like expressions

    label: _ => token(seq("'", new RegExp(IDENT, 'u'))),

    _label_prefix: $ => seq($.label, ':'),

    block: $ => seq(
      optional($._label_prefix),
      '{',
      repeat($._statement),
      optional($._tail),
      '}',
    ),

    unsafe_block: $ => seq('unsafe', $.block),

    async_block: $ => seq('async', optional('yield'), $.block),

    yield_block: $ => prec(1, seq('yield', $.block)),

    if_expression: $ => prec.right(seq(
      'if',
      field('condition', choice($._expression, $.let_condition)),
      field('consequence', $.block),
      optional(field('alternative', $.else_clause)),
    )),

    let_condition: $ => seq(
      'let',
      field('pattern', $._pattern),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
    ),

    else_clause: $ => seq('else', choice($.block, $.if_expression)),

    match_expression: $ => seq(
      'match',
      field('value', $._expression),
      field('body', $.match_block),
    ),

    match_block: $ => seq('{', repeat(choice($.attribute_item, $.match_arm)), '}'),

    match_arm: $ => prec.right(seq(
      field('pattern', $.match_pattern),
      '=>',
      field('value', $._expression),
      optional(','),
    )),

    match_pattern: $ => seq(
      $._pattern,
      optional(seq('if', field('condition', $._expression))),
    ),

    loop_expression: $ => seq(optional($._label_prefix), 'loop', field('body', $.block)),

    while_expression: $ => seq(
      optional($._label_prefix),
      'while',
      field('condition', choice($._expression, $.let_condition)),
      field('body', $.block),
    ),

    for_expression: $ => seq(
      optional($._label_prefix),
      'for',
      optional('await'),
      field('pattern', $._pattern),
      'in',
      field('value', $._expression),
      field('body', $.block),
    ),

    using_expression: $ => seq(
      'using',
      sepBy1(',', $.using_binding),
      field('body', $.block),
    ),

    using_binding: $ => seq(field('pattern', $._pattern), '=', field('value', $._expression)),

    // Patterns (spec 3.11)

    _pattern: $ => choice($._pattern_atom, $.or_pattern),

    or_pattern: $ => prec.left(-1, seq($._pattern, '|', $._pattern)),

    _pattern_atom: $ => choice(
      $._literal_pattern,
      $.identifier,
      $.scoped_identifier,
      $.self_type,
      $.wildcard_pattern,
      $.captured_pattern,
      $.type_check_pattern,
      $.tuple_pattern,
      $.struct_pattern,
      $.tuple_struct_pattern,
      $.range_pattern,
      $.macro_invocation,
    ),

    wildcard_pattern: _ => '_',

    _literal_pattern: $ => choice(
      $.string_literal,
      $.raw_string_literal,
      $.char_literal,
      $.integer_literal,
      $.float_literal,
      $.boolean_literal,
      $.none,
      $.negative_literal,
    ),

    captured_pattern: $ => seq($.identifier, '@', $._pattern_atom),

    // `x: T` / `_: T`: matches when the value is a `T` (spec 3.11).
    type_check_pattern: $ => prec(-1, seq(
      field('name', choice($.identifier, $.wildcard_pattern)),
      ':',
      field('type', $._type),
    )),

    tuple_pattern: $ => seq(
      '(',
      sepBy(',', choice($._pattern, $.remaining_field_pattern)),
      optional(','),
      ')',
    ),

    struct_pattern: $ => seq(
      field('type', choice($.identifier, $.scoped_identifier, $.self_type)),
      '{',
      sepBy(',', choice($.field_pattern, $.remaining_field_pattern)),
      optional(','),
      '}',
    ),

    field_pattern: $ => seq(
      field('name', $._field_identifier),
      optional(seq(':', field('pattern', $._pattern))),
    ),

    remaining_field_pattern: _ => '..',

    tuple_struct_pattern: $ => seq(
      field('type', choice($.identifier, $.scoped_identifier)),
      '(',
      sepBy(',', choice($._pattern, $.remaining_field_pattern)),
      optional(','),
      ')',
    ),

    range_pattern: $ => prec.right(seq(
      field('start', $._range_bound),
      choice('..', '..='),
      optional(field('end', $._range_bound)),
    )),

    _range_bound: $ => choice(
      $.integer_literal,
      $.float_literal,
      $.char_literal,
      $.negative_literal,
    ),

    // Literals (spec 1.6 to 1.9)

    string_literal: $ => seq(
      '"',
      repeat(choice($.string_content, $.escape_sequence)),
      token.immediate('"'),
    ),

    byte_string_literal: $ => seq(
      'b"',
      repeat(choice($.string_content, $.escape_sequence)),
      token.immediate('"'),
    ),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /u\{[0-9a-fA-F_]*\}/,
        /x[0-9a-fA-F]{2}/,
        /\r?\n[ \t]*/,
        /[^xu\r\n]/,
      ),
    )),

    // `f"x = {x:>{w}}"` (spec 1.7.3)
    format_string: $ => choice(
      seq(
        'f"',
        repeat(choice(alias($._fstring_content, $.string_content), $.escape_sequence, $.interpolation)),
        '"',
      ),
      seq(
        'f"""',
        repeat(choice(
          alias($._fstring_triple_content, $.string_content),
          $.escape_sequence,
          $.interpolation,
        )),
        '"""',
      ),
    ),

    interpolation: $ => seq(
      '{',
      field('value', $._expression),
      optional(seq(':', optional(field('format', $.format_specifier)))),
      '}',
    ),

    format_specifier: $ => repeat1(choice(
      alias($._format_spec_text, $.format_text),
      alias($._spec_interpolation, $.interpolation),
    )),

    _spec_interpolation: $ => seq(choice('{', '${'), field('value', $._expression), '}'),

    char_literal: _ => token(seq(
      optional('c'),
      "'",
      choice(
        seq('\\', choice(
          /u\{[0-9a-fA-F_]*\}/,
          /x[0-9a-fA-F]{2}/,
          /[^xu]/,
        )),
        /[^\\'\n\r]/,
      ),
      "'",
    )),

    integer_literal: _ => token(seq(
      choice(
        /0[xX][0-9a-fA-F][0-9a-fA-F_]*/,
        /0[bB][01][01_]*/,
        /0[oO][0-7][0-7_]*/,
        /[0-9][0-9_]*/,
      ),
      optional(/[a-zA-Z_][a-zA-Z0-9_]*/),
    )),

    float_literal: _ => token(prec(1, seq(
      /[0-9][0-9_]*/,
      choice(
        seq(/\.[0-9][0-9_]*/, optional(/[eE][+-]?[0-9][0-9_]*/)),
        /[eE][+-]?[0-9][0-9_]*/,
      ),
      optional(/[a-zA-Z_][a-zA-Z0-9_]*/),
    ))),

    boolean_literal: _ => choice('true', 'false'),

    none: _ => 'none',

    self: _ => 'self',

    identifier: _ => new RegExp(`(r#)?${IDENT}`, 'u'),

    _field_identifier: $ => alias($.identifier, $.field_identifier),

    line_comment: _ => token(seq('//', /[^\n\r]*/)),
  },
});

/**
 * @param {RuleOrLiteral} sep
 * @param {RuleOrLiteral} rule
 */
function sepBy1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)));
}

/**
 * @param {RuleOrLiteral} sep
 * @param {RuleOrLiteral} rule
 */
function sepBy(sep, rule) {
  return optional(sepBy1(sep, rule));
}
