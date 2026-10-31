// External scanner for ROKON: string text, raw strings with matching `#`
// counts and nested block comments.

#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>

enum TokenType {
    STRING_CONTENT,
    RAW_STRING_LITERAL,
    BLOCK_COMMENT,
    ERROR_SENTINEL,
};

void *tree_sitter_rokon_external_scanner_create(void) { return NULL; }

void tree_sitter_rokon_external_scanner_destroy(void *payload) { (void)payload; }

unsigned tree_sitter_rokon_external_scanner_serialize(void *payload, char *buffer) {
    (void)payload;
    (void)buffer;
    return 0;
}

void tree_sitter_rokon_external_scanner_deserialize(void *payload, const char *buffer,
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

static bool scan_string_content(TSLexer *lexer) {
    bool any = false;
    while (!lexer->eof(lexer) && lexer->lookahead != '"' && lexer->lookahead != '\\') {
        advance(lexer);
        any = true;
    }
    lexer->result_symbol = STRING_CONTENT;
    return any;
}

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

static bool scan_block_comment(TSLexer *lexer) {
    advance(lexer);
    if (lexer->lookahead != '*') {
        return false;
    }
    advance(lexer);
    unsigned depth = 1;
    while (depth > 0 && !lexer->eof(lexer)) {
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

bool tree_sitter_rokon_external_scanner_scan(void *payload, TSLexer *lexer,
                                             const bool *valid_symbols) {
    (void)payload;
    if (valid_symbols[STRING_CONTENT] && !valid_symbols[ERROR_SENTINEL]) {
        return scan_string_content(lexer);
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
