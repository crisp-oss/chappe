/*
 * chappe
 *
 * Copyright 2021, Crisp IM SAS
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var _s  = require("escape-html");


// Format: `$[caption](<code>)`

module.exports = {
  name  : "figcaption",
  level : "block",

  start : function(source) {
    var _match = source.match(/^(?:\$\[[^\[\]\n]+\]\([^\n]+)\)/);

    if (_match) {
      return _match.index;
    }
  },

  tokenizer : function(source) {
    var _match = /^\$\[([^\[\]\n]+)\]\(([^\n]+)\)/.exec(source);

    if (_match) {
      return {
        type    : "figcaption",
        raw     : _match[0],
        caption : _match[1],
        code    : this.lexer.inlineTokens(_match[2].trim())
      };
    }
  },

  renderer : function(token) {
    return (
      "<figure>"                                              +
        this.parser.parseInline(token.code)                   +
        "<figcaption>" + _s(token.caption) + "</figcaption>"  +
      "</figure>"
    );
  }
};
