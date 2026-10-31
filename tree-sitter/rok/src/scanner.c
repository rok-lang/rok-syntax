// External scanner for Rok: string and f-string text, format specs,
// raw strings with matching `#` counts and nested block comments.

#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>

enum TokenType {
    STRING_CONTENT,
    FSTRING_CONTENT,
    FSTRING_TRIPLE_CONTENT,
    FORMAT_SPEC_TEXT,
    RAW_STRING_LITERAL,
    BLOCK_COMMENT,
    ERROR_SENTINEL,
};

void *tree_sitter_rok_external_scanner_create(void) { return NULL; }

void tree_sitter_rok_external_scanner_destroy(void *payload) { (void)payload; }

unsigned tree_sitter_rok_external_scanner_serialize(void *payload, char *buffer) {
    (void)payload;
    (void)buffer;
    return 0;
}

void tree_sitter_rok_external_scanner_deserialize(void *payload, const char *buffer,
                                                  unsigned length) {
    (void)payload;
    (void)buffer;
    (void)length;
}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline bool is_space(int32_t c) {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\v' || c == '\f';
}

// Text of "..." or b"...": up to a quote or a backslash.
static bool scan_string_content(TSLexer *lexer) {
    bool any = false;
    while (!lexer->eof(lexer) && lexer->lookahead != '"' && lexer->lookahead != '\\') {
        advance(lexer);
        any = true;
    }
    lexer->result_symbol = STRING_CONTENT;
    return any;
}

// Text of an f-string: up to the closing quote(s), a backslash or a hole.
// `{{` and `}}` are text.
static bool scan_fstring_content(TSLexer *lexer, bool triple) {
    bool any = false;
    for (;;) {
        lexer->mark_end(lexer);
        if (lexer->eof(lexer)) {
            break;
        }
        int32_t c = lexer->lookahead;
        if (c == '\\') {
            break;
        }
        if (c == '{') {
            advance(lexer);
            if (lexer->lookahead != '{') {
                break;
            }
            advance(lexer);
            any = true;
            continue;
        }
        if (c == '"') {
            if (!triple) {
                break;
            }
            advance(lexer);
            if (lexer->lookahead == '"') {
                advance(lexer);
                if (lexer->lookahead == '"') {
                    break;
                }
            }
            any = true;
            continue;
        }
        if (!triple && (c == '\n' || c == '\r')) {
            break;
        }
        advance(lexer);
        any = true;
    }
    lexer->result_symbol = triple ? FSTRING_TRIPLE_CONTENT : FSTRING_CONTENT;
    return any;
}

// Format spec text after `:` in a hole: up to `{`, `${` or `}`. `$$` is
// text.
static bool scan_format_spec(TSLexer *lexer) {
    bool any = false;
    for (;;) {
        lexer->mark_end(lexer);
        if (lexer->eof(lexer)) {
            break;
        }
        int32_t c = lexer->lookahead;
        if (c == '{' || c == '}' || c == '"' || c == '\n' || c == '\r') {
            break;
        }
        if (c == '$') {
            advance(lexer);
            if (lexer->lookahead == '{') {
                break;
            }
            if (lexer->lookahead == '$') {
                advance(lexer);
            }
            any = true;
            continue;
        }
        advance(lexer);
        any = true;
    }
    lexer->result_symbol = FORMAT_SPEC_TEXT;
    return any;
}

// r"..", r#".."#: closed by `"` and as many `#` as opened.
static bool scan_raw_string(TSLexer *lexer) {
    advance(lexer);
    unsigned hashes = 0;
    while (lexer->lookahead == '#') {
        advance(lexer);
        hashes++;
    }
    if (lexer->lookahead != '"') {
        return false;
    }
    advance(lexer);
    for (;;) {
        if (lexer->eof(lexer)) {
            return false;
        }
        if (lexer->lookahead != '"') {
            advance(lexer);
            continue;
        }
        advance(lexer);
        unsigned n = 0;
        while (n < hashes && lexer->lookahead == '#') {
            advance(lexer);
            n++;
        }
        if (n == hashes) {
            lexer->mark_end(lexer);
            lexer->result_symbol = RAW_STRING_LITERAL;
            return true;
        }
    }
}

// /* .. */, nesting.
static bool scan_block_comment(TSLexer *lexer) {
    advance(lexer);
    if (lexer->lookahead != '*') {
        return false;
    }
    advance(lexer);
    unsigned depth = 1;
    while (depth > 0) {
        if (lexer->eof(lexer)) {
            break;
        }
        int32_t c = lexer->lookahead;
        advance(lexer);
        if (c == '/' && lexer->lookahead == '*') {
            advance(lexer);
            depth++;
        } else if (c == '*' && lexer->lookahead == '/') {
            advance(lexer);
            depth--;
        }
    }
    lexer->mark_end(lexer);
    lexer->result_symbol = BLOCK_COMMENT;
    return true;
}

bool tree_sitter_rok_external_scanner_scan(void *payload, TSLexer *lexer,
                                           const bool *valid_symbols) {
    (void)payload;
    bool recovering = valid_symbols[ERROR_SENTINEL];

    if (!recovering) {
        if (valid_symbols[STRING_CONTENT]) {
            return scan_string_content(lexer);
        }
        if (valid_symbols[FSTRING_CONTENT]) {
            return scan_fstring_content(lexer, false);
        }
        if (valid_symbols[FSTRING_TRIPLE_CONTENT]) {
            return scan_fstring_content(lexer, true);
        }
        if (valid_symbols[FORMAT_SPEC_TEXT] && lexer->lookahead != '{' &&
            lexer->lookahead != '}') {
            if (scan_format_spec(lexer)) {
                return true;
            }
            return false;
        }
    }

    while (is_space(lexer->lookahead)) {
        skip(lexer);
    }

    if (valid_symbols[RAW_STRING_LITERAL] && lexer->lookahead == 'r') {
        return scan_raw_string(lexer);
    }
    if (valid_symbols[BLOCK_COMMENT] && lexer->lookahead == '/') {
        return scan_block_comment(lexer);
    }
    return false;
}
