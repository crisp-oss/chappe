/*
 * chappe
 *
 * Copyright 2022, Crisp IM SAS
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var _s  = require("escape-html");


module.exports = function(code, infostring, escaped) {
  // Acquire language name and its associated class (if any)
  var _language = (infostring || "").trim();

  var _class    = (
    _language ? (this.options.langPrefix + _s(_language)) : null
  );

  return (
    "<pre" + (code ? " class=\"copy\"" : "") + ">"                         +
      "<span class=\"code-clipboard copy-button\"></span>"                 +

      "<code class=\"copy-value" + (_class ? (" " + _class) : "") + "\">"  +
        (escaped ? code : _s(code))                                        +
      "</code>"                                                            +
    "</pre>"                                                               +
    "\n"
  );
};
