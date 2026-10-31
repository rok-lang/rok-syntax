/**
 * @file ROKON grammar for tree-sitter
 * @license MIT OR Apache-2.0
 *
 * ROKON (stdlib 3.9) is a subset of Rok's literal syntax: one value per
 * file, no operators but unary `-` before a number.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const IDENT = /(r#)?[\p{XID_Start}_][\p{XID_Continue}]*/u;

module.exports = grammar({
  name: 'rokon',

  extras: $ => [/\s/, $.line_comment, $.block_comment],

  externals: $ => [
    $.string_content,
    $.raw_string_literal,
    $.block_comment,
    $._error_sentinel,
  ],

  word: $ => $.identifier,

  supertypes: $ => [$._value],

  rules: {
    source_file: $ => optional($._value),

    _value: $ => choice(
      $.none,
      $.boolean,
      $.integer,
      $.float,
      $.char,
      $.string,
      $.raw_string_literal,
      $.list,
      $.dict,
      $.tuple,
      $.struct,
      $.call,
      $.path,
      $.identifier,
    ),

    list: $ => seq('[', commaSep($._value), ']'),

    // `{ "k": v }` (a dict) or `{ name: v }` (an unnamed struct, its keys
    // identifiers); `{}` is either. Bare identifiers are not values, but
    // the tree keeps them.
    dict: $ => seq('{', commaSep($.pair), '}'),

    pair: $ => seq(
      field('key', $._value),
      ':',
      field('value', $._value),
    ),

    // `(a, b)`, `(a,)`; `(x)` is grouping.
    tuple: $ => seq('(', commaSep($._value), ')'),

    struct: $ => seq(
      field('name', choice($.identifier, $.path)),
      field('body', $.dict),
    ),

    // `Pair(1, 2)`, `Shape::Circle(1.0, at: p)`
    call: $ => seq(
      field('name', choice($.identifier, $.path)),
      field('arguments', $.arguments),
    ),

    arguments: $ => seq('(', commaSep(choice($._value, $.named_argument)), ')'),

    named_argument: $ => seq(
      field('name', alias($.identifier, $.field_identifier)),
      ':',
      field('value', $._value),
    ),

    path: $ => seq(
      field('path', choice($.identifier, $.path)),
      '::',
      field('name', $.identifier),
    ),

    none: _ => 'none',

    boolean: _ => choice('true', 'false'),

    // The sign is its own token, so it highlights as an operator.
    integer: _ => seq(
      optional('-'),
      token(choice(
        /0[xX][0-9a-fA-F][0-9a-fA-F_]*/,
        /0[bB][01][01_]*/,
        /0[oO][0-7][0-7_]*/,
        /[0-9][0-9_]*/,
      )),
    ),

    float: _ => seq(
      optional('-'),
      token(prec(1, seq(
        /[0-9][0-9_]*/,
        choice(
          seq(/\.[0-9][0-9_]*/, optional(/[eE][+-]?[0-9][0-9_]*/)),
          /[eE][+-]?[0-9][0-9_]*/,
        ),
      ))),
    ),

    char: _ => token(seq(
      "'",
      choice(
        seq('\\', choice(/u\{[0-9a-fA-F_]*\}/, /x[0-9a-fA-F]{2}/, /[^xu]/)),
        /[^\\'\n\r]/,
      ),
      "'",
    )),

    string: $ => seq(
      '"',
      repeat(choice($.string_content, $.escape_sequence)),
      token.immediate('"'),
    ),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(/u\{[0-9a-fA-F_]*\}/, /x[0-9a-fA-F]{2}/, /\r?\n[ \t]*/, /[^xu\r\n]/),
    )),

    identifier: _ => IDENT,

    line_comment: _ => token(seq('//', /[^\n\r]*/)),
  },
});

/**
 * @param {RuleOrLiteral} rule
 */
function commaSep(rule) {
  return optional(seq(rule, repeat(seq(',', rule)), optional(',')));
}
