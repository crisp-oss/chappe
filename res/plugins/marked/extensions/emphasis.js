/*
 * chappe
 *
 * Copyright 2021, Crisp IM SARL
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */

// Format: `!!! text`, `!! text` or `! text`

module.exports = {
  name  : "emphasis",
  level : "block",

  start : function(source) {
    var _match = source.match(/^(?:[!]{1,3})(?:[ ]{1,})(?:[^\n]*)/);

    if (_match) {
      return _match.index;
    }
  },

  tokenizer : function(source) {
    var _match = /^([!]{1,3})(?:[ ]{1,})([^\n]+)/.exec(source);

    if (_match) {
      // Parse level
      var _level;

      switch (_match[1].trim()) {
        case "!!!": {
          _level = "warning";

          break;
        }

        case "!!": {
          _level = "info";

          break;
        }

        default: {
          _level = "notice";
        }
      }

      return {
        type  : "emphasis",
        raw   : _match[0],
        level : _level,
        text  : this.lexer.inlineTokens(_match[2].trim())
      };
    }
  },

  renderer : function(token) {
    return (
      "<div class=\"emphasis emphasis--" + token.level + "\">"  +
        this.parser.parseInline(token.text)                     +
      "</div>"
    );
  }
};
