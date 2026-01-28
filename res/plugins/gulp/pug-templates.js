/*
 * chappe
 *
 * Copyright 2021, Crisp IM SAS
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var fs                 = require("fs");
var path               = require("path");
var url                = require("url");

var lodash             = require("lodash");
var glob               = require("glob");
var slug               = require("slug");
var drafter            = require("drafter.js");
var toc                = require("markdown-toc");
var truncate_text      = require("trunc-text");
var remove_markdown    = require("@tommoor/remove-markdown");
var http_status_codes  = require("http-status-codes");

var gulp_notify        = require("gulp-notify");
var gulp_rename        = require("gulp-rename");


module.exports = {
  list_config_locales : function(context, package, marked) {
    var pug_config = {
      data : lodash.merge(
        lodash.clone(context.CONFIG),

        {
          PACKAGE : package,

          DATE    : {
            YEAR : (new Date()).getUTCFullYear()
          },

          METHODS : {
            marked          : marked,
            remove_markdown : remove_markdown,
            truncate_text   : truncate_text,
            slug            : slug
          }
        }
      )
    };

    if (context.IS_PRODUCTION) {
      pug_config.pretty = false;
    } else {
      pug_config.pretty = true;
    }

    return context.CONFIG.LANGS.map(function(lang) {
      var pug_config_lang = lodash.cloneDeep(pug_config);

      // Assign locale code
      pug_config_lang.data.LOCALE = {
        CODE      : lang,
        DIRECTION : "ltr"
      };

      // Assign locale strings
      pug_config_lang.data.$_ = JSON.parse(
        fs.readFileSync(context.PATH_SOURCES + "/locales/" + lang + ".json")
      );

      return {
        locale : lang,
        config : pug_config_lang
      };
    });
  },

  pipe_commons : function(context, locale, fn_pipeline) {
    return fn_pipeline()
      .on("error", gulp_notify.onError({
        title     : "pug_templates_base",
        message   : "Error compiling",
        emitError : true
      }))
      .on("error", function(error) {
        if (context.IS_WATCH === true) {
          // Handle compile errors (used for development ease w/ `gulp watch`)
          console.error(error.toString());  // jscs:ignore
        } else {
          throw error;
        }
      })
      .pipe(
        gulp_rename(function(file_path) {
          // Append locale code to base name (only if not default locale, ie. \
          //   'en')
          if (locale !== context.CONFIG.LANGS[0]) {
            file_path.basename += ("." + locale);
          }

          // Map home directory to base directory? (as 'home' must be set at \
          //   the root, ie. as the entry 'index.html')
          if (file_path.dirname === "home") {
            file_path.dirname = "";
          }
        })
      );
  },

  traverse_guides_tree : function(
    root_path, base_path, linear_output, parent_tree
  ) {
    var _self = this;

    // Apply defaults
    base_path     = (base_path     || root_path);
    linear_output = (linear_output || []);
    parent_tree   = (parent_tree   || null);

    var _tree_output = glob.sync("./index.md", {
      cwd : base_path
    })
      .map(function(file_path) {
        // Acquire file paths (full paths from build root, and page paths)
        var _file_path_full  = path.join(base_path, file_path),
            _file_path_pages = path.relative(root_path, _file_path_full);

        // Split file path into its final URL segments
        var _path_segments = (
          _file_path_pages.split("/")
            .filter(function(file_path_segment) {
              // Ignore segment?
              if (file_path_segment === "." || file_path_segment === "index.md") {
                return false;
              }

              // Accept segment
              return true;
            })
        );

        // Read guide metas: title, order and others (and then, Markdown)
        var _file_data  = fs.readFileSync(_file_path_full, "utf-8"),
            _file_lines = _file_data.split(/\r?\n/);

        var _guide_title    = null,
            _guide_index    = null,
            _guide_updated  = null,
            _guide_links    = [],
            _guide_markdown = "";

        // Read content line-by-line
        var _has_scanned_metas = false;

        for (var _i = 0; _i < _file_lines.length; _i++) {
          // Match on meta line? (if has not already scanned all metas)
          if (_has_scanned_metas !== true) {
            var _match_meta_line = _file_lines[_i].match(/^([A-Z]+):(.+)$/);

            if (_match_meta_line) {
              var _match_meta_value = (
                (_match_meta_line[2] || "").trim() || null
              );

              switch (_match_meta_line[1]) {
                case "TITLE": {
                  _guide_title = _match_meta_value;

                  break;
                }

                case "INDEX": {
                  if (!isNaN(_match_meta_value)) {
                    _guide_index = parseInt(_match_meta_value, 10);
                  }

                  break;
                }

                case "UPDATED": {
                  _guide_updated = (new Date(_match_meta_value));

                  break;
                }

                case "LINK": {
                  var _link_parts = _match_meta_value.split("->"),
                      _link_name  = (_link_parts[0] || "").trim(),
                      _link_url   = (_link_parts[1] || "").trim();

                  if (!_link_name || !_link_url || _link_parts.length !== 2) {
                    throw new Error(
                      "Guide link value is invalid: " + _match_meta_value
                    );
                  }

                  _guide_links.push({
                    name : _link_name,
                    url  : _link_url
                  });

                  break;
                }

                default: {
                  throw new Error(
                    "Guide meta-data value is unsupported: " + _match_meta_line[1]
                  );
                }
              }

              continue;
            }

            // Non-meta line found, consider as having scanned them all.
            _has_scanned_metas = true;
          }

          // Handle Markdown line
          _guide_markdown += _file_lines[_i];
          _guide_markdown += "\n";
        }

        // Perform a final trim of the parsed Markdown (as extra end-lines may \
        //   be held)
        _guide_markdown = _guide_markdown.trim();

        // Validate acquired values
        if (!_guide_title || !_guide_updated                          ||
              isNaN(_guide_updated.getTime()) || isNaN(_guide_index)  ||
              _guide_index < 1) {
          throw new Error("Guide meta-data is invalid at: " + _file_path_full);
        }

        // Generate tree entry
        var _entry = {
          segments : _path_segments,
          id       : _path_segments.join("_"),
          title    : _guide_title,
          index    : _guide_index,
          links    : _guide_links,
          updated  : _guide_updated,
          markdown : _guide_markdown,
          parent   : parent_tree,
          subtrees : []
        };

        // List sub-trees (traverse tree recursively)
        var _sub_tree_parts = (
          glob.sync("./*/", {
            cwd : base_path
          })
            .map(function(directory_path) {
              var _sub_tree_data = _self.traverse_guides_tree(
                root_path, path.join(base_path, directory_path), linear_output,
                  _entry
              );

              // Take tree output, drop the linear output aggregator
              return _sub_tree_data[0];
            })
            .filter(function(sub_tree) {
              // Filter-out empty sub-trees
              return (sub_tree.length > 0 ? true : false);
            })
        );

        // Reduce sub-trees into a single array
        _sub_tree_parts.forEach(function(sub_tree_part) {
          _entry.subtrees = _entry.subtrees.concat(sub_tree_part);
        });

        // Sort sub-trees by lower index first
        _entry.subtrees = _entry.subtrees.sort(function(previous, next) {
          return (previous.index - next.index);
        });

        // Append this entry to the linear output (w/ the same object reference \
        //   as the tree-based output)
        linear_output.push(_entry);

        return _entry;
      })
      .sort(function(previous, next) {
        // Sort main-tree by lower index first
        return (previous.index - next.index);
      });

    return [_tree_output, linear_output];
  },

  traverse_references_linear : function(context, root_path) {
    var _self = this;

    return glob.sync("./**/*.md", {
      cwd : root_path
    })
      .map(function(file_path) {
        // Acquire file paths (full paths from build root, and page paths)
        var _file_path_full = path.join(root_path, file_path);

        // Split file path into its final URL segments
        var _path_segments = (
          file_path.split("/")
            .filter(function(file_path_segment) {
              // Ignore segment?
              if (file_path_segment === ".") {
                return false;
              }

              // Accept segment
              return true;
            })
            .map(function(file_path_segment) {
              // Remove all file extensions in all segments
              return file_path_segment.split(".")[0];
            })
        );

        // Read reference metas: type and others (and then, content)
        var _file_data  = fs.readFileSync(_file_path_full, "utf-8"),
            _file_lines = _file_data.split(/\r?\n/);

        var _reference_type    = null,
            _reference_title   = null,
            _reference_updated = null,
            _reference_content = "";

        // Read content line-by-line
        var _has_scanned_metas = false;

        for (var _i = 0; _i < _file_lines.length; _i++) {
          // Match on meta line? (if has not already scanned all metas)
          if (_has_scanned_metas !== true) {
            // Only scan on certain meta keys, as some keys may be used for \
            //   eg. API Blueprint.
            var _match_meta_line = (
              _file_lines[_i].match(/^(TYPE|TITLE|UPDATED):(.+)$/)
            );

            if (_match_meta_line) {
              var _match_meta_value = (
                (_match_meta_line[2] || "").trim() || null
              );

              switch (_match_meta_line[1]) {
                case "TYPE": {
                  _reference_type = _match_meta_value;

                  break;
                }

                case "TITLE": {
                  _reference_title = _match_meta_value;

                  break;
                }

                case "UPDATED": {
                  _reference_updated = (new Date(_match_meta_value));

                  break;
                }

                default: {
                  throw new Error(
                    "Reference meta-data value is unsupported: "  +
                      _match_meta_line[1]
                  );
                }
              }

              continue;
            }

            // Non-meta line found, consider as having scanned them all.
            _has_scanned_metas = true;
          }

          // Handle content line
          _reference_content += _file_lines[_i];
          _reference_content += "\n";
        }

        // Perform a final trim of the parsed content (as extra end-lines may \
        //   be held)
        _reference_content = _reference_content.trim();

        // Validate acquired values
        if (!_reference_type || !_reference_title || !_reference_updated  ||
              isNaN(_reference_updated.getTime())) {
          throw new Error(
            "Reference meta-data is invalid at: " + _file_path_full
          );
        }

        // Return entry data
        return [
          {
            segments : _path_segments,
            id       : _path_segments.join("_"),
            type     : _reference_type,
            title    : _reference_title,
            updated  : _reference_updated,
          },

          _reference_content
        ];
      })
      .map(function(entry_items) {
        var _entry = entry_items[0];

        switch (_entry.type) {
          case "API Blueprint": {
            var _parse_result = drafter.parseSync(entry_items[1], {
              requireBlueprintName      : true,
              generateSourceMap         : false,
              generateMessageBody       : false,
              generateMessageBodySchema : false
            });

            // Blueprint has error? (likely invalid)
            if (!_parse_result || _parse_result.content.length === 0  ||
                  _parse_result.content[0].element !== "category") {
              throw new Error(
                "Reference API Blueprint could not be parsed for: "  +
                  _entry.segments.join("/")
              );
            }

            // Blueprint has warnings? (we want to be strict there and abort \
            //   build, as ignored warnings can result in unseen issues in the \
            //   final built reference document)
            // Notice: render errors in a readable format.
            var _warns_count = (_parse_result.content.length - 1);

            if (_warns_count > 0) {
              var _warns_limit = 50;

              throw new Error(
                "Reference API Blueprint has warnings for: "  +
                  _entry.segments.join("/")                   +
                  "\n\n"                                      +
                  "Warnings to be resolved:"                  +
                  "\n"                                        +

                  (
                    _parse_result.content.splice(1, _warns_limit)
                      .map(function(warning) {
                        var _text = (
                          (typeof warning.content === "string") ?
                            (warning.content || "[no text]") : "[wrong type]"
                        );

                        return (" |- (" + warning.element + ") -> " + _text);
                      })
                      .join("\n")
                  )                                           +

                  (
                    (_warns_count <= _warns_limit) ? "" : (
                      "\n" + (
                        " \\+ (" + (_warns_count - _warns_limit) + " more)"
                      )
                    )
                  )
              );
            }

            // Acquire final entry data
            var _data = _parse_result.content[0];

            // Find API host URL from parent attributes
            var _host_url = null;

            (_data.attributes.metadata.content || []).forEach(
              function(metadata) {
                if (!_host_url && metadata.element === "member"  &&
                      metadata.content                           &&
                      metadata.content.key.content === "HOST") {
                  _host_url = metadata.content.value.content;
                }
              }
            );

            // Still did not find host URL? This is unexpected.
            if (!_host_url) {
              throw new Error(
                "Reference API Blueprint HOST value could not be found"
              );
            }

            // Assign parsed Blueprint result tree (first entry contains the \
            //   whole result tree)
            _entry.data       = _data;

            _entry.baseline   = (
              _self.map_references_blueprint_baseline(_host_url)
            );
            _entry.categories = (
              _self.map_references_blueprint_categories(context, _data.content)
            );
            _entry.examples   = (
              _self.map_references_blueprint_examples(_data.content)
            );

            break;
          }

          case "Markdown": {
            // Acquire final entry data
            var _data = entry_items[1];

            // Assign parsed Markdown data
            _entry.data       = _data;

            _entry.categories = (
              _self.map_references_markdown_categories(_data)
            );

            break;
          }

          default: {
            throw new Error(
              "Reference type: " + _entry.type + " is not recognized on: "  +
                _entry.segments.join("/")
            );
          }
        }

        return _entry;
      });
  },

  map_references_blueprint_baseline : function(host_url) {
    var _baseline = {};

    // Map host URL parts
    _baseline.host = {
      url  : host_url,
      path : (url.parse(host_url).pathname || "/")
    };

    return _baseline;
  },

  map_references_blueprint_categories : function(context, entries, parent_id) {
    var _self = this;

    var _categories = [];

    entries.forEach(function(entry) {
      // Match on category groups only
      if (entry.element === "category" || entry.element === "resource"  ||
            entry.element === "transition") {
        // Acquire HTTP method associated to 'transition' element (ie. request)
        var _badge = null;

        if (entry.element === "transition") {
          var _http_method = (
            _self.find_references_blueprint_http_method(entry)
          );

          if (_http_method) {
            // Acquire badge color for HTTP method
            var _badge_color = (
              context.CONFIG.COLORS.BADGES.HTTP[_http_method] || null
            );

            // Create final badge object
            _badge = [_http_method, _badge_color];
          }
        }

        // Generate category identifier (prepend parent identifier, if any)
        var _id = slug(entry.meta.title.content);

        if (parent_id) {
          _id = (parent_id + "-" + _id);
        }

        // Push current category to the level of categories being scanned
        _categories.push({
          id       : _id,
          title    : entry.meta.title.content,
          badge    : _badge,

          subtrees : (
            _self.map_references_blueprint_categories(
              context, entry.content,

              ((entry.element === "category") ? _id : null)  //-[parent_id]
            )
          )
        });
      }
    });

    return _categories;
  },

  map_references_blueprint_examples : function(entries, parent_map) {
    var _self = this;

    parent_map = (parent_map || {});

    entries.forEach(function(entry) {
      switch (entry.element) {
        case "category":
        case "resource": {
          // Recurse on children (parent groups of transition group)
          _self.map_references_blueprint_examples(
            entry.content, parent_map
          );

          break;
        }

        case "transition": {
          // Acquire HTTP method
          var _http_method = (
            _self.find_references_blueprint_http_method(entry)
          );

          // Acquire restrictions
          var _restrictions = (
            _self.find_references_blueprint_restrictions(entry)
          );

          // Parse URL parts (if any)
          var _url_parts = (
            _self.find_references_blueprint_url_parts(entry)
          );

          // Parse available request-response flows
          var _flows = (
            _self.find_references_blueprint_flows(entry)
          );

          // Validate acquired data
          if (!_http_method || Object.keys(_flows).length === 0) {
            throw new Error(
              "Reference API Blueprint transition entry has no example request"
            );
          }

          // Generate example data
          var _example_data = {
            method : _http_method,

            url    : {
              parts : _url_parts
            },

            tiers  : (_restrictions.tiers  || []),
            scopes : (_restrictions.scopes || []),

            flows  : _flows
          };

          // Assign example data to parent map
          var _id = slug(entry.meta.title.content);

          parent_map[_id] = _example_data;

          break;
        }
      }
    });

    return parent_map;
  },

  map_references_markdown_categories : function(data) {
    var _self = this;

    // Generate navigation menu from Markdown
    var _navigation = toc(data, {
      maxdepth : 3,
      firsth1  : true
    });

    // Generate navigation tree (based on indent levels)
    return (
      _self.transduce_references_markdown_categories_tree(_navigation.json)
    );
  },

  transduce_references_markdown_categories_tree : function(items, level) {
    var _self = this;

    level = (level || 1);

    // Append entries to tree
    var _tree           = [],
        _current_entry  = null,
        _children_stack = [];

    for (var _i = 0; _i < (items.length + 1); _i++) {
      var _item = (items[_i] || null);

      // Scanning is finished as we have overflown? Or are we still scanning?
      if (_item === null || _item.lvl === level) {
        // Push last current entry before, if any
        if (_current_entry !== null) {
          // Transduce eventual children from the stack
          _current_entry.subtrees = (
            _self.transduce_references_markdown_categories_tree(
              _children_stack, (level + 1)
            )
          );

          // Append current entry to tree (with its eventual children)
          _tree.push(_current_entry);

          // Reset children stack back to empty state
          _children_stack = [];
        }

        // Start a new current entry?
        if (_item !== null) {
          _current_entry = {
            id       : _item.slug,
            title    : _item.content,
            subtrees : []
          };
        }
      } else {
        // Append raw child entry to children stack
        _children_stack.push(_item);
      }
    }

    return _tree;
  },

  find_references_blueprint_http_method : function(transition) {
    var _http_method = null;

    transition.content.forEach(function(entry) {
      if (_http_method === null && entry.element === "httpTransaction") {
        entry.content.forEach(function(transaction) {
          if (_http_method === null && transaction.element === "httpRequest") {
            if (transaction.attributes && transaction.attributes.method) {
              // Read HTTP method
              _http_method = (
                transaction.attributes.method.content.toLowerCase()
              );
            }
          }
        });
      }
    });

    return _http_method;
  },

  find_references_blueprint_restrictions : function(transition) {
    var _restrictions = null;

    // Iterate on each 'copy' text line found
    transition.content.forEach(function(entry) {
      if (_restrictions === null && entry.element === "httpTransaction") {
        entry.content.forEach(function(transaction) {
          if (_restrictions === null && transaction.element === "httpRequest") {
            transaction.content.forEach(function(sub_entry) {
              if (sub_entry.element === "copy") {
                sub_entry.content.split("\n").forEach(function(line) {
                  var _match = line.trim().match(/^\+ (Tiers|Scopes):(.+)$/);

                  if (_match && _match[1] && _match[2]) {
                    var _key = _match[1].toLowerCase();

                    // Initialize restrictions map or key array (if needed)
                    _restrictions       = (_restrictions       || {});
                    _restrictions[_key] = (_restrictions[_key] || []);

                    // Iterate on parts sub-matches
                    var _part_regex = /(?:^| )`([^`]+)`/g,
                        _part_match;

                    while (_part_match = _part_regex.exec(_match[2])) {
                      // Assign found restriction type and values
                      _restrictions[_key].push(
                        _part_match[1].trim()
                      );
                    }
                  }
                });
              }
            });
          }
        });
      }
    });

    return (_restrictions || {});
  },

  find_references_blueprint_url_parts : function(transition) {
    // Notice: this is a simple and (relatively) hacky way to parse URL \
    //   parts into tokens, w/o using more complex yet complete ways \
    //   eg. backtracking. This does the job in our use-case.
    var _url_parts = [];

    if (transition.attributes && transition.attributes.href) {
      var _href         = (transition.attributes.href.content || ""),
          _current_part = null;

      for (var _i = 0; _i < _href.length; _i++) {
        var _slice = _href[_i];

        // Initialize current part?
        var _was_initiated = false;

        if (_current_part === null) {
          _current_part  = {
            type  : ((_slice === "{") ? "parameter" : "segment"),
            value : ""
          };

          _was_initiated = true;
        }

        // Push current character? (ignore '{' and '}' enclosure characters)
        if (_slice !== "{" && _slice !== "}") {
          _current_part.value += _slice;
        }

        // Push current part? (closure or opener character detected, or \
        //   end-of-string, or next character opens a different enclosed \
        //   type)
        if (_current_part !== null && ((_i === (_href.length - 1))   ||
              ((_slice === "{" || _slice === "}" || _slice === "/")  &&
                (_was_initiated !== true || _href[_i + 1] === "{")))) {
          var _first_slice = _current_part.value[0];

          // Ignore argument parameters
          if (_first_slice !== "?" && _first_slice !== "&") {
            _url_parts.push(_current_part);
          }

          _current_part = null;
        }
      }
    }

    return _url_parts;
  },

  find_references_blueprint_flows : function(transition) {
    var _self = this;

    var _flows_map = {};

    transition.content.forEach(function(entry) {
      if (entry.element === "httpTransaction") {
        // Map entry contents as a direct-access map
        var _entry_contents = {};

        entry.content.forEach(function(sub_entry) {
          if (sub_entry.element.startsWith("http") === true) {
            _entry_contents[sub_entry.element] = sub_entry;
          }
        });

        if (_entry_contents.httpRequest && _entry_contents.httpResponse) {
          var _request_name = (
            ((_entry_contents.httpRequest.meta || {}).title || {}).content || "?"
          );

          var _request_id   = slug(_request_name);

          // Assign first flow request data? (if not already set)
          if (!_flows_map[_request_id]) {
            var _request_params = (
              _self.parse_references_blueprint_flow_direction(
                _request_name, _entry_contents.httpRequest
              )
            );

            // Assign new flow data
            _flows_map[_request_id] = {
              request   : _request_params,
              responses : []
            };
          }

          // Assign current flow response data
          var _http_status_name = (
            _entry_contents.httpResponse.attributes.statusCode.content
          );

          // Attempt to resolve reason text from status code?
          if (!isNaN(_http_status_name)) {
            // Notice: 'http_status_codes.getReasonPhrase()' throws if it \
            //   cannot find the reason for a status code, therefore we need \
            //   to wrap this in a try/catch block.
            try {
              var _http_status_reason = http_status_codes.getReasonPhrase(
                parseInt(_http_status_name, 10)
              );

              if (_http_status_reason) {
                _http_status_name += (" " + _http_status_reason);
              }
            } catch (error) {
              // Ignore error (this will skip appending the reason to the \
              //   status name)
            }
          }

          var _response_params = (
            _self.parse_references_blueprint_flow_direction(
              _http_status_name, _entry_contents.httpResponse
            )
          );

          _flows_map[_request_id].responses.push(_response_params);
        }
      }
    });

    return _flows_map;
  },

  parse_references_blueprint_flow_direction : function(name, entry) {
    // Look for direction content type and data
    var _direction_type = null,
        _direction_data = null;

    entry.content.forEach(function(direction_entry) {
      if (!_direction_type && direction_entry.element === "asset"  &&
            (direction_entry.meta.classes.content[0].content  ===
              "messageBody")) {
        // Read type
        // Notice: if type is a MIME? Extract last chunk
        _direction_type = direction_entry.attributes.contentType.content;

        if (_direction_type.includes("/") === true) {
          var _type_chunks = _direction_type.split("/");

          _direction_type    = (
            (_type_chunks[_type_chunks.length - 1] || "").toUpperCase()
          );
        }

        // Read data
        _direction_data = (direction_entry.content || "").trim();

        // Collapse tabulations from 4 spaces to 2 spaces (this improves \
        //   legibility)
        _direction_data = _direction_data.replace(/^( +)\1/gm, "$1");
      }
    });

    return {
      name : name,
      type : (_direction_type || null),
      data : (_direction_data || null)
    };
  }
};
