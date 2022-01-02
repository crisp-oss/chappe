/*
 * chappe
 *
 * Copyright 2021, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */

// Format: `+ Navigation` for parent

var RULE = (
  /^(?:\+ Navigation[ ]*\n{1,2})((?:(?:[ ]*\|[ ]?(?:[^:\n]+):[ ]?(?:[^:\n]+)[ ]?->[ ](?:[^>\n]+))(?:\n|$))+)/
);

module.exports = {
  name  : "navigation",
  level : "block",

  start : function(source) {
    var _match = source.match(RULE);

    if (_match) {
      return _match.index;
    }
  },

  tokenizer : function(source) {
    var _match = RULE.exec(source);

    if (_match) {
      var _token = {
        type   : "navigation",
        raw    : _match[0],
        text   : _match[1],
        tokens : []
      };

      this.lexer.inline(
        _token.text, _token.tokens
      );

      return _token;
    }
  },

  renderer : function(token) {
    return (
      "<ul class=\"navigation\">"              +
        this.parser.parseInline(token.tokens)  +
      "</ul>"
    );
  }
};
