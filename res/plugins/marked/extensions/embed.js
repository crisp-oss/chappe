/*
 * chappe
 *
 * Copyright 2021, Crisp IM SARL
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var _s  = require("escape-html");


// Format: `${type}[title](target)`

module.exports = {
  name  : "embed",
  level : "inline",

  start : function(source) {
    var _match = source.match(
      /^\${(?:[^{}]+)}\[(?:[^\[\]]*)\]\((?:[^\(\)]+)\)/
    );

    if (_match) {
      return _match.index;
    }
  },

  tokenizer : function(source) {
    var _match = /^\${([^{}]+)}\[([^\[\]]*)\]\(([^\(\)]+)\)$/.exec(source);

    if (_match) {
      return {
        type     : "embed",
        raw      : _match[0],
        injector : _match[1],
        title    : _match[2],
        target   : _match[3]
      };
    }
  },

  renderer : function(token) {
    // Generate preview code
    var _preview_url;

    switch (token.injector) {
      case "youtube": {
        // Generate YouTube preview image URL
        _preview_url = (
          "https://img.youtube.com/vi/" + token.target + "/maxresdefault.jpg"
        );

        break;
      }

      default: {
        throw new Error(
          "Unsupported embed injector: " + token.injector
        );
      }
    }

    // Generate caption code
    var _caption_code = (
      !token.title ? "" : (
        "<div class=\"embed-caption\">" + _s(token.title) + "</div>"
      )
    );

    // Generate final embed code
    return (
      "<div "                                                              +
          "class=\"embed\" "                                               +
          "data-injector=\"" + token.injector + "\" "                      +
          "data-target=\"" + token.target + "\" "                          +
          "data-loaded=\"false\">"                                         +
        "<div class=\"embed-wrap\">"                                       +
          "<div class=\"embed-frame\"></div>"                              +

          "<div "                                                          +
              "class=\"embed-preview\" "                                   +
              "style=\"background-image: url('" + _preview_url + "');\">"  +
          "</div>"                                                         +
        "</div>"                                                           +

        _caption_code                                                      +
      "</div>"
    );
  }
};
