/*
 * chappe
 *
 * Copyright 2021, Crisp IM SAS
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var _s  = require("escape-html");


// Format: `* Title: Description -> URL` for child

var RULE = (
  /^(?:[ ]*\|[ ]?([^:\n]+):[ ]?([^:\n]+)[ ]?->[ ]([^>\n\[\]]+)(?: \[(blank|self)\])?(?:\n|$))/
);

module.exports = {
  name  : "navigation-item",
  level : "inline",

  start : function(source) {
    var _match = source.match(RULE);

    if (_match) {
      return _match.index;
    }
  },

  tokenizer : function(source) {
    var _match = RULE.exec(source);

    if (_match) {
      return {
        type        : "navigation-item",
        raw         : _match[0],
        title       : _match[1].trim(),
        description : _match[2].trim(),
        url         : _match[3].trim(),
        target      : (_match[4] || "self").trim()
      };
    }
  },

  renderer : function(token) {
    return (
      "<li class=\"navigation-item\">"                                        +
        "<a "                                                                 +
            "class=\"navigation-link\" "                                      +
            "href=\"" + _s(token.url) + "\" "                                 +
            "target=\"_" + _s(token.target) + "\">"                           +
          "<span class=\"navigation-text\">"                                  +
            "<span class=\"navigation-title font-sans-semibold\">"            +
              _s(token.title)                                                 +
            "</span>"                                                         +

            "<span class=\"navigation-label font-sans-regular\">"             +
              _s(token.description)                                           +
            "</span>"                                                         +
          "</span>"                                                           +

          "<span class=\"navigation-action font-sans-semibold\">Read</span>"  +
        "</a>"                                                                +
      "</li>"
    );
  }
};
