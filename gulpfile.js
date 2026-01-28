/*
 * chappe
 *
 * Copyright 2021, Crisp IM SAS
 * Author: Valerian Saliou <valerian@valeriansaliou.name>
 */


var fs                   = require("fs");
var path                 = require("path");

var lodash               = require("lodash");
var del                  = require("del");
var glob                 = require("glob");
var merge                = require("merge-stream");
var marked               = require("marked").marked;
var remove_markdown      = require("@tommoor/remove-markdown");
var MiniSearch           = require("minisearch");
var Feed                 = require("feed").Feed;

var gulp                 = require("gulp");

var gulp_connect         = require("gulp-connect");
var gulp_file            = require("gulp-file");
var gulp_bower           = require("gulp-bower");
var gulp_pug             = require("gulp-pug");
var gulp_sass            = require("gulp-sass")(require("sass"));
var gulp_inline_image    = require("gulp-inline-image");
var gulp_ogimage         = require("gulp-ogimage");
var gulp_sass_variables  = require("gulp-sass-variables");
var gulp_concat          = require("gulp-concat");
var gulp_babel           = require("gulp-babel");
var gulp_clean_css       = require("gulp-clean-css");
var gulp_uglify          = require("gulp-uglify");
var gulp_rename          = require("gulp-rename");
var gulp_replace         = require("gulp-replace");
var gulp_header          = require("gulp-header");
var gulp_pug_lint        = require("gulp-pug-lint");
var gulp_stylelint       = require("gulp-stylelint-esm").default;
var gulp_jshint          = require("gulp-jshint");
var gulp_jscs            = require("gulp-jscs");
var gulp_sizereport      = require("gulp-sizereport");
var gulp_sitemap         = require("gulp-sitemap");
var gulp_notify          = require("gulp-notify");
var gulp_noop            = require("gulp-noop");

var package              = require("./package.json");

var gulp_pug_templates   = require("./res/plugins/gulp/pug-templates");
var gulp_minisearch      = require("./res/plugins/gulp/minisearch");

var marked_renderers     = {
  heading : require("./res/plugins/marked/renderers/heading"),
  code    : require("./res/plugins/marked/renderers/code")
};

var marked_extensions    = {
  navigation      : require("./res/plugins/marked/extensions/navigation"),
  navigation_item : require("./res/plugins/marked/extensions/navigation-item"),
  emphasis        : require("./res/plugins/marked/extensions/emphasis"),
  figcaption      : require("./res/plugins/marked/extensions/figcaption"),
  embed           : require("./res/plugins/marked/extensions/embed")
};


// Global context

var PARENT_CONTEXT = (
  (typeof global.CONTEXT !== "undefined") ? global.CONTEXT : {}
);

var CONTEXT        = {
  // Data
  CONFIG        : {},
  SEARCH_INDEX  : null,

  // Configurations
  PATH_CONFIG       : (
    PARENT_CONTEXT.config ? PARENT_CONTEXT.config.split(",") : null
  ),

  PATH_ASSETS       : (PARENT_CONTEXT.assets || null),
  PATH_DATA         : (PARENT_CONTEXT.data   || null),
  PATH_TEMP         : (PARENT_CONTEXT.temp   || null),
  PATH_DIST         : (PARENT_CONTEXT.dist   || null),

  SERVE_HOST        : (PARENT_CONTEXT.host || null),
  SERVE_PORT        : (PARENT_CONTEXT.port || null),

  PATH_CHAPPE       : null,
  PATH_SOURCES      : null,
  PATH_LIBRARIES    : null,
  PATH_BUILD_PAGES  : null,
  PATH_BUILD_ASSETS : null,

  IS_PRODUCTION     : ((PARENT_CONTEXT.env === "production") ? true : false),
  IS_WATCH          : false
};


// Initializers

marked.use({
  renderer   : {
    heading : marked_renderers.heading,
    code    : marked_renderers.code
  },

  extensions : [
    marked_extensions.navigation,
    marked_extensions.navigation_item,
    marked_extensions.emphasis,
    marked_extensions.figcaption,
    marked_extensions.embed
  ]
});


// Tasks

/*
  Acquires the configuration
*/
var get_configuration = function(next) {
  // Assert that all paths are set
  if (CONTEXT.PATH_CONFIG === null || CONTEXT.PATH_ASSETS === null  ||
        CONTEXT.PATH_DATA === null || CONTEXT.PATH_TEMP === null    ||
        CONTEXT.PATH_DIST === null) {
    throw new Error(
      "A build path was not passed properly, please pass them as globals"
    );
  }

  // Make sure that the config and data paths exist
  // Notice: do not check the 'temp' and 'dist' path, as they will get \
  //   auto-created.
  if (fs.existsSync(CONTEXT.PATH_ASSETS) !== true) {
    throw new Error("The assets path provided does not exist!");
  }
  if (fs.existsSync(CONTEXT.PATH_DATA) !== true) {
    throw new Error("The data path provided does not exist!");
  }

  CONTEXT.PATH_CONFIG.forEach(function(config_path) {
    if (fs.existsSync(config_path) !== true) {
      throw new Error(
        "One of the configuration path provided does not exist!"
      );
    }
  });

  // Initialize final source paths
  CONTEXT.PATH_CHAPPE    = __dirname;
  CONTEXT.PATH_SOURCES   = path.join(CONTEXT.PATH_CHAPPE, "./src");
  CONTEXT.PATH_LIBRARIES = path.join(CONTEXT.PATH_TEMP, "./lib");

  // Initialize final build paths
  CONTEXT.PATH_BUILD_PAGES  = CONTEXT.PATH_DIST;
  CONTEXT.PATH_BUILD_ASSETS = (CONTEXT.PATH_DIST + "/static");

  // Read atomic configurations (merge them together)
  var _merge_pipeline = [
    // #1: Common configuration (project static)
    require("./res/config/common.json"),

    // #2: Site configuration (project defaults)
    {
      SITE : require("./res/config/user.json")
    }
  ];

  // Read vector configurations
  CONTEXT.PATH_CONFIG.forEach(function(config_path) {
    // #3: Site configuration (user-provided)
    _merge_pipeline.push({
      SITE : require(config_path)
    });
  });

  // Unwind merge pipeline
  _merge_pipeline.forEach(function(merge_object) {
    CONTEXT.CONFIG = lodash.merge(CONTEXT.CONFIG, merge_object);
  });

  // Assign contextual values
  CONTEXT.CONFIG.ENVIRONMENT = (
    (CONTEXT.IS_PRODUCTION === true) ? "production" : "development"
  );

  CONTEXT.CONFIG.REVISION = (
    "v" + (package.version || "0.0.0")
  );

  next();
};


/*
  Installs bower packages
*/
var bower = function() {
  return gulp_bower({
    directory : CONTEXT.PATH_LIBRARIES,
    cwd       : CONTEXT.PATH_CHAPPE,
    verbosity : 1
  });
};


/*
  Copies all user assets
*/
var copy_user_assets = function() {
  return gulp.src(
    CONTEXT.PATH_ASSETS + "/**/*"
  )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/user"
      )
    );
};


/*
  Copies images (base images)
*/
var copy_images_base = function() {
  return gulp.src(
    CONTEXT.PATH_SOURCES + "/images/**/*"
  )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/images"
      )
    )
    .pipe(
      gulp_connect.reload()
    );
};


/*
  Copies images (guides images)
*/
var copy_images_guides = function() {
  return gulp.src(
    CONTEXT.PATH_DATA + "/guides/**/*.{jpg,jpeg,png,gif}"
  )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/images/guides/content"
      )
    )
    .pipe(
      gulp_connect.reload()
    );
};


/*
  Copies fonts
*/
var copy_fonts = function() {
  return gulp.src(
    CONTEXT.PATH_SOURCES + "/fonts/**/*"
  )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/fonts"
      )
    )
    .pipe(
      gulp_connect.reload()
    );
};


/*
  Concats javascript libraries
*/
var concat_libraries_javascripts = function() {
  // Acquire targets
  // Notice: append user-defined syntaxes for code coloring (from 'prism.js')
  var _targets = CONTEXT.CONFIG.LIBRARIES.JAVASCRIPTS.map(function(library) {
    return (CONTEXT.PATH_LIBRARIES + "/" + library);
  });

  CONTEXT.CONFIG.SITE.plugins.code.syntaxes.forEach(function(syntax) {
    var _syntax_path = (
      CONTEXT.PATH_LIBRARIES + "/prism.js/components/prism-" + syntax + ".js"
    );

    if (fs.existsSync(_syntax_path) !== true) {
      throw new Error(
        "Unsupported code syntax plugin provided: " + syntax + " at path: "  +
          _syntax_path
      );
    }

    _targets.push(_syntax_path);
  });

  return gulp.src(_targets)
    .pipe(
      gulp_concat("common/libs.js")
    )
    .pipe(
      gulp_replace(
        "manual: _self.Prism && _self.Prism.manual,", "manual: true,"
      )
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/javascripts"
      )
    );
};


/*
  Concats stylesheet libraries
*/
var concat_libraries_stylesheets = function() {
  return gulp.src(
    CONTEXT.CONFIG.LIBRARIES.STYLESHEETS.map(function(library) {
      return (CONTEXT.PATH_LIBRARIES + "/" + library);
    })
  )
    .pipe(
      gulp_concat("common/libs.css")
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/stylesheets"
      )
    );
};


/*
  Prepares Minisearch search index (before it gets populated)
*/
var minisearch_prepare = function(next) {
  // Initialize search index
  CONTEXT.SEARCH_INDEX = new MiniSearch(
    CONTEXT.CONFIG.SEARCH.OPTIONS.BASE
  );

  next();
};


/*
  Consolidates Minisearch search index (after it was populated)
*/
var minisearch_consolidate = function() {
  // Generate search index data
  return gulp_file(
    ("./" + CONTEXT.CONFIG.SEARCH.INDEX),
    JSON.stringify(CONTEXT.SEARCH_INDEX),

    {
      src : true
    }
  )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/data"
      )
    );
};


/*
  Compiles Pug templates (base templates)
*/
var pug_templates_base = function() {
  var _stream = merge();

  gulp_pug_templates.list_config_locales(CONTEXT, package, marked)
    .forEach(function(pug_data) {
      _stream.add(
        gulp_pug_templates.pipe_commons(CONTEXT, pug_data.locale, function() {
          return gulp.src(
            CONTEXT.CONFIG.SOURCES.TEMPLATES.map(function(template) {
              return (CONTEXT.PATH_SOURCES + "/templates/" + template);
            }),

            {
              base : (CONTEXT.PATH_SOURCES + "/templates")
            }
          )
            .pipe(
              gulp_pug(pug_data.config)
            );
        })
          .pipe(
            gulp.dest(
              CONTEXT.PATH_BUILD_PAGES
            )
          )
          .pipe(
            gulp_connect.reload()
          )
      );
    });

  return _stream;
};


/*
  Compiles Pug templates (guides templates)
*/
var pug_templates_guides = function() {
  var _stream = merge();

  // Acquire the guides meta-data
  // Format: { \
  //   segments<array>, id<string>, title<string>, index<int>, links<array>, \
  //   updated<date>, markdown<string>, parent<object>, subtrees<array> \
  // }
  // Output: [tree<array>, linear<array>]
  var _guide_meta_data = (
    gulp_pug_templates.traverse_guides_tree(CONTEXT.PATH_DATA + "/guides")
  );

  var _guide_meta_tree   = _guide_meta_data[0],
      _guide_meta_linear = _guide_meta_data[1];

  // Append all guides to search index
  var _categories = _guide_meta_tree[0];

  if (_categories) {
    gulp_minisearch.insert_categories(
      CONTEXT, "guides", [_categories.title], (_categories.subtrees || [])
    );
  }

  // Compile all guide pages
  gulp_pug_templates.list_config_locales(CONTEXT, package, marked)
    .forEach(function(pug_data) {
      _guide_meta_linear.forEach(function(guide_level) {
        // Generate current guide data (for locale)
        var pug_level_config = lodash.cloneDeep(pug_data.config);

        pug_level_config.data.guides = _guide_meta_tree;
        pug_level_config.data.guide  = guide_level;

        // Forbid indexing? (if any entry segment starts with an underscore)
        var _segment_private_index = guide_level.segments.findIndex(
          function(segment) {
            return ((segment[0] === "_") ? true : false);
          }
        );

        if (_segment_private_index !== -1) {
          pug_level_config.data.INDEXING = false;
        }

        _stream.add(
          gulp_pug_templates.pipe_commons(
            CONTEXT, pug_data.locale, function() {
              return gulp.src(
                (CONTEXT.PATH_SOURCES + "/templates/guides/index.pug"),

                {
                  base : (CONTEXT.PATH_SOURCES + "/templates")
                }
              )
                .pipe(
                  gulp_pug(pug_level_config)
                )
                .pipe(
                  gulp_rename(function(file_path) {
                    file_path.basename = path.join.apply(this, [].concat(
                      guide_level.segments, ["index"]
                    ));
                  })
                );
            }
          )
            .pipe(
              gulp.dest(
                CONTEXT.PATH_BUILD_PAGES
              )
            )
        );
      });
    });

  return _stream;
};


/*
  Compiles Pug templates (references templates)
*/
var pug_templates_references = function() {
  var _stream = merge();

  // Acquire the parsed references content
  // Format: {segments<array>, type<string>, data<object>}
  // Output: linear<array>
  var _reference_meta_data = (
    gulp_pug_templates.traverse_references_linear(
      CONTEXT, (CONTEXT.PATH_DATA + "/references")
    )
  );

  gulp_pug_templates.list_config_locales(CONTEXT, package, marked)
    .forEach(function(pug_data) {
      _reference_meta_data.forEach(function(reference_entry) {
        // Generate current reference data (for locale)
        var pug_entry_config = lodash.cloneDeep(pug_data.config);

        pug_entry_config.data.reference = reference_entry;

        // Forbid indexing? (if any entry segment starts with an underscore)
        var _segment_private_index = reference_entry.segments.findIndex(
          function(segment) {
            return ((segment[0] === "_") ? true : false);
          }
        );

        if (_segment_private_index !== -1) {
          pug_entry_config.data.INDEXING = false;
        }

        // Append all reference anchors to search index
        // Important: only if reference indexing is not forbidden
        if (reference_entry.categories  &&
              pug_entry_config.data.INDEXING !== false) {
          // Acquire reference path, as well as reference path title (with \
          //   its common suffix extracted)
          // Notice: 'REST API Reference (V1)' becomes 'REST API' + 'V1'
          var _reference_path    = ["References"],
              _title_split_regex = /^(.+) Reference \(([^\(\)]+)\)$/;

          var _title_matcher = (
            reference_entry.title.match(_title_split_regex)
          );

          var _reference_title_path = (
            (_title_matcher && _title_matcher[1] && _title_matcher[2]) ?
              [_title_matcher[1], _title_matcher[2]] : [reference_entry.title]
          );

          // Insert reference base
          gulp_minisearch.insert_categories(
            CONTEXT, "references", _reference_path, [reference_entry]
          );

          // Insert reference sub-categories
          gulp_minisearch.insert_categories(
            CONTEXT, "references",
              [].concat(_reference_path, _reference_title_path),
              reference_entry.categories, reference_entry.segments
          );
        }

        _stream.add(
          gulp_pug_templates.pipe_commons(
            CONTEXT, pug_data.locale, function() {
              return gulp.src(
                (CONTEXT.PATH_SOURCES + "/templates/references/index.pug"),

                {
                  base : (CONTEXT.PATH_SOURCES + "/templates")
                }
              )
                .pipe(
                  gulp_pug(pug_entry_config)
                )
                .pipe(
                  gulp_rename(function(file_path) {
                    file_path.basename = path.join.apply(this, [].concat(
                      reference_entry.segments, ["index"]
                    ));
                  })
                );
            }
          )
            .pipe(
              gulp.dest(
                CONTEXT.PATH_BUILD_PAGES
              )
            )
            .pipe(
              gulp_connect.reload()
            )
        );
      });
    });

  return _stream;
};


/*
  Compiles Pug templates (changes templates)
*/
var pug_templates_changes = function() {
  var _stream = merge();

  // Acquire the change years data
  // Format: [year<int>, data<object>] (ordered by most recent year first)
  var _change_years = (
    glob.sync(
      (CONTEXT.PATH_DATA + "/changes/*.json")
    )
      .sort()
      .reverse()
      .map(function(file_path) {
        var _file_path_parts = path.parse(file_path);

        return [
          parseInt(_file_path_parts.name, 10),
          JSON.parse(fs.readFileSync(file_path))
        ];
      })
      .map(function(year_data) {
        // Classify each change in its month (in an orderly manner)
        // Notice: the Map object is used as it retains natural ordering, \
        //   where last months come first.
        var _year_months = new Map();

        year_data[1].forEach(function(entry) {
          // Validate entry data
          if (!entry.group || !entry.type || !entry.date || !entry.text) {
            throw new Error(
              "Invalid entry data in changes for year: " + year_data[0]
            );
          }

          // Acquire entry date
          var _entry_date = (new Date(entry.date));

          if (!_entry_date || isNaN(_entry_date.getTime())) {
            throw new Error(
              "Invalid date in changes for year: " + year_data[0]
            );
          }

          // Acquire entry month key
          var _entry_month_key = ("" + (_entry_date.getMonth() + 1));

          if (_entry_month_key.length === 1) {
            _entry_month_key = ("0" + _entry_month_key);
          }

          // Make sure entries object for month is initialized
          if (_year_months.has(_entry_month_key) === false) {
            _year_months.set(_entry_month_key, []);
          }

          // Append entry to month entries object
          _year_months.get(_entry_month_key).push(entry);
        });

        // Assign new per-month data
        // Important: convert back all ordered map entries to an array, which \
        //   we can iterate on right away from templates.
        year_data[1] = Array.from(
          _year_months.entries()
        );

        return year_data;
      })
  );

  // Map available change years (as bare numbers)
  // Important: before prepending latest year data
  var _available_bare_years = _change_years.map(function(change_year) {
    return change_year[0];
  });

  // Prepend list of years with the 'latest' year (ie. corresponding to the \
  //   'index'), and push only the first 3 months (ie. latest)
  var _first_change_year = (_change_years[0] || []);

  _change_years.unshift([
    (_first_change_year[0] || -1),
    (_first_change_year[1] || []).slice(0, 3),
    "index"
  ]);

  gulp_pug_templates.list_config_locales(CONTEXT, package, marked)
    .forEach(function(pug_data) {
      _change_years.forEach(function(change_year) {
        // Generate current year data (for locale)
        var pug_year_config = lodash.cloneDeep(pug_data.config);

        pug_year_config.data.years   = _available_bare_years;

        pug_year_config.data.changes = {
          year     : change_year[0],

          current  : (
            (change_year[2] === "index") ? "latest" : change_year[0]
          ),

          timeline : change_year[1]
        };

        _stream.add(
          gulp_pug_templates.pipe_commons(
            CONTEXT, pug_data.locale, function() {
              return gulp.src(
                (CONTEXT.PATH_SOURCES + "/templates/changes/index.pug"),

                {
                  base : (CONTEXT.PATH_SOURCES + "/templates")
                }
              )
                .pipe(
                  gulp_pug(pug_year_config)
                )
                .pipe(
                  gulp_rename(function(file_path) {
                    file_path.basename = (
                      change_year[2] ? change_year[2] : (
                        path.join(("" + change_year[0]), "index")
                      )
                    );
                  })
                );
            }
          )
            .pipe(
              gulp.dest(
                CONTEXT.PATH_BUILD_PAGES
              )
            )
            .pipe(
              gulp_connect.reload()
            )
        );
      });
    });

  return _stream;
};


/*
  Compiles all Pug templates (shell task to aggregate sub-tasks)
*/
var pug_templates_all = function() {
  return gulp.parallel(
    pug_templates_base,
    pug_templates_guides,
    pug_templates_references,
    pug_templates_changes
  );
}();


/*
  Compiles SCSS stylesheets
*/
var scss = function() {
  return gulp.src(
    CONTEXT.CONFIG.SOURCES.STYLESHEETS.map(function(stylesheet) {
      return (CONTEXT.PATH_SOURCES + "/stylesheets/" + stylesheet);
    }),

    {
      base : (CONTEXT.PATH_SOURCES + "/stylesheets")
    }
  )
    .pipe(
      gulp_sass_variables({
        "$use-inline-images" : CONTEXT.IS_PRODUCTION
      })
    )
    .pipe(
      gulp_sass({
        outputStyle : "expanded"
      })
    )
    .on("error", gulp_notify.onError({
      title     : "scss",
      message   : "Error compiling",
      emitError : true
    }))
    .on("error", function(error) {
      if (CONTEXT.IS_WATCH === true) {
        // Handle compile errors (used for development ease w/ `gulp watch`)
        console.error(error.toString());
      } else {
        throw error;
      }
    })
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/stylesheets"
      )
    );
};


/*
  Imports inline images in stylesheets
*/
var css_inline_images = function() {
  return gulp.src((
    CONTEXT.PATH_BUILD_ASSETS + "/stylesheets/**/*.css"
  ), {
    base : (CONTEXT.PATH_BUILD_ASSETS + "/images")
  })
    .pipe(
      gulp_inline_image()
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/stylesheets"
      )
    )
    .pipe(
      gulp_connect.reload()
    );
};


/*
  Compiles Babel templates
*/
var babel = function() {
  return gulp.src(
    CONTEXT.CONFIG.SOURCES.JAVASCRIPTS.map(function(javascript) {
      return (CONTEXT.PATH_SOURCES + "/javascripts/" + javascript);
    }),

    {
      base : (CONTEXT.PATH_SOURCES + "/javascripts")
    }
  )
    .pipe(
      gulp_babel()
    )
    .on("error", gulp_notify.onError({
      title     : "babel",
      message   : "Error compiling",
      emitError : true
    }))
    .on("error", function(error) {
      if (CONTEXT.IS_WATCH === true) {
        // Handle compile errors (used for development ease w/ `gulp watch`)
        console.error(error.toString());
      } else {
        throw error;
      }
    })
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/javascripts"
      )
    );
};


/*
  Replaces values from template files (guides templates)
*/
var replace_templates_guides = function() {
  return gulp.src(
    CONTEXT.PATH_BUILD_PAGES + "/guides/**/*.html"
  )
    .pipe(
      gulp_replace(
        /src="(?:\.\/)?([^\.\/"']+\.(?:jpg|jpeg|png|gif))"/g,

        function(_, file_name) {
          // Acquire base path segments
          var _image_base_segments = this.file.relative.split("/");

          _image_base_segments.pop();

          // Build final path segments
          var _image_final_segments = (
            [].concat(
              ["", "static", "images", "guides", "content"],
              _image_base_segments,
              [file_name]
            )
          );

          // Replace with final path to image file within static assets
          return (
            "src=\"" + _image_final_segments.join("/") + "\""
          );
        }
      )
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_PAGES + "/guides"
      )
    )
    .pipe(
      gulp_connect.reload()
    );
};


/*
  Replaces values from javascript files
*/
var replace_javascripts = function() {
  return gulp.src(
    CONTEXT.PATH_BUILD_ASSETS + "/javascripts/**/*.js"
  )
    .pipe(
      gulp_replace(
        "@:revision", CONTEXT.CONFIG.REVISION
      )
    )
    .pipe(
      gulp_replace(
        "\"@:url_status\"",

        JSON.stringify({
          provider : (
            CONTEXT.CONFIG.SITE.urls.vigil ? "vigil" : (
              CONTEXT.CONFIG.SITE.urls.crisp_status ? "crisp" : null
            )
          ),

          target   : (
            CONTEXT.CONFIG.SITE.urls.vigil  ||
              CONTEXT.CONFIG.SITE.urls.crisp_status || null
          )
        })
      )
    )
    .pipe(
      gulp_replace(
        "@:search_index", CONTEXT.CONFIG.SEARCH.INDEX
      )
    )
    .pipe(
      gulp_replace(
        "\"@:search_options_base\"",
        JSON.stringify(CONTEXT.CONFIG.SEARCH.OPTIONS.BASE)
      )
    )
    .pipe(
      gulp_replace(
        "\"@:search_options_query\"",
        JSON.stringify(CONTEXT.CONFIG.SEARCH.OPTIONS.QUERY)
      )
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/javascripts"
      )
    )
    .pipe(
      gulp_connect.reload()
    );
};


/*
  Replaces values from stylesheet files
*/
const replace_stylesheets = function() {
  return gulp.src(
    CONTEXT.PATH_BUILD_ASSETS + "/stylesheets/**/*.css"
  )
    .pipe(
      gulp_replace(
        "@@revision",
        CONTEXT.CONFIG.REVISION
      )
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/stylesheets"
      )
    );
};


/*
  Compiles feeds (changes templates)
*/
var feed_changes = function() {
  var _title_maximum_length = 80;

  // Acquire paths for the last 3 years (sort by last year first)
  var _feed_years_back = 3;

  var _last_year_paths = glob.sync(
    (CONTEXT.PATH_DATA + "/changes/*.json")
  )
    .sort()
    .reverse()
    .splice(0, _feed_years_back);

  // Acquire the change years data
  var _change_years = (
    _last_year_paths.map(function(file_path) {
      return JSON.parse(
        fs.readFileSync(file_path)
      );
    })
  );

  // Concatenate all changes together
  var _changes_flat = [].concat.apply(
    [], _change_years
  );

  // Acquire feed title
  var _feed_title = (
    CONTEXT.CONFIG.SITE.texts.changes.titles.feed || "Platform Changes"
  );

  // Construct feed object
  var _feed = new Feed({
    title       : _feed_title,
    description : ("Feed of " + _feed_title + "."),

    link        : CONTEXT.CONFIG.SITE.urls.base,
    language    : "en",
    generator   : package.name,

    author      : {
      name : package.author.name
    },

    favicon     : (
      CONTEXT.CONFIG.SITE.urls.base + "/favicon.ico"
    ),

    updated     : (new Date())
  });

  _changes_flat.forEach(function(change) {
    // Strip Markdown from text
    var _text_barebone = (
      remove_markdown(change.text || "")
    );

    // Split text into a title
    var _title;

    if (_text_barebone.length > _title_maximum_length) {
      _title = (
        _text_barebone.substr(0, _title_maximum_length) + " (..)"
      );
    } else {
      _title = _text_barebone;
    }

    // Add entry
    _feed.addItem({
      title   : _title,
      content : marked(change.text),
      link    : (CONTEXT.CONFIG.SITE.urls.base + "/changes/"),
      date    : (new Date(change.date))
    });
  });

  // Generate feed data
  return gulp_file(
    "changes.rss", _feed.rss2(), {
      src : true
    }
  )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_PAGES
      )
    );
};


/*
  Generates sitemap
*/
var sitemap = function() {
  // Scan all templates, while ignoring the 'not_found' page and all private \
  //   pages (ie. those starting w/ '_')
  return gulp.src([
    (CONTEXT.PATH_BUILD_PAGES + "/**/*.html"),

    ("!" + CONTEXT.PATH_BUILD_PAGES + "/not_found/index.html"),
    ("!" + CONTEXT.PATH_BUILD_PAGES + "/**/_*/index.html")
  ])
    .pipe(
      gulp_sitemap({
        siteUrl : CONTEXT.CONFIG.SITE.urls.base,

        getLoc  : function(site_url, location) {
          // Nuke file name and extension from URL? (if found)
          // Notice: built files are stored in directories, corresponding to \
          //   their path, ending in a file named eg. 'index.html'.
          var _file_index = location.lastIndexOf("index.html");

          // Rewrite location?
          if (_file_index > 0) {
            location = location.substring(0, _file_index);
          }

          return location;
        }
      })
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_PAGES
      )
    );
};


/*
  Generates robots
*/
var robots = function() {
  return gulp_file(
    "robots.txt",

    (
      "User-Agent: *\n"  +
      "Allow: /\n"       +
      ("Sitemap: " + CONTEXT.CONFIG.SITE.urls.base + "/sitemap.xml\n")
    ),

    {
      src : true
    }
  )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_PAGES
      )
    );
};


/*
  Generates Open Graph images
*/
var ogimage = function() {
  // Generate Open Graph images (if any background is configured)
  return gulp.src(
    CONTEXT.PATH_BUILD_PAGES + "/**/*.html"
  )
    .pipe(function() {
      if (CONTEXT.CONFIG.SITE.images.metas.opengraph) {
        return gulp_ogimage({
          base            : function(file) {
            // Acquire base path segments
            // Notice: pop the last two items
            var _page_base_segments = file.relative.split("/");

            _page_base_segments.splice(
              (_page_base_segments.length - 2), 2
            );

            if (_page_base_segments.length > 0) {
              _page_base_segments.unshift("");
            }

            // Generate base path for generated image, which will be output to \
            //   the final HTML file.
            return (
              CONTEXT.CONFIG.SITE.urls.base + "/static/images/opengraph"  +
                _page_base_segments.join("/")
            );
          },

          directory       : function(file) {
            // Acquire base path segments
            // Notice: pop the last two items
            var _page_base_segments = file.relative.split("/");

            _page_base_segments.splice(
              (_page_base_segments.length - 2), 2
            );

            // Build final path segments
            var _page_final_segments = (
              [].concat(
                ["", "images", "opengraph"],
                _page_base_segments
              )
            );

            // Return full directory path (except from the first directory, \
            //   which becomes the image name); this will get used to output \
            //   the generated image file on the file system.
            return (
              CONTEXT.PATH_BUILD_ASSETS + _page_final_segments.join("/")
            );
          },

          name            : function(file) {
            // Acquire base path segments
            // Notice: pop the last item
            var _page_base_segments = file.relative.split("/");

            _page_base_segments.pop();

            // Return last directory name (if there is none, this means this \
            //   is the 'index' page); this will get used to output the \
            //   generated image file on the file system.
            return (
              _page_base_segments[(_page_base_segments.length - 1)] || "index"
            );
          },

          backgroundImage : function() {
            // Return base background image, which will get used as a baseline \
            //   to generate all Open Graph images (ie. as their background \
            //   image).
            return (
              CONTEXT.PATH_ASSETS + "/"  +
                CONTEXT.CONFIG.SITE.images.metas.opengraph
            );
          },

          title           : function(_, $) {
            return (
              $("head title").first().text() || ""
            );
          },

          description     : function(_, $) {
            return (
              $("head meta[name=\"description\"]").first().attr("content") || ""
            );
          }
        })
      }

      // No Open Graph background image configured, warn and skip
      console.warn(
        "⚠️  No Open Graph background image configured, skipping the "  +
          "auto-generation of 'og:image' metadata.\n   "                +
          "You can configure this with the 'images.metas.opengraph' "   +
          "configuration namespace.\n"
      );

      return gulp_noop();
    }())
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_PAGES
      )
    );
};


/*
  Minifies stylesheet files
*/
var cssmin = function() {
  return gulp.src(
    CONTEXT.PATH_BUILD_ASSETS + "/stylesheets/**/*.css"
  )
    .pipe(
      gulp_clean_css()
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/stylesheets"
      )
    );
};


/*
  Minifies javascript files
*/
var uglify = function() {
  return gulp.src(
    CONTEXT.PATH_BUILD_ASSETS + "/javascripts/**/*.js"
  )
    .pipe(
      gulp_uglify()
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS + "/javascripts"
      )
    );
};


/*
  Insert banner in build files
*/
var build_banner = function() {
  var date   = new Date();

  var today  = (
    (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear()
  );

  var banner = [
    "/**",
    " * <%= pkg.name %> - <%= pkg.description %>",
    " * @version v<%= pkg.version %>",
    " * @author <%= pkg.author.name %> <%= pkg.author.url %>",
    " * @date <%= today %>",
    " */",
    ""
  ].join("\n");

  return gulp.src(
    CONTEXT.PATH_BUILD_ASSETS + "/**/*.{css,js}"
  )
    .pipe(
      gulp_header(banner, {
        pkg   : package,
        today : today
      })
    )
    .pipe(
      gulp.dest(
        CONTEXT.PATH_BUILD_ASSETS
      )
    );
};


/*
  Shows final build size
*/
var build_size = function() {
  var _stream = merge();

  // Acquire sizes
  var _fail  = (CONTEXT.CONFIG.SITE.rules.build_size.fail || false),
      _sizes = CONTEXT.CONFIG.SITE.rules.build_size.sizes;

  // Map all sources and options
  var _sources = [
    {
      glob    : (
        CONTEXT.PATH_BUILD_PAGES + "/references/**/*.html"
      ),

      options : {
        production : {
          gzip  : true,
          total : true,
          fail  : _fail,

          "*"   : {
            maxGzippedSize : _sizes.references.pages.gzip_maximum
          }
        }
      }
    },

    {
      glob    : (
        CONTEXT.PATH_BUILD_PAGES + "/guides/**/*.html"
      ),

      options : {
        production : {
          gzip  : true,
          total : true,
          fail  : _fail,

          "*"   : {
            maxGzippedSize : _sizes.guides.pages.gzip_maximum
          }
        }
      }
    },

    {
      glob    : (
        CONTEXT.PATH_BUILD_ASSETS + "/images/guides/content/**/"  +
          "*.{jpg,jpeg,png,gif}"
      ),

      options : {
        production : {
          total : true,
          fail  : _fail,

          "*"   : {
            maxSize : _sizes.guides.images.maximum
          }
        }
      }
    },

    {
      glob    : (
        CONTEXT.PATH_BUILD_ASSETS + "/data/**/*.json"
      ),

      options : {
        production : {
          gzip  : true,
          total : true,
          fail  : _fail,

          "*"   : {
            maxSize        : _sizes.data.objects.maximum,
            maxGzippedSize : _sizes.data.objects.gzip_maximum
          }
        }
      }
    }
  ];

  // Compute size report for each source
  _sources.forEach(function(source) {
    _stream.add(
      gulp.src(source.glob)
        .pipe(
          gulp_sizereport(
            (CONTEXT.IS_PRODUCTION === true) ? source.options.production : (
              source.options.production.default || {
                total : true
              }
            )
          )
        )
    );
  });

  return _stream;
};


/*
  Builds all resources
*/
var build_resources = function() {
  // Generate main series
  var _series = [
    gulp.parallel(
      robots,
      feed_changes,

      copy_user_assets,
      copy_images_guides,

      gulp.series(
        bower,

        gulp.parallel(
          concat_libraries_stylesheets,

          gulp.series(
            gulp.parallel(
              concat_libraries_javascripts,
              babel
            ),

            replace_javascripts
          )
        )
      ),

      gulp.series(
        gulp.parallel(
          copy_images_base,
          copy_fonts
        ),

        scss,
        replace_stylesheets,
        css_inline_images
      ),

      gulp.series(
        pug_templates_all,

        gulp.parallel(
          replace_templates_guides,
          minisearch_consolidate,
          sitemap
        ),

        ogimage
      )
    )
  ];

  // Append production final tasks?
  if (CONTEXT.IS_PRODUCTION === true) {
    _series.push(
      gulp.parallel(
        cssmin,
        uglify
      ),

      build_banner,
      build_size
    );
  }

  return gulp.series(_series);
}();


/*
  Cleans all build files
*/
var build_clean = function() {
  return del([
    (CONTEXT.PATH_BUILD_ASSETS + "/*"),
    (CONTEXT.PATH_BUILD_PAGES + "/*")
  ]);
};


/*
  Starts connect server
*/
var connect_server = function(next) {
  gulp_connect.server(
    {
      name       : "Server",
      root       : CONTEXT.PATH_DIST,
      host       : CONTEXT.SERVE_HOST,
      port       : CONTEXT.SERVE_PORT,
      silent     : true,

      livereload : {
        hostname : CONTEXT.SERVE_HOST,
        port     : (CONTEXT.SERVE_PORT + 1),
      }
    },

    function() {
      console.log(
        "\n🔥 Preview server started on: http://" + CONTEXT.SERVE_HOST + ":"  +
          CONTEXT.SERVE_PORT + "\n"
      );
    }
  );

  next();
};


/*
  Watches for changes on resources
*/
var watch_resources = function(next) {
  CONTEXT.IS_WATCH = true;

  // Internal files (Chappe files)
  // Notice: only if not 'production', ie. in 'development' mode, as this is \
  //   used by Chappe developers only.
  if (CONTEXT.IS_PRODUCTION !== true) {
    gulp.watch("bower.json", bower);
    gulp.watch("res/config/*", get_configuration);
    gulp.watch("src/images/**/*", copy_images_base);
    gulp.watch("src/fonts/**/*", copy_fonts);

    gulp.watch(
      "src/locales/**/*",

      gulp.series(
        pug_templates_all,
        replace_templates_guides
      )
    );

    gulp.watch(
      "src/templates/**/*",

      gulp.series(
        pug_templates_all,

        gulp.parallel(
          replace_templates_guides,
          sitemap
        )
      )
    );

    gulp.watch(
      "src/stylesheets/**/*",

      gulp.series(
        scss,
        replace_stylesheets,
        css_inline_images
      )
    );

    gulp.watch(
      "src/javascripts/**/*",

      gulp.series(
        babel,
        replace_javascripts
      )
    );
  }

  // External files (user files)
  CONTEXT.PATH_CONFIG.forEach(function(config_path) {
    gulp.watch(config_path, get_configuration);
  });

  gulp.watch(
    (CONTEXT.PATH_DATA + "/guides/**/*.{jpg,jpeg,png,gif}"),
    copy_images_guides
  );

  gulp.watch(
    (CONTEXT.PATH_DATA + "/guides/**/*.md"),

    gulp.series(
      pug_templates_guides,
      replace_templates_guides
    )
  );

  gulp.watch(
    (CONTEXT.PATH_DATA + "/references/**/*.md"),
    pug_templates_references
  );

  gulp.watch(
    (CONTEXT.PATH_DATA + "/changes/**/*.json"),

    gulp.parallel(
      pug_templates_changes,
      feed_changes
    )
  );

  next();
};


/*
  Lints Pug templates
*/
var lint_pug_templates = function() {
  return gulp.src(
    CONTEXT.PATH_SOURCES + "/templates/**/*.pug"
  )
    .pipe(
      gulp_pug_lint({
        defaultFile : path.join(
          CONTEXT.PATH_CHAPPE, ".pug-lintrc"
        )
      })
    );
};


/*
  Lints SCSS stylesheets
*/
var lint_scss_stylesheets = function() {
  return gulp.src(
    CONTEXT.PATH_SOURCES + "/stylesheets/**/*.scss"
  )
    .pipe(
      gulp_stylelint({
        failAfterError : true,

        configFile     : path.join(
          CONTEXT.PATH_CHAPPE, ".stylelintrc.yml"
        ),

        reporters      : [
          {
            formatter : "verbose",
            console   : true
          }
        ]
      })
    );
};


/*
  Lints JS scripts (with JSHint)
*/
var lint_js_scripts_jshint = function() {
  return gulp.src([
    CONTEXT.PATH_SOURCES + "/javascripts/**/*.js",
    CONTEXT.PATH_CHAPPE + "/bin/*.js"
  ])
    .pipe(
      gulp_jshint({
        defaultFile : path.join(
          CONTEXT.PATH_CHAPPE, ".jshintrc"
        )
      })
    )
    .pipe(
      gulp_jshint.reporter("fail")
    );
};


/*
  Lints JS scripts (with JSCS)
*/
var lint_js_scripts_jscs = function() {
  return gulp.src([
    CONTEXT.PATH_SOURCES + "/javascripts/**/*.js",
    CONTEXT.PATH_CHAPPE + "/bin/*.js"
  ])
    .pipe(
      gulp_jscs({
        configPath : path.join(
          CONTEXT.PATH_CHAPPE, ".jscsrc"
        )
      })
    )
    .pipe(
      gulp_jscs.reporter("fail")
    );
};


/*
  Lints project built code
*/
var lint = function() {
  return gulp.series(
    get_configuration,

    gulp.parallel(
      lint_pug_templates,
      lint_scss_stylesheets,
      lint_js_scripts_jshint,
      lint_js_scripts_jscs
    )
  );
}();


/*
  Serves project
*/
var serve = function() {
  return gulp.series(
    get_configuration,
    minisearch_prepare,
    build_clean,
    build_resources,
    watch_resources,
    connect_server
  );
}();


/*
  Cleans all build files
*/
var clean = function() {
  return gulp.series(
    get_configuration,
    build_clean
  )
}();


/*
  Builds project
*/
var build = function() {
  return gulp.series(
    get_configuration,
    minisearch_prepare,
    build_resources
  );
}();


/*
  Watches for project changes
*/
var watch = function() {
  return gulp.series(
    get_configuration,
    minisearch_prepare,
    watch_resources
  )
}();


/*
  Export all public tasks
*/
exports.lint    = lint;
exports.serve   = serve;
exports.clean   = clean;
exports.watch   = watch;
exports.build   = build;
exports.default = build;
