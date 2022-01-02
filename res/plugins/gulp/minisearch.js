/*
 * chappe
 *
 * Copyright 2021, Valerian Saliou
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var remove_markdown  = require("@tommoor/remove-markdown");


module.exports = {
  insert_categories : function(
    context, type, path_origin, categories, override_segments
  ) {
    var _self = this;

    // Define a maximum length for summaries
    var _summary_maximum_length = 100;

    categories.forEach(function(category) {
      // Generate target page URL
      var _target_segments = (
        override_segments || category.segments || []
      );

      var _target_url = (
        "/" + type + "/" + _target_segments.join("/")  +
          ((_target_segments.length > 0) ? "/" : "")
      );

      // Append page anchor? (if not a category with segments)
      if (!category.segments && category.id) {
        _target_url += ("#" + category.id);
      }

      // Acquire summary (based on available data)
      var _summary_full = "";

      if (category.data) {
        switch (category.type) {
          case "API Blueprint": {
            if (category.data.content) {
              var _blueprint_first_line;

              // Acquire first line from content
              for (var _i = 0; _i < category.data.content.length; _i++) {
                var _entry = category.data.content[_i];

                if (_entry.element === "copy" && _entry.content) {
                  _blueprint_first_line = _entry.content;

                  break;
                }
              }

              // Strip Markdown from first line?
              if (_blueprint_first_line) {
                _summary_full = remove_markdown(_blueprint_first_line);
              }
            }

            break;
          }

          case "Markdown": {
            // Strip Markdown from data
            _summary_full = remove_markdown(category.data);

            break;
          }
        }

        // Use title as summary? (fallback)
        if (!_summary_full) {
          _summary_full = category.title;
        }
      } else if (category.markdown) {
        // Strip Markdown from text
        _summary_full = remove_markdown(category.markdown);
      }

      // Generate short summary
      var _summary;

      if (_summary_full.length > _summary_maximum_length) {
        _summary = (
          _summary_full.substr(0, _summary_maximum_length) + "."
        );
      } else {
        _summary = _summary_full;
      }

      // Insert entry to index
      context.SEARCH_INDEX.add({
        id      : _target_url,
        path    : path_origin.join(" > "),
        title   : category.title,
        summary : (_summary || "")
      });

      // Recurse to subtrees?
      if ((category.subtrees || []).length > 0) {
        // Generate current path origin
        var _parent_path_origin = [].concat(path_origin);

        _parent_path_origin.push(category.title);

        // Insert all child categories to the index
        _self.insert_categories(
          context, type, _parent_path_origin, category.subtrees,
            override_segments
        );
      }
    });
  }
};
