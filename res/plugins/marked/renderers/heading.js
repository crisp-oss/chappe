/*
 * chappe
 *
 * Copyright 2021, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var slug  = require("slug");


module.exports = function(text, level) {
  var _id = slug(text);

  return (
    "<h" + level + " id=\"" + _id + "\">"                 +
      "<a class=\"title-anchor\" href=\"#" + _id + "\">"  +
        text                                              +
      "</a>"                                              +
    "</h" + level + ">"
  );
};
